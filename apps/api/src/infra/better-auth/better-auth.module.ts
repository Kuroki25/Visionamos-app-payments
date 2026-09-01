import { Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pool } from 'pg';

import type { Env } from '../../config/env.schema';
import { RoleAssignmentEntity } from '../../modules/role-assignments/entities/role-assignment.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';
import { BetterAuthSessionGuard } from './better-auth-session.guard';
import { createBetterAuthInstance, type BetterAuthInstance } from './better-auth.factory';
import { BETTER_AUTH_INSTANCE } from './better-auth.token';

export { BETTER_AUTH_INSTANCE };

const BETTER_AUTH_PG_POOL = Symbol('BETTER_AUTH_PG_POOL');

/**
 * Infrastructure module (docs/adr/013-better-auth-migration.md) — exposes
 * `BETTER_AUTH_INSTANCE` and `BetterAuthSessionGuard`, imported by
 * `app.module.ts` for real since the cutover.
 *
 * Owns its `pg.Pool` as its own provider (`BETTER_AUTH_PG_POOL`, private —
 * not exported, nothing outside this module should reach into it) rather
 * than letting `better-auth.factory.ts` construct one internally, so this
 * class can close it via `onModuleDestroy` when the app shuts down. Without
 * this, every `Test.createTestingModule({ imports: [..., BetterAuthModule] })`
 * across the e2e suite (a fresh module graph per test file) leaked a full
 * connection pool that outlived the test — found via `GET /api/v1/health`
 * intermittently returning 503 (Postgres connection exhaustion) and Jest's
 * own "did not exit one second after the test run" warning on every run.
 */
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([UserEntity, RoleAssignmentEntity])],
  providers: [
    {
      provide: BETTER_AUTH_PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): Pool =>
        new Pool({
          host: config.get('DB_HOST', { infer: true }),
          port: config.get('DB_PORT', { infer: true }),
          user: config.get('DB_USERNAME', { infer: true }),
          password: config.get('DB_PASSWORD', { infer: true }),
          database: config.get('DB_NAME', { infer: true }),
          ssl: config.get('DB_SSL', { infer: true }),
        }),
    },
    {
      provide: BETTER_AUTH_INSTANCE,
      inject: [ConfigService, BETTER_AUTH_PG_POOL],
      useFactory: (config: ConfigService<Env, true>, pool: Pool): BetterAuthInstance =>
        createBetterAuthInstance(
          {
            BETTER_AUTH_SECRET: config.get('BETTER_AUTH_SECRET', { infer: true }),
            BETTER_AUTH_URL: config.get('BETTER_AUTH_URL', { infer: true }),
            BETTER_AUTH_SESSION_TTL_DAYS: config.get('BETTER_AUTH_SESSION_TTL_DAYS', { infer: true }),
            CORS_ALLOWED_ORIGINS: config.get('CORS_ALLOWED_ORIGINS', { infer: true }),
          },
          pool,
        ),
    },
    BetterAuthSessionGuard,
  ],
  exports: [BETTER_AUTH_INSTANCE, BetterAuthSessionGuard],
})
export class BetterAuthModule implements OnModuleDestroy {
  constructor(@Inject(BETTER_AUTH_PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
