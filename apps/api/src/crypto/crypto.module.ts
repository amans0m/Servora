import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.schema';
import { CryptoService } from './crypto.service';
import { KmsService } from './kms.service';
import { buildCrypto, cryptoOptionsFromEnv } from './crypto.factory';

/**
 * Global crypto: KMS-backed key management + field encryption (SECURITY.md A1).
 * Built once at boot; CryptoService is injected anywhere PII or integration
 * keys are read/written.
 */
@Global()
@Module({
  providers: [
    {
      provide: KmsService,
      inject: [ConfigService],
      useFactory: async (config: ConfigService<Env, true>) => {
        const { kms } = await buildCrypto(
          cryptoOptionsFromEnv({
            KMS_PROVIDER: config.get('KMS_PROVIDER', { infer: true }),
            KMS_KEYFILE: config.get('KMS_KEYFILE', { infer: true }),
            KMS_AWS_KEY_ID: config.get('KMS_AWS_KEY_ID', { infer: true }),
            AWS_REGION: config.get('AWS_REGION', { infer: true }),
            INTEGRATIONS_ENCRYPTION_KEY: config.get('INTEGRATIONS_ENCRYPTION_KEY', {
              infer: true,
            }),
          }),
        );
        return kms;
      },
    },
    {
      provide: CryptoService,
      inject: [KmsService],
      useFactory: (kms: KmsService) => new CryptoService(kms),
    },
  ],
  exports: [CryptoService, KmsService],
})
export class CryptoModule {}
