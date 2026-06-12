import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomInt, timingSafeEqual } from 'node:crypto';
import type { Redis } from 'ioredis';

import { CryptoService } from '../../crypto/crypto.service';
import { REDIS_CLIENT } from '../../redis/redis.constants';

const TTL_SEC = 5 * 60;
const MAX_ATTEMPTS = 5;
const REQUEST_WINDOW_SEC = 60;
const MAX_REQUESTS_PER_WINDOW = 3; // throttle OTP requests per phone (§A2)

/**
 * Login OTP store backed by Redis (§A2): codes are stored HASHED (HMAC keyed
 * by the blind-index key), single-use, short-lived and rate-limited. Shared
 * across instances, unlike the previous in-memory map.
 */
@Injectable()
export class LoginOtpStore {
  private readonly logger = new Logger(LoginOtpStore.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly crypto: CryptoService,
  ) {}

  private codeKey(phone: string): string {
    // Index the phone (don't store it raw in a Redis key).
    return `login-otp:${this.crypto.blindIndex(phone)}`;
  }
  private reqKey(phone: string): string {
    return `login-otp-req:${this.crypto.blindIndex(phone)}`;
  }

  private hash(phone: string, code: string): string {
    // Keyed HMAC (the blind-index key) — codes are never stored recoverably.
    return this.crypto.blindIndex(`otp:${phone}:${code}`);
  }

  /** Generate + store a hashed code; throttle requests per phone. */
  async issue(phone: string): Promise<string> {
    const reqs = await this.redis.incr(this.reqKey(phone));
    if (reqs === 1) await this.redis.expire(this.reqKey(phone), REQUEST_WINDOW_SEC);
    if (reqs > MAX_REQUESTS_PER_WINDOW) {
      throw new Error('Too many OTP requests — please wait a minute');
    }

    const code = randomInt(1000, 10000).toString();
    await this.redis.set(
      this.codeKey(phone),
      JSON.stringify({ hash: this.hash(phone, code), attempts: 0 }),
      'EX',
      TTL_SEC,
    );
    return code;
  }

  /** Verify + consume a code (single-use, attempt-limited). */
  async verify(phone: string, code: string): Promise<boolean> {
    const key = this.codeKey(phone);
    const raw = await this.redis.get(key);
    if (!raw) return false;
    const entry = JSON.parse(raw) as { hash: string; attempts: number };
    if (entry.attempts >= MAX_ATTEMPTS) {
      await this.redis.del(key);
      return false;
    }
    const expected = Buffer.from(entry.hash);
    const actual = Buffer.from(this.hash(phone, code));
    const ok = expected.length === actual.length && timingSafeEqual(expected, actual);
    if (!ok) {
      await this.redis.set(
        key,
        JSON.stringify({ hash: entry.hash, attempts: entry.attempts + 1 }),
        'KEEPTTL',
      );
      return false;
    }
    await this.redis.del(key); // single-use
    return true;
  }
}
