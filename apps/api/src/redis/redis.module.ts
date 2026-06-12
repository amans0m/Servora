import { Global, Logger, Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

import type { Env } from '../config/env.schema';
import { GeoService } from './geo.service';
import { REDIS_CLIENT } from './redis.constants';

const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>) => {
    const logger = new Logger('Redis');
    const client = new Redis(config.get('REDIS_URL', { infer: true }), {
      maxRetriesPerRequest: null, // tolerate Redis being down in local dev
      enableReadyCheck: false,
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
    let warned = false;
    client.on('error', (err) => {
      if (!warned) {
        logger.warn(`Redis unavailable: ${err.message} (geo/dispatch degraded)`);
        warned = true;
      }
    });
    client.on('ready', () => {
      warned = false;
      logger.log('Connected to Redis');
    });
    return client;
  },
};

/**
 * Global Redis infrastructure: a shared ioredis client + GeoService for
 * engineer location matching (§7). Underpins dispatch, tracking and BullMQ.
 */
@Global()
@Module({
  providers: [redisProvider, GeoService],
  exports: [REDIS_CLIENT, GeoService],
})
export class RedisModule {}
