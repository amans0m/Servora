/**
 * KMS abstraction (SECURITY.md A1). The master key never lives in code or a
 * committed env file. A provider knows how to WRAP a freshly-generated 32-byte
 * data key into an opaque stored form, and UNWRAP it back to raw bytes.
 *
 * - LocalKmsProvider: dev shim — "wrapping" is identity (raw key, base64),
 *   persisted to a git-ignored keyfile. Flagged as non-production.
 * - AwsKmsProvider: wraps/unwraps via AWS KMS (Encrypt/Decrypt of the DEK);
 *   raw key material never leaves the process unencrypted at rest.
 *
 * KmsService layers versioning + rotation on top (a keyId per stored record).
 */
export interface KmsProvider {
  readonly name: string;
  /** Create a new 32-byte data key; return raw bytes + its wrapped form. */
  generateDataKey(): Promise<{ raw: Buffer; wrapped: string }>;
  /** Recover raw bytes from a previously-wrapped data key. */
  unwrap(wrapped: string): Promise<Buffer>;
}
