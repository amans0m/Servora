import { BadRequestException } from '@nestjs/common';
import { DiscountType } from '@prisma/client';

import { CouponsService } from '../src/modules/coupons/coupons.service';

/** Build a CouponsService whose Prisma returns the given coupon row. */
function serviceWithCoupon(coupon: Record<string, unknown> | null) {
  const prisma = {
    coupon: { findUnique: async () => coupon },
  };
  return new CouponsService(prisma as never);
}

const base = {
  id: 'c1',
  code: 'SAVE20',
  active: true,
  expiresAt: null,
  maxUses: null,
  usedCount: 0,
  minOrder: 0,
  scope: 'all',
};

describe('CouponsService.validateAndPrice', () => {
  it('applies a percentage discount, rounded to 2 dp', async () => {
    const svc = serviceWithCoupon({ ...base, discountType: DiscountType.percent, value: 20 });
    const { discount } = await svc.validateAndPrice('SAVE20', 4999);
    expect(discount).toBe(999.8);
  });

  it('caps a flat discount at the subtotal', async () => {
    const svc = serviceWithCoupon({ ...base, discountType: DiscountType.flat, value: 8000 });
    const { discount } = await svc.validateAndPrice('SAVE20', 4999);
    expect(discount).toBe(4999);
  });

  it('rejects an inactive coupon', async () => {
    const svc = serviceWithCoupon({ ...base, active: false, discountType: DiscountType.percent, value: 20 });
    await expect(svc.validateAndPrice('SAVE20', 4999)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enforces the minimum order value', async () => {
    const svc = serviceWithCoupon({ ...base, minOrder: 6000, discountType: DiscountType.percent, value: 20 });
    await expect(svc.validateAndPrice('SAVE20', 4999)).rejects.toThrow(/at least/);
  });

  it('rejects when the category is out of scope', async () => {
    const svc = serviceWithCoupon({ ...base, scope: 'cloud', discountType: DiscountType.percent, value: 20 });
    await expect(svc.validateAndPrice('SAVE20', 4999, 'network')).rejects.toThrow(/does not apply/);
  });

  it('rejects when usage limit reached', async () => {
    const svc = serviceWithCoupon({ ...base, maxUses: 5, usedCount: 5, discountType: DiscountType.percent, value: 20 });
    await expect(svc.validateAndPrice('SAVE20', 4999)).rejects.toThrow(/limit/);
  });
});
