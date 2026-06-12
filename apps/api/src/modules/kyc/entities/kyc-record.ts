import type { KycRecord } from '@prisma/client';

/**
 * Mask a sensitive identifier, keeping only the last `visible` chars (§12 —
 * store masked references, never raw documents). E.g. Aadhaar -> XXXXXXXX9012.
 */
export function maskRef(value: string, visible = 4): string {
  if (value.length <= visible) return 'X'.repeat(value.length);
  return 'X'.repeat(value.length - visible) + value.slice(-visible);
}

/** Public-safe view of a KYC record (status + masked ref + provider + time). */
export function presentKycRecord(record: KycRecord) {
  return {
    id: record.id,
    type: record.type,
    status: record.status,
    provider: record.provider,
    maskedRef: record.maskedRef,
    verifiedAt: record.verifiedAt,
    updatedAt: record.updatedAt,
  };
}
