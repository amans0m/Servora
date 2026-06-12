import { createHash, randomBytes } from 'node:crypto';

import type { KmsProvider } from '../kms.types';

/**
 * LOCAL DEV SHIM ONLY (SECURITY.md A1 trade-off, flagged).
 *
 * "Wrapping" is identity: the data key is stored base64 in a git-ignored
 * keyfile. This keeps the app runnable locally with no cloud KMS, WITHOUT
 * disabling field encryption. Production MUST use KMS_PROVIDER=aws.
 *
 * If INTEGRATIONS_ENCRYPTION_KEY is set, the first data key is derived from it
 * (so a team can share a deterministic dev key); otherwise a random key is
 * generated and written to the keyfile.
 */
export class LocalKmsProvider implements KmsProvider {
  readonly name = 'local';
  private seedSecret?: string;

  constructor(seedSecret?: string) {
    this.seedSecret = seedSecret;
  }

  async generateDataKey(): Promise<{ raw: Buffer; wrapped: string }> {
    const raw = this.seedSecret
      ? createHash('sha256').update(this.seedSecret).digest()
      : randomBytes(32);
    // Consume the seed once (subsequent rotations get random keys).
    this.seedSecret = undefined;
    return { raw, wrapped: raw.toString('base64') };
  }

  async unwrap(wrapped: string): Promise<Buffer> {
    return Buffer.from(wrapped, 'base64');
  }
}
