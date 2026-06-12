/** Auto-dispatch tuning (Tech-Stack §7, §8.2). */
export const DISPATCH_QUEUE = 'dispatch';

export const BASE_RADIUS_KM = 5;
export const RADIUS_STEP_KM = 5;
export const MAX_RADIUS_KM = 25;

/** Seconds an engineer has to accept before the offer passes on. */
export const OFFER_COUNTDOWN_SEC = 30;

/** An engineer is "free" while holding fewer than this many active jobs. */
export const ENGINEER_CAPACITY = 3;

/** Ranking weights (lower score = better): distance + load − rating − tier (§7). */
export const W_DISTANCE_KM = 1;
export const W_LOAD = 2;
export const W_RATING = 1.5;
/** Higher tier = priority dispatch (§8.4): subtract priorityRank × this weight. */
export const W_PRIORITY = 1;

/** Tier → priority rank (higher = more priority). Mirrors TierDefinition. */
export const TIER_PRIORITY: Record<string, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
};

/** Rough ETA from distance assuming ~30 km/h city travel. */
export function etaMinutes(distanceM: number): number {
  return Math.max(1, Math.round((distanceM / 1000 / 30) * 60));
}

/**
 * Candidate ranking score — LOWER is better (§7). Nearer engineers, lighter
 * current load and higher ratings all reduce the score.
 */
export function scoreCandidate(
  distanceM: number,
  currentLoad: number,
  rating: number,
  priorityRank = 0,
): number {
  return (
    (distanceM / 1000) * W_DISTANCE_KM +
    currentLoad * W_LOAD -
    rating * W_RATING -
    priorityRank * W_PRIORITY
  );
}
