import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';

import { REDIS_CLIENT } from '../redis/redis.constants';
import { Sentry } from './sentry';

const FAILED_LOGIN_WINDOW_SEC = 600;
const FAILED_LOGIN_ALERT_AT = 5;

/**
 * Auth-anomaly detection + alerting (§A9). Notable security events are logged
 * and (when Sentry is configured) captured as Sentry messages so dashboards
 * can alert on failed-login spikes, refresh-token reuse and lockouts.
 */
@Injectable()
export class SecurityEventsService {
  private readonly logger = new Logger('SecurityEvents');

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** Count failed logins per (hashed) identity; alert on a spike. */
  async failedLogin(identityHash: string): Promise<void> {
    let count = 0;
    try {
      const key = `failed-login:${identityHash}`;
      count = await this.redis.incr(key);
      if (count === 1) await this.redis.expire(key, FAILED_LOGIN_WINDOW_SEC);
    } catch {
      // Redis unavailable — still emit the single event below.
    }
    if (count >= FAILED_LOGIN_ALERT_AT) {
      this.alert('auth.failed_login_spike', { identityHash, count });
    }
  }

  refreshReuse(familyId: string): void {
    this.alert('auth.refresh_reuse', { familyId });
  }

  lockout(scope: string): void {
    this.alert('auth.lockout', { scope });
  }

  private alert(event: string, data: Record<string, unknown>): void {
    this.logger.warn(`SECURITY ${event} ${JSON.stringify(data)}`);
    Sentry.captureMessage(event, { level: 'warning', extra: data });
  }
}
