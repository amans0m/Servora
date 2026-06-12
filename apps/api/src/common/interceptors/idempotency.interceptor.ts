import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { from, of, type Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import type { Redis } from 'ioredis';
import type { Request } from 'express';

import { REDIS_CLIENT } from '../../redis/redis.constants';
import type { AuthUser } from '../decorators/current-user.decorator';
import {
  IDEMPOTENT_KEY,
  type IdempotentOptions,
} from '../decorators/idempotent.decorator';

const RESULT_TTL_SEC = 24 * 60 * 60;
const LOCK_TTL_SEC = 60;

/**
 * Idempotency for critical mutations (§A3). With an `Idempotency-Key` header,
 * the first response is cached in Redis and replayed for any retry; concurrent
 * duplicates while the first is in-flight get a 409.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.getAllAndOverride<IdempotentOptions>(
      IDEMPOTENT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!options) return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    const key = headerValue(req, 'idempotency-key');
    if (!key) {
      if (options.required) {
        throw new BadRequestException('Idempotency-Key header is required');
      }
      return next.handle();
    }

    const user = req.user as AuthUser | undefined;
    const scope = user?.userId ?? 'anon';
    const resultKey = `idem:${scope}:${req.method}:${req.originalUrl}:${key}`;
    const lockKey = `${resultKey}:lock`;

    return from(this.redis.get(resultKey)).pipe(
      switchMap((cached) => {
        if (cached) return of(JSON.parse(cached));
        return from(this.redis.set(lockKey, '1', 'EX', LOCK_TTL_SEC, 'NX')).pipe(
          switchMap((lock) => {
            if (lock === null) {
              throw new ConflictException(
                'A request with this Idempotency-Key is already being processed',
              );
            }
            return next.handle().pipe(
              tap((response) => {
                void this.redis.set(
                  resultKey,
                  JSON.stringify(response ?? null),
                  'EX',
                  RESULT_TTL_SEC,
                );
                void this.redis.del(lockKey);
              }),
            );
          }),
        );
      }),
    );
  }
}

function headerValue(req: Request, name: string): string | undefined {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
}
