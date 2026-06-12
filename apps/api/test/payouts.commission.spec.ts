import { PayoutsService } from '../src/modules/payouts/payouts.service';
import { DEFAULT_COMMISSION } from '../src/modules/payouts/payouts.constants';

function makeService(tierRow: { commissionRate: number } | null) {
  const prisma = {
    tierDefinition: { findUnique: async () => tierRow },
  };
  // (prisma, notifications, audit, queue, razorpayx)
  return new PayoutsService(prisma as any, {} as any, {} as any, {} as any, {} as any);
}

describe('PayoutsService — tier commission (§6: Bronze 25% → Platinum 15%)', () => {
  it('uses the DB-defined commission rate when present', async () => {
    const svc = makeService({ commissionRate: 0.18 });
    expect(await svc.commissionRate('gold')).toBe(0.18);
  });

  it('falls back to defaults when the tier definition is missing', async () => {
    const svc = makeService(null);
    expect(await svc.commissionRate('bronze')).toBe(DEFAULT_COMMISSION.bronze);
    expect(await svc.commissionRate('platinum')).toBe(DEFAULT_COMMISSION.platinum);
  });

  it('commission decreases as tier increases', () => {
    expect(DEFAULT_COMMISSION.bronze).toBeGreaterThan(DEFAULT_COMMISSION.silver);
    expect(DEFAULT_COMMISSION.silver).toBeGreaterThan(DEFAULT_COMMISSION.gold);
    expect(DEFAULT_COMMISSION.gold).toBeGreaterThan(DEFAULT_COMMISSION.platinum);
  });
});
