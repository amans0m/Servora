export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/** Redis sorted-set holding online engineers' live locations (§7). */
export const ENGINEER_GEO_KEY = 'servora:engineers:geo';

/** Per-booking dispatch state (current search radius) — short TTL. */
export const dispatchStateKey = (bookingId: string) =>
  `servora:dispatch:${bookingId}`;
