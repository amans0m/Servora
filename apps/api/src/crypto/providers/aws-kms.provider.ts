import type { KmsProvider } from '../kms.types';

/**
 * AWS KMS provider (production). Data keys are wrapped/unwrapped by a KMS CMK
 * via envelope encryption — raw key material is never persisted in plaintext.
 *
 * The SDK is imported dynamically so local dev (KMS_PROVIDER=local) never loads
 * it. Not exercised in the local test suite; verify against a real CMK in a
 * staging environment before relying on it.
 */
export class AwsKmsProvider implements KmsProvider {
  readonly name = 'aws';

  constructor(
    private readonly keyId: string,
    private readonly region: string,
  ) {}

  private async client() {
    const { KMSClient } = await import('@aws-sdk/client-kms');
    return new KMSClient({ region: this.region });
  }

  async generateDataKey(): Promise<{ raw: Buffer; wrapped: string }> {
    const { GenerateDataKeyCommand } = await import('@aws-sdk/client-kms');
    const client = await this.client();
    const res = await client.send(
      new GenerateDataKeyCommand({ KeyId: this.keyId, KeySpec: 'AES_256' }),
    );
    if (!res.Plaintext || !res.CiphertextBlob) {
      throw new Error('KMS GenerateDataKey returned no key material');
    }
    return {
      raw: Buffer.from(res.Plaintext),
      wrapped: Buffer.from(res.CiphertextBlob).toString('base64'),
    };
  }

  async unwrap(wrapped: string): Promise<Buffer> {
    const { DecryptCommand } = await import('@aws-sdk/client-kms');
    const client = await this.client();
    const res = await client.send(
      new DecryptCommand({ CiphertextBlob: Buffer.from(wrapped, 'base64') }),
    );
    if (!res.Plaintext) throw new Error('KMS Decrypt returned no plaintext');
    return Buffer.from(res.Plaintext);
  }
}
