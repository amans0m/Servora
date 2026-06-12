import { Logger } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { KmsProvider } from './kms.types';

interface KeyStore {
  version: number;
  primary: string; // current keyId for new encryption
  keys: Record<string, string>; // keyId -> wrapped data key
  blindIndex: string; // wrapped HMAC key for deterministic blind indexes
}

/**
 * Versioned key management on top of a KmsProvider (SECURITY.md A1).
 *
 * - Stores a wrapped data key per version + a stable blind-index key.
 * - New writes use the `primary` keyId; old keyIds are retained so existing
 *   ciphertext stays decryptable → enables key rotation (each record carries
 *   its keyId; see CryptoService).
 * - The store is a git-ignored keyfile. For local it holds base64 raw keys
 *   (dev shim); for AWS it holds KMS-wrapped ciphertext.
 *
 * After init(), raw keys are cached so encrypt/decrypt are synchronous.
 */
export class KmsService {
  private readonly logger = new Logger(KmsService.name);
  private store!: KeyStore;
  private readonly cache = new Map<string, Buffer>();
  private blindKey!: Buffer;

  constructor(
    private readonly provider: KmsProvider,
    private readonly keyfilePath: string,
  ) {}

  async init(): Promise<void> {
    if (existsSync(this.keyfilePath)) {
      this.store = JSON.parse(readFileSync(this.keyfilePath, 'utf8'));
    } else {
      this.logger.warn(
        `No keyfile at ${this.keyfilePath} — generating one (provider=${this.provider.name}). ` +
          'Local dev only; production uses KMS_PROVIDER=aws.',
      );
      const first = await this.provider.generateDataKey();
      const blind = await this.provider.generateDataKey();
      this.store = {
        version: 1,
        primary: 'v1',
        keys: { v1: first.wrapped },
        blindIndex: blind.wrapped,
      };
      this.persist();
    }

    for (const [keyId, wrapped] of Object.entries(this.store.keys)) {
      this.cache.set(keyId, await this.provider.unwrap(wrapped));
    }
    this.blindKey = await this.provider.unwrap(this.store.blindIndex);
  }

  currentKeyId(): string {
    return this.store.primary;
  }

  rawKey(keyId: string): Buffer {
    const key = this.cache.get(keyId);
    if (!key) throw new Error(`Unknown encryption keyId: ${keyId}`);
    return key;
  }

  blindIndexKey(): Buffer {
    return this.blindKey;
  }

  /** Rotate: mint a new primary key; old keys are kept for decryption. */
  async rotate(): Promise<string> {
    const next = `v${this.store.version + 1}`;
    const { wrapped } = await this.provider.generateDataKey();
    this.store.keys[next] = wrapped;
    this.store.primary = next;
    this.store.version += 1;
    this.cache.set(next, await this.provider.unwrap(wrapped));
    this.persist();
    this.logger.log(`Rotated encryption key → primary ${next}`);
    return next;
  }

  private persist(): void {
    mkdirSync(dirname(this.keyfilePath), { recursive: true });
    writeFileSync(this.keyfilePath, JSON.stringify(this.store, null, 2), {
      mode: 0o600,
    });
  }
}
