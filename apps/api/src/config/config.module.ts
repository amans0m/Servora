import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from './env.schema';
import { IntegrationsConfigService } from './integrations-config.service';

/**
 * Global config module: validates env at boot (env.schema) and exposes the
 * IntegrationsConfigService used everywhere to resolve third-party keys
 * (DB-first, env-fallback — Tech-Stack §10).
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
  ],
  providers: [IntegrationsConfigService],
  exports: [IntegrationsConfigService, ConfigModule],
})
export class AppConfigModule {}
