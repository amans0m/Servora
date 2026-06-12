import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';

import { KmsService } from './kms.service';

const SCHEME = 'f1'; // field-encryption envelope v1
const IV_LEN = 12;
const TAG_LEN = 16;

/**
 * Application-level field encryption (SECURITY.md A1).
 *
 * Envelope format: `f1.<keyId>.<base64(iv | authTag | ciphertext)>`. The keyId
 * is stored with every value so rotation can re-encrypt old data later.
 *
 * `blindIndex` produces a deterministic HMAC of a value for equality lookups
 * on encrypted columns (email/phone/GSTIN) — the only fields that need search.
 * The blind-index key is stable across rotations so lookups keep working.
 */
export class CryptoService {
  constructor(private readonly kms: KmsService) {}

  encrypt(plaintext: string): string {
    const keyId = this.kms.currentKeyId();
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv('aes-256-gcm', this.kms.rawKey(keyId), iv);
    const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const packed = Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
    return `${SCHEME}.${keyId}.${packed}`;
  }

  decrypt(payload: string): string {
    const parts = payload.split('.');
    if (parts.length !== 3 || parts[0] !== SCHEME) {
      throw new Error('Not a valid encrypted field');
    }
    const [, keyId, packed] = parts;
    const raw = Buffer.from(packed, 'base64');
    const iv = raw.subarray(0, IV_LEN);
    const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ct = raw.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv('aes-256-gcm', this.kms.rawKey(keyId), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  }

  /** Decrypt if it's an envelope; otherwise return as-is (migration-safe). */
  decryptMaybe(value: string | null | undefined): string | null {
    if (value == null) return null;
    return this.isEncrypted(value) ? this.decrypt(value) : value;
  }

  isEncrypted(value: string): boolean {
    return value.startsWith(`${SCHEME}.`);
  }

  /** True if a stored value was encrypted with a non-primary (old) key. */
  needsRotation(payload: string): boolean {
    return (
      this.isEncrypted(payload) &&
      payload.split('.')[1] !== this.kms.currentKeyId()
    );
  }

  /** Deterministic, searchable index for an encrypted equality field. */
  blindIndex(value: string): string {
    const normalized = value.trim().toLowerCase();
    return createHmac('sha256', this.kms.blindIndexKey())
      .update(normalized)
      .digest('hex');
  }
}
