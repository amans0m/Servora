import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_KEY = 'idempotent';

export interface IdempotentOptions {
  /** If true, the request is rejected when no Idempotency-Key header is sent. */
  required?: boolean;
}

/**
 * Mark a mutating endpoint as idempotent (§A3). Retries with the same
 * `Idempotency-Key` header return the first response instead of re-processing
 * — so payment retries can't double-charge.
 */
export const Idempotent = (options: IdempotentOptions = {}) =>
  SetMetadata(IDEMPOTENT_KEY, options);
