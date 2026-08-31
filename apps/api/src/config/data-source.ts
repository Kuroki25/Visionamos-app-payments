import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { ENTITIES } from './entities';
import { SnakeCaseNamingStrategy } from './snake-case-naming.strategy';

/**
 * Standalone DataSource for the TypeORM CLI
 * (`pnpm --filter api migration:generate|run|revert`, docs/adr/010). Runs
 * outside Nest's bootstrap, so it reads `process.env` directly instead of
 * through `ConfigModule`/`ConfigService` (there's no `Env` type validation
 * gate here — the CLI is a developer/deploy-time tool, not the running
 * application). Same defaults as `env.schema.ts` so a local
 * `docker-compose up -d postgres` works with zero extra configuration.
 *
 * Only ever targets PostgreSQL — `NODE_ENV=test` never touches this file;
 * the SQLite branch in `database.module.ts` is untouched and keeps using
 * `synchronize: true`.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5442,
  username: process.env.DB_USERNAME ?? 'visionamos',
  password: process.env.DB_PASSWORD ?? 'visionamos',
  database: process.env.DB_NAME ?? 'visionamos',
  ssl: process.env.DB_SSL === 'true',
  entities: ENTITIES,
  namingStrategy: new SnakeCaseNamingStrategy(),
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});

// Deliberately no `export default` alongside the named export — the
// TypeORM CLI (`typeorm-ts-node-commonjs migration:*`) scans every export
// of this file for a DataSource instance and errors ("must contain only
// one export") if it finds the same instance twice under two names.
