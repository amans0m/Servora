import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

import { BookingsService } from '../src/modules/bookings/bookings.service';

/** A booking owned by customer-A, no engineer assigned. */
function serviceFor(booking: Record<string, unknown>) {
  // Deep-clone so getById's field-stripping doesn't leak across test cases.
  const fresh = structuredClone(booking);
  const prisma = { booking: { findUnique: async () => fresh } };
  const crypto = { decryptMaybe: (v: unknown) => v };
  // coupons, dispatch, payments, storage are unused on this path.
  return new BookingsService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    crypto as never,
    {} as never,
  );
}

describe('Per-resource ownership — user A cannot read user B (§A4)', () => {
  const booking = {
    id: 'bk1',
    customer: { userId: 'A', companyName: 'Acme' },
    engineer: null,
    address: null,
    events: [],
  };

  it("owner (A) can read their own booking", async () => {
    const svc = serviceFor({ ...booking });
    await expect(svc.getById('A', Role.customer, 'bk1')).resolves.toBeTruthy();
  });

  it('another customer (B) cannot read it', async () => {
    const svc = serviceFor({ ...booking });
    await expect(svc.getById('B', Role.customer, 'bk1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('an engineer not assigned cannot read it', async () => {
    const svc = serviceFor({ ...booking });
    await expect(svc.getById('someEngineer', Role.engineer, 'bk1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('admin can read it', async () => {
    const svc = serviceFor({ ...booking });
    await expect(svc.getById('admin', Role.admin, 'bk1')).resolves.toBeTruthy();
  });

  it("does not leak the counterparty's internal userId", async () => {
    const svc = serviceFor({ ...booking });
    const result: any = await svc.getById('A', Role.customer, 'bk1');
    expect(result.customer.userId).toBeUndefined();
  });
});
