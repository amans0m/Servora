import { EngineerTier } from '@prisma/client';

export const PAYOUTS_QUEUE = 'payouts';

/** Fallback tier commission if TierDefinition is missing (§6: Bronze 25% → Platinum 15%). */
export const DEFAULT_COMMISSION: Record<EngineerTier, number> = {
  bronze: 0.25,
  silver: 0.2,
  gold: 0.18,
  platinum: 0.15,
};
