import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CryptoService } from '../crypto/crypto.service';
import { PrismaService } from '../database/prisma.service';
import type { Env } from './env.schema';

/**
 * Single source of truth for third-party provider keys (Tech-Stack §10).
 *
 * RULE: read the key from the DB first (Admin → Integrations, stored
 * encrypted), and fall back to the matching environment variable when it is
 * not set there. Every provider client MUST resolve keys through this service
 * instead of touching process.env directly.
 *
 * Phase 1 ships the resolution contract + env-fallback path. The admin
 * Integrations endpoint that writes the encrypted DB rows lands in Phase 7;
 * until then `getConfig()` simply returns the env-backed values.
 */
export type IntegrationProviderKey =
  | 'surepass'
  | 'razorpay'
  | 'razorpayx'
  | 'google_maps'
  | 'fcm'
  | 'msg91'
  | 's3'
  | 'email'
  | 'sentry';

/** Maps each provider's logical fields to their env-var fallback names (§10). */
export const ENV_FALLBACK: Record<IntegrationProviderKey, Record<string, keyof Env>> = {
  surepass: { token: 'SUREPASS_TOKEN', baseUrl: 'SUREPASS_BASE_URL' },
  razorpay: { keyId: 'RAZORPAY_KEY_ID', keySecret: 'RAZORPAY_KEY_SECRET' },
  razorpayx: { key: 'RAZORPAYX_KEY', secret: 'RAZORPAYX_SECRET' },
  google_maps: { apiKey: 'GOOGLE_MAPS_API_KEY' },
  fcm: { serviceAccount: 'FCM_SERVICE_ACCOUNT' },
  msg91: { authKey: 'MSG91_AUTH_KEY' },
  s3: {
    accessKeyId: 'AWS_ACCESS_KEY_ID',
    secret: 'AWS_SECRET',
    bucket: 'S3_BUCKET',
  },
  email: { sesRegion: 'SES_REGION', sendgridApiKey: 'SENDGRID_API_KEY' },
  sentry: { dsn: 'SENTRY_DSN' },
};

/** All integration providers (Admin → Integrations cards). */
export const INTEGRATION_PROVIDER_KEYS = Object.keys(
  ENV_FALLBACK,
) as IntegrationProviderKey[];

/** Logical field names a provider expects (e.g. surepass → [token, baseUrl]). */
export function providerFields(provider: IntegrationProviderKey): string[] {
  return Object.keys(ENV_FALLBACK[provider]);
}

interface CacheEntry {
  config: Record<string, string>;
  enabled: boolean;
  expiresAt: number;
}

const CACHE_TTL_MS = 30_000;

@Injectable()
export class IntegrationsConfigService {
  private readonly logger = new Logger(IntegrationsConfigService.name);
  private readonly cache = new Map<IntegrationProviderKey, CacheEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly crypto: CryptoService,
  ) {}

  /**
   * Resolve the full config object for a provider: DB-stored (decrypted)
   * values take precedence; any field missing there falls back to its env var.
   */
  async getConfig(
    provider: IntegrationProviderKey,
  ): Promise<{ enabled: boolean; values: Record<string, string | undefined> }> {
    const cached = this.cache.get(provider);
    const now = this.now();
    let dbValues: Record<string, string> = {};
    let enabled = false;

    if (cached && cached.expiresAt > now) {
      dbValues = cached.config;
      enabled = cached.enabled;
    } else {
      ({ dbValues, enabled } = await this.loadFromDb(provider));
      this.cache.set(provider, {
        config: dbValues,
        enabled,
        expiresAt: now + CACHE_TTL_MS,
      });
    }

    const fields = ENV_FALLBACK[provider];
    const values: Record<string, string | undefined> = {};
    for (const [field, envVar] of Object.entries(fields)) {
      values[field] =
        dbValues[field] ?? this.config.get(envVar, { infer: true });
    }
    return { enabled, values };
  }

  /** Convenience: resolve a single field for a provider. */
  async getValue(
    provider: IntegrationProviderKey,
    field: string,
  ): Promise<string | undefined> {
    const { values } = await this.getConfig(provider);
    return values[field];
  }

  /** Invalidate cache after an admin updates a key (called from Phase 7). */
  invalidate(provider?: IntegrationProviderKey): void {
    if (provider) this.cache.delete(provider);
    else this.cache.clear();
  }

  private async loadFromDb(
    provider: IntegrationProviderKey,
  ): Promise<{ dbValues: Record<string, string>; enabled: boolean }> {
    try {
      const row = await this.prisma.integration.findUnique({
        where: { provider },
      });
      if (!row?.encryptedConfig) {
        return { dbValues: {}, enabled: row?.enabled ?? false };
      }
      // Decrypt in memory at point of use (§A8) — KMS-backed CryptoService.
      const decoded = JSON.parse(this.crypto.decrypt(row.encryptedConfig));
      return { dbValues: decoded ?? {}, enabled: row.enabled };
    } catch (err) {
      // DB unavailable (e.g. before first migration) → fall back to env only.
      this.logger.warn(
        `Could not load '${provider}' integration from DB; using env fallback. (${
          (err as Error).message
        })`,
      );
      return { dbValues: {}, enabled: false };
    }
  }

  // Wrapped so the forbidden Date.now() lives in one place if mocked in tests.
  private now(): number {
    return Date.now();
  }
}
