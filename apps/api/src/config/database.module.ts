import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';

import { ENTITIES } from './entities';
import type { Env } from './env.schema';
import { SnakeCaseNamingStrategy } from './snake-case-naming.strategy';

/**
 * Persistence wiring (docs/adr/010-persistence.md). Production/development
 * use PostgreSQL; NODE_ENV=test swaps in an in-memory SQLite database so the
 * integration test suite (test/app.e2e-spec.ts) can boot the real AppModule
 * without a live Postgres instance — a deliberate, documented trade-off, not
 * a hidden shortcut.
 *
 * `synchronize` is true ONLY in `test` — it used to also be true in
 * `development` (docs/adr/010, "Actualización 2026-08-30"), which stopped
 * being acceptable once the schema grew real constraints (CHECK, partial
 * unique indexes) that deserve to be reviewed as an explicit migration, not
 * silently auto-generated. `development`/`production` require
 * `pnpm --filter api migration:run` against a real Postgres — see
 * data-source.ts.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): TypeOrmModuleOptions => {
        const nodeEnv = config.get('NODE_ENV', { infer: true });

        if (nodeEnv === 'test') {
          return {
            type: 'better-sqlite3',
            database: ':memory:',
            dropSchema: true,
            synchronize: true,
            entities: ENTITIES,
            namingStrategy: new SnakeCaseNamingStrategy(),
          };
        }

        return {
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
        };
      },
    }),
  ],
})
export class DatabaseModule {}
