import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { loggerConfig } from './common/logging.config';

import { AppConfigModule } from './config/config.module';
import type { Env } from './config/env.schema';
import { CryptoModule } from './crypto/crypto.module';
import { AuditModule } from './common/audit/audit.module';
import { ObservabilityModule } from './observability/observability.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';
import { WebsocketsModule } from './websockets/websockets.module';
import { JobsModule } from './jobs/jobs.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AntiReplayGuard } from './common/guards/anti-replay.guard';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { EngineersModule } from './modules/engineers/engineers.module';
import { KycModule } from './modules/kyc/kyc.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { IncentivesModule } from './modules/incentives/incentives.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { AdminModule } from './modules/admin/admin.module';

/**
 * Root module. Phase 1 wires the foundation: config + env validation,
 * Prisma database access, auth + users + RBAC. Domain modules
 * (catalog, bookings, dispatch, payments, …) are added in later phases
 * per the build order in Tech-Stack §13.
 *
 * RBAC is enforced globally: JwtAuthGuard authenticates every route unless
 * marked @Public(), then RolesGuard checks @Roles(...) (Security §12).
 */
@Module({
  imports: [
    LoggerModule.forRoot(loggerConfig()),
    AppConfigModule,
    CryptoModule,
    // Global rate limiting (§A5). In-memory per-instance; move to a Redis
    // storage for multi-instance deployments.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: [
          {
            ttl: config.get('THROTTLE_TTL_MS', { infer: true }),
            limit: config.get('THROTTLE_LIMIT', { infer: true }),
          },
        ],
      }),
    }),
    DatabaseModule,
    AuditModule,
    ObservabilityModule,
    RedisModule,
    StorageModule,
    WebsocketsModule,
    // BullMQ connection for background jobs (dispatch timeouts, later payouts).
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const url = new URL(config.get('REDIS_URL', { infer: true }));
        return {
          connection: {
            host: url.hostname,
            port: url.port ? Number(url.port) : 6379,
            password: url.password || undefined,
            db: url.pathname ? Number(url.pathname.slice(1)) || 0 : 0,
          },
        };
      },
    }),
    AuthModule,
    UsersModule,
    CustomersModule,
    EngineersModule,
    KycModule,
    CatalogModule,
    CouponsModule,
    BookingsModule,
    DispatchModule,
    TrackingModule,
    RatingsModule,
    IncentivesModule,
    NotificationsModule,
    DisputesModule,
    AdminModule,
    JobsModule,
  ],
  providers: [
    // Order matters: rate-limit → authenticate → authorize → anti-replay.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: AntiReplayGuard },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule {}
