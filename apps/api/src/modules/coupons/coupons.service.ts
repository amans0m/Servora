import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Coupon, DiscountType, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import type {
  CreateCouponDto,
  UpdateCouponDto,
} from './dto/coupons.dto';

export interface CouponPricing {
  coupon: Coupon;
  discount: number; // rounded to 2 decimals, never exceeds subtotal
}

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Admin ───────────────────────────────────────────────────────────────
  list() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreateCouponDto) {
    return this.prisma.coupon.create({
      data: {
        code: dto.code.toUpperCase(),
        discountType: dto.discountType,
        value: dto.value,
        scope: dto.scope ?? 'all',
        minOrder: dto.minOrder ?? 0,
        maxUses: dto.maxUses ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

  async update(id: string, dto: UpdateCouponDto) {
    await this.requireCoupon(id);
    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...(dto.code ? { code: dto.code.toUpperCase() } : {}),
        discountType: dto.discountType,
        value: dto.value,
        scope: dto.scope,
        minOrder: dto.minOrder,
        maxUses: dto.maxUses,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async toggleActive(id: string) {
    const coupon = await this.requireCoupon(id);
    return this.prisma.coupon.update({
      where: { id },
      data: { active: !coupon.active },
    });
  }

  // ── Validation + pricing (used by bookings & customer preview) ────────────
  /**
   * Validate a coupon against an order and compute the discount. Throws a
   * clear error if the code can't be applied (Component Brief: Apply coupon).
   */
  async validateAndPrice(
    code: string,
    subtotal: number,
    category?: string,
  ): Promise<CouponPricing> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!coupon || !coupon.active) {
      throw new BadRequestException('Coupon not found or inactive');
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestException('Coupon has expired');
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Coupon usage limit reached');
    }
    if (Number(coupon.minOrder) > subtotal) {
      throw new BadRequestException(
        `Order must be at least ₹${Number(coupon.minOrder)} to use this coupon`,
      );
    }
    if (
      coupon.scope &&
      coupon.scope !== 'all' &&
      category &&
      coupon.scope !== category
    ) {
      throw new BadRequestException('Coupon does not apply to this service');
    }

    const raw =
      coupon.discountType === DiscountType.percent
        ? (subtotal * Number(coupon.value)) / 100
        : Number(coupon.value);
    const discount = Math.min(round2(raw), subtotal);
    return { coupon, discount };
  }

  /** Record a redemption + increment usage. Call inside the booking txn. */
  redeemTx(
    tx: Prisma.TransactionClient,
    couponId: string,
    bookingId: string,
    customerId: string,
    amount: number,
  ) {
    return Promise.all([
      tx.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      }),
      tx.couponRedemption.create({
        data: { couponId, bookingId, customerId, amount },
      }),
    ]);
  }

  private async requireCoupon(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
