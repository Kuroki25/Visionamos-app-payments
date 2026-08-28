import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';
import { LoggerModule } from 'nestjs-pino';

import { DatabaseModule } from './config/database.module';
import type { Env } from './config/env.schema';
import { validateEnv } from './config/env.schema';
import { HealthModule } from './modules/health/health.module';
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
            ],
          },
        };
      },
    }),

    // Default rate limit for the whole API (section 24). Endpoints with a
    // stricter need (login, password reset, OTP) override it with their own
    // @Throttle(...) decorator once they exist — see docs/API_GUIDELINES.md.
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
    HealthModule,
    UsersModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
