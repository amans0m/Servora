import { CryptoService } from './crypto.service';
import { KmsService } from './kms.service';
import { AwsKmsProvider } from './providers/aws-kms.provider';
import { LocalKmsProvider } from './providers/local-kms.provider';
import type { KmsProvider } from './kms.types';

export interface CryptoOptions {
  provider: 'local' | 'aws';
  keyfile: string;
  seedSecret?: string; // local dev: derive first key deterministically
  awsKeyId?: string;
  awsRegion?: string;
}

/**
 * Build the KMS + CryptoService pair. Shared by the Nest CryptoModule and the
 * standalone seed script so both encrypt with the same keys.
 */
export async function buildCrypto(
  opts: CryptoOptions,
): Promise<{ kms: KmsService; crypto: CryptoService }> {
  let provider: KmsProvider;
  if (opts.provider === 'aws') {
    if (!opts.awsKeyId || !opts.awsRegion) {
      throw new Error('KMS_PROVIDER=aws requires KMS_AWS_KEY_ID and AWS_REGION');
    }
    provider = new AwsKmsProvider(opts.awsKeyId, opts.awsRegion);
  } else {
    provider = new LocalKmsProvider(opts.seedSecret);
  }
  const kms = new KmsService(provider, opts.keyfile);
  await kms.init();
  return { kms, crypto: new CryptoService(kms) };
}

/** Resolve crypto options from environment (defaults are local-dev safe). */
export function cryptoOptionsFromEnv(
  env: Record<string, string | undefined>,
): CryptoOptions {
  return {
    provider: env.KMS_PROVIDER === 'aws' ? 'aws' : 'local',
    keyfile: env.KMS_KEYFILE ?? '.keys/local-kms.json',
    seedSecret: env.INTEGRATIONS_ENCRYPTION_KEY,
    awsKeyId: env.KMS_AWS_KEY_ID,
    awsRegion: env.AWS_REGION ?? env.SES_REGION,
  };
}
