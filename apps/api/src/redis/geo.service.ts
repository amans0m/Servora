import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';

import { ENGINEER_GEO_KEY, REDIS_CLIENT } from './redis.constants';

export interface GeoHit {
  engineerId: string;
  distanceM: number;
}

/**
 * Engineer live-location geo index backed by Redis GEO (§7). Dispatch reads
 * nearby candidates via GEOSEARCH; tracking/availability keep it up to date.
 *
 * All methods are resilient: if Redis is unreachable they log and degrade
 * (empty search / no-op write) rather than throwing, so non-dispatch flows
 * keep working locally without Redis.
 */
@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** Add/update an online engineer's position. */
  async upsertEngineer(engineerId: string, lng: number, lat: number): Promise<void> {
    try {
      await this.redis.geoadd(ENGINEER_GEO_KEY, lng, lat, engineerId);
    } catch (err) {
      this.logger.warn(`geoadd failed for ${engineerId}: ${(err as Error).message}`);
    }
  }

  /** Remove an engineer (going offline). */
  async removeEngineer(engineerId: string): Promise<void> {
    try {
      await this.redis.zrem(ENGINEER_GEO_KEY, engineerId);
    } catch (err) {
      this.logger.warn(`zrem failed for ${engineerId}: ${(err as Error).message}`);
    }
  }

  /** Nearby engineers within `radiusKm`, nearest first, with distances. */
  async searchNearby(lng: number, lat: number, radiusKm: number): Promise<GeoHit[]> {
    try {
      // GEOSEARCH key FROMLONLAT lng lat BYRADIUS r km ASC WITHDIST
      const rows = (await this.redis.call(
        'GEOSEARCH',
        ENGINEER_GEO_KEY,
        'FROMLONLAT',
        String(lng),
        String(lat),
        'BYRADIUS',
        String(radiusKm),
        'km',
        'ASC',
        'WITHDIST',
      )) as Array<[string, string]>;
      return rows.map(([engineerId, distKm]) => ({
        engineerId,
        distanceM: Math.round(parseFloat(distKm) * 1000),
      }));
    } catch (err) {
      this.logger.warn(`geosearch failed: ${(err as Error).message}`);
      return [];
    }
  }
}
