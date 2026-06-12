import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { Redis } from 'ioredis';
import type { Request } from 'express';

import type { RawBodyRequest } from '@nestjs/common';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_ANTI_REPLAY } from '../decorators/skip-anti-replay.decorator';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SKEW_MS = 5 * 60 * 1000; // accept timestamps within ±5 min
const NONCE_TTL_SEC = 600; // remember nonces for 2× the skew window

/**
 * Anti-replay (§A3): every authenticated MUTATING request must carry
 *   x-timestamp, x-nonce, x-signature
 * where signature = HMAC-SHA256( method\npath\nsha256(body)\ntimestamp\nnonce )
 * keyed by the caller's access token (a per-session secret the client already
 * holds — never shipped in the bundle). Stale timestamps and reused nonces are
 * rejected, so captured traffic can't be replayed. Fails closed.
 */
@Injectable()
export class AntiReplayGuard implements CanActivate {
  private readonly logger = new Logger(AntiReplayGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    if (!MUTATING.has(req.method)) return true;

    const exempt = this.reflector.getAllAndOverride<boolean>(SKIP_ANTI_REPLAY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Public routes have no session signing key (login/register/webhook) and
    // are protected by other controls (rate-limit, provider signatures).
    if (exempt || isPublic) return true;

    const timestamp = header(req, 'x-timestamp');
    const nonce = header(req, 'x-nonce');
    const signature = header(req, 'x-signature');
    if (!timestamp || !nonce || !signature) {
      throw new BadRequestException(
        'Missing anti-replay headers (x-timestamp, x-nonce, x-signature)',
      );
    }

    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > SKEW_MS) {
      throw new ForbiddenException('Request timestamp is stale or invalid');
    }

    const token = bearer(req);
    if (!token) throw new ForbiddenException('Missing bearer token for signature');

    const body = req.rawBody ? req.rawBody.toString('utf8') : '';
    const base = [
      req.method,
      req.originalUrl,
      createHash('sha256').update(body).digest('hex'),
      timestamp,
      nonce,
    ].join('\n');
    const expected = createHmac('sha256', token).update(base).digest('hex');
    if (!safeEqualHex(expected, signature)) {
      throw new ForbiddenException('Invalid request signature');
    }

    // Reject reused nonces (fail closed if Redis is unreachable).
    let stored: string | null;
    try {
      stored = await this.redis.set(`nonce:${nonce}`, '1', 'EX', NONCE_TTL_SEC, 'NX');
    } catch (err) {
      this.logger.error(`Nonce store unavailable: ${(err as Error).message}`);
      throw new ForbiddenException('Replay protection unavailable');
    }
    if (stored === null) throw new ForbiddenException('Nonce already used (replay)');

    return true;
  }
}

function header(req: Request, name: string): string | undefined {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
}

function bearer(req: Request): string | undefined {
  const auth = header(req, 'authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
