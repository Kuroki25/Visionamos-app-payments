import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZodValidationPipe } from 'nestjs-zod';
import { LoggerModule } from 'nestjs-pino';

import { DatabaseModule } from './config/database.module';
import type { Env } from './config/env.schema';
import { validateEnv } from './config/env.schema';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CsrfGuard } from './modules/auth/guards/csrf.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { CsrfCookieMiddleware } from './modules/auth/middleware/csrf-cookie.middleware';
import { CategoriesModule } from './modules/categories/categories.module';
import { CommercesModule } from './modules/commerces/commerces.module';
import { FormsModule } from './modules/forms/forms.module';
import { HealthModule } from './modules/health/health.module';
import { PortalsModule } from './modules/portals/portals.module';
import { RoleAssignmentEntity } from './modules/role-assignments/entities/role-assignment.entity';
import { RoleAssignmentsModule } from './modules/role-assignments/role-assignments.module';
import { ServicesModule } from './modules/services/services.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { UserEntity } from './modules/users/entities/user.entity';
import { UsersModule } from './modules/users/users.module';
import { BetterAuthSessionGuard } from './infra/better-auth/better-auth-session.guard';
import { BetterAuthModule } from './infra/better-auth/better-auth.module';

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
            // exactOptionalPropertyTypes forbids `transport: undefined` —
            // the key is omitted entirely outside production instead.
            ...(isProduction ? {} : { transport: { target: 'pino-pretty' } }),
            // Never log credentials/tokens/cookies (OWASP A09 — Security
            // Logging and Alerting Failures).
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

    // Default rate limit for the whole API (section 24). Auth endpoints
    // override this with a stricter @Throttle(...) (see AuthController).
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
    // BetterAuthSessionGuard is registered as an APP_GUARD provider of
    // *this* module below, not of BetterAuthModule — Nest resolves a
    // provider's dependencies against the module that declares it, not the
    // class's "usual" module, so AppModule needs its own visibility into
    // these repositories even though BetterAuthModule already has its own
    // (private) copy for its own internal provider of the same class. Same
    // pattern, same reason, as `test/better-auth/rehearsal-app.module.ts`
    // (Fase 7) — found and documented there first.
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
    // Order matters: rate-limit first (cheapest check), then authenticate,
    // then authorize by role, then CSRF (only relevant once we know the
    // request is a same-origin, cookie-carrying mutation).
    //
    // BetterAuthSessionGuard (docs/adr/013-better-auth-migration.md) — the
    // former JwtAuthGuard here, retired along with the rest of the JWT
    // legacy stack once this swap was proven end-to-end (rehearsed first in
    // `test/better-auth/rehearsal-app.module.ts`, Fase 7, against real
    // Postgres, before ever touching this file). RolesGuard/CsrfGuard are
    // untouched — this migration only ever changes *who* authenticates.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: BetterAuthSessionGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CsrfCookieMiddleware).forRoutes('*');
  }
}
