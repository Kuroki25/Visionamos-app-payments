import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZodValidationPipe } from 'nestjs-zod';
import { LoggerModule } from 'nestjs-pino';

import { DatabaseModule } from '../../src/config/database.module';
import type { Env } from '../../src/config/env.schema';
import { validateEnv } from '../../src/config/env.schema';
import { AuditModule } from '../../src/modules/audit/audit.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { CsrfGuard } from '../../src/modules/auth/guards/csrf.guard';
import { RolesGuard } from '../../src/modules/auth/guards/roles.guard';
import { CsrfCookieMiddleware } from '../../src/modules/auth/middleware/csrf-cookie.middleware';
import { CategoriesModule } from '../../src/modules/categories/categories.module';
import { CommercesModule } from '../../src/modules/commerces/commerces.module';
import { FormsModule } from '../../src/modules/forms/forms.module';
import { HealthModule } from '../../src/modules/health/health.module';
import { PortalsModule } from '../../src/modules/portals/portals.module';
import { RoleAssignmentEntity } from '../../src/modules/role-assignments/entities/role-assignment.entity';
import { RoleAssignmentsModule } from '../../src/modules/role-assignments/role-assignments.module';
import { ServicesModule } from '../../src/modules/services/services.module';
import { TransactionsModule } from '../../src/modules/transactions/transactions.module';
import { UserEntity } from '../../src/modules/users/entities/user.entity';
import { UsersModule } from '../../src/modules/users/users.module';
import { BetterAuthSessionGuard } from '../../src/infra/better-auth/better-auth-session.guard';
import { BetterAuthModule } from '../../src/infra/better-auth/better-auth.module';

/**
 * Fase 7 rehearsal harness (docs/auth-migration/07-cutover-rehearsal.md) —
 * a byte-for-byte copy of `src/app.module.ts`'s imports/providers, with
 * exactly one line different: `JwtAuthGuard` → `BetterAuthSessionGuard` in
 * the `APP_GUARD` chain, plus `BetterAuthModule` added so that guard's own
 * dependencies resolve. This is the actual swap Fase 10 cutover will make
 * in the real file — kept here as a separate module (not a Nest
 * `overrideProvider` on `AppModule`) because `APP_GUARD` is a Nest
 * multi-provider token (four separate registrations share it); Nest's
 * testing utilities have no supported way to replace exactly one of
 * several providers sharing the same multi-provider token, so overriding
 * in place silently leaves the original `JwtAuthGuard` active instead of
 * replacing it — confirmed the hard way (see the ADR's "Verificación
 * real" table with the first, wrong version of this file: every request
 * came back 401 because the real `JwtAuthGuard` was still in charge).
 *
 * Keep this in sync with `app.module.ts` by hand — Fase 10 replaces the
 * real file with exactly this diff, at which point this rehearsal module
 * can be deleted (its job is done).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),

    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const isProduction = config.get('NODE_ENV', { infer: true }) === 'production';
        return {
          pinoHttp: {
            level: config.get('LOG_LEVEL', { infer: true }),
            ...(isProduction ? {} : { transport: { target: 'pino-pretty' } }),
            redact: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
              'req.headers["x-csrf-token"]',
            ],
          },
        };
      },
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => [
        {
          ttl: config.get('THROTTLE_TTL_MS', { infer: true }),
          limit: config.get('THROTTLE_LIMIT', { infer: true }),
        },
      ],
    }),

    DatabaseModule,
    AuthModule,
    BetterAuthModule,
    // BetterAuthModule keeps UserEntity/RoleAssignmentEntity repositories
    // private to itself (not in its `exports`) — this module's own
    // `{ provide: APP_GUARD, useClass: BetterAuthSessionGuard }` provider
    // below is a SEPARATE registration in THIS module's scope, so it needs
    // its own visibility into those repositories regardless of what
    // BetterAuthModule exports (Nest resolves a provider's dependencies
    // against the declaring module's own imports/exports, not the class's
    // "usual" module). Redundant `forFeature` on the same entities is safe
    // — TypeORM/Nest allow it across multiple modules.
    TypeOrmModule.forFeature([UserEntity, RoleAssignmentEntity]),
    HealthModule,
    UsersModule,
    AuditModule,
    RoleAssignmentsModule,
    PortalsModule,
    CategoriesModule,
    CommercesModule,
    ServicesModule,
    FormsModule,
    TransactionsModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: BetterAuthSessionGuard }, // <- the only line different from app.module.ts
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class RehearsalAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CsrfCookieMiddleware).forRoutes('*');
  }
}
