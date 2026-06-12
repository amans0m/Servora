import { z } from 'zod';

/**
 * Bootstrap / infrastructure environment (Tech-Stack §10).
 *
 * Only the infra-level config and bootstrap secrets are required here.
 * Third-party provider keys (Surepass, Razorpay, …) are intentionally
 * OPTIONAL: at runtime they are read from the DB first (Admin → Integrations)
 * and fall back to these env vars only when unset. See IntegrationsConfigService.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),

  // ── CORS + rate limiting (SECURITY.md A5) ──
  // Comma-separated allowlist of origins (no '*'). Empty in dev = reflect localhost.
  CORS_ORIGINS: z.string().optional(),
  THROTTLE_TTL_MS: z.coerce.number().default(60_000),
  THROTTLE_LIMIT: z.coerce.number().default(120),

  // Core infrastructure — required
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  // Auth — required
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  // ── Encryption / KMS (SECURITY.md A1) ──
  // Master key never lives here in prod: KMS_PROVIDER=aws wraps data keys via
  // a CMK. Locally a git-ignored keyfile is generated. INTEGRATIONS_ENCRYPTION_KEY
  // is optional now — if set, the local keyfile's first key is derived from it.
  KMS_PROVIDER: z.enum(['local', 'aws']).default('local'),
  KMS_KEYFILE: z.string().default('.keys/local-kms.json'),
  KMS_AWS_KEY_ID: z.string().optional(),
  AWS_REGION: z.string().optional(),
  INTEGRATIONS_ENCRYPTION_KEY: z.string().min(16).optional(),

  // ── Third-party provider keys (OPTIONAL — DB-first, env-fallback) ──
  SUREPASS_TOKEN: z.string().optional(),
  SUREPASS_BASE_URL: z.string().url().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAYX_KEY: z.string().optional(),
  RAZORPAYX_SECRET: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  FCM_SERVICE_ACCOUNT: z.string().optional(),
  MSG91_AUTH_KEY: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  SES_REGION: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/** Validate process.env at boot; throws a readable error if misconfigured. */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
