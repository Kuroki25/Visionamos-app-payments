import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';
import { LoggerModule } from 'nestjs-pino';

import { DatabaseModule } from './config/database.module';
import type { Env } from './config/env.schema';
import { validateEnv } from './config/env.schema';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CsrfGuard } from './modules/auth/guards/csrf.guard';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { CsrfCookieMiddleware } from './modules/auth/middleware/csrf-cookie.middleware';
import { CategoriesModule } from './modules/categories/categories.module';
import { CommercesModule } from './modules/commerces/commerces.module';
import { FormsModule } from './modules/forms/forms.module';
import { HealthModule } from './modules/health/health.module';
import { PortalsModule } from './modules/portals/portals.module';
import { RoleAssignmentsModule } from './modules/role-assignments/role-assignments.module';
import { ServicesModule } from './modules/services/services.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { UsersModule } from './modules/users/users.module';

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
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CsrfCookieMiddleware).forRoutes('*');
  }
}
