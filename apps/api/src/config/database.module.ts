import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';

import { ENTITIES } from './entities';
import type { Env } from './env.schema';
import { SnakeCaseNamingStrategy } from './snake-case-naming.strategy';

/**
 * Persistence wiring (docs/adr/010-persistence.md). Always PostgreSQL, in
 * every `NODE_ENV` — the in-memory SQLite branch this module used to have
 * for `NODE_ENV=test` was removed 2026-09-01 (ADR 010, "Actualización
 * 2026-09-01"): Better Auth's own tables (`user`/`session`/`account`/
 * `verification`, docs/adr/013-better-auth-migration.md) aren't TypeORM
 * entities, so they never existed in that SQLite database, and
 * `BetterAuthSessionGuard` needs them to run at all. Integration tests now
 * target a real, dedicated `visionamos_test` database (`DB_NAME` overridden
 * in `test/setup-env.ts`) instead — see `test/global-setup-postgres.ts` for
 * how that database gets its schema and a clean slate before each run.
 *
 * `synchronize`/`dropSchema` are never true here, in any environment —
 * `development`/`production`/`test` all require real migrations
 * (`pnpm --filter api migration:run`, see data-source.ts, and
 * `test/global-setup-postgres.ts` for the test database specifically).
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: config.get('DB_HOST', { infer: true }),
        port: config.get('DB_PORT', { infer: true }),
        username: config.get('DB_USERNAME', { infer: true }),
        password: config.get('DB_PASSWORD', { infer: true }),
        database: config.get('DB_NAME', { infer: true }),
        ssl: config.get('DB_SSL', { infer: true }),
        synchronize: false,
        entities: ENTITIES,
        namingStrategy: new SnakeCaseNamingStrategy(),
      }),
    }),
  ],
})
export class DatabaseModule {}
