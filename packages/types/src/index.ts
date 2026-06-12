/**
 * @servora/types — shared API contract (DTOs / Zod schemas).
 *
 * Populated in later phases as endpoints stabilise. Both the API and the
 * web/mobile clients import their request/response shapes from here so the
 * contract stays in one place (see Tech-Stack §9.1, packages/types).
 */

export const SERVORA_ROLES = ['customer', 'engineer', 'admin'] as const;
export type ServoraRole = (typeof SERVORA_ROLES)[number];
