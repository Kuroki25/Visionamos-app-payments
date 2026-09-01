/**
 * Jest `globalSetup` for `test/jest-e2e.json` — runs ONCE, in its own
 * process, before any `.e2e-spec.ts` file's `beforeAll` (docs/adr/010,
 * "Actualización 2026-09-01"; docs/auth-migration/09-real-postgres-test-suite.md).
 *
 * Responsibilities, in order:
 * 1. Ensure a DEDICATED `visionamos_test` database exists — never touches
 *    the real development database (`visionamos`), only uses it as the
 *    anchor connection Postgres requires to run `CREATE DATABASE`.
 * 2. Apply every pending TypeORM migration to it (real migrations, same
 *    ones `development`/`production` use — no `synchronize`).
 * 3. Apply Better Auth's schema (`better-auth-schema.sql`) — idempotent,
 *    `IF NOT EXISTS` throughout.
 * 4. `TRUNCATE` every table — guarantees a clean slate for this run even if
 *    a previous run crashed mid-way and left rows behind.
 *
 * `jest-e2e.json` also sets `maxWorkers: 1` — every `.e2e-spec.ts` file
 * shares this ONE real database sequentially, so nothing here needs to
 * repeat per file (unlike the old per-file `:memory:` SQLite, which was
 * naturally isolated by being a separate instance per file).
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { Client } from 'pg';
import { DataSource } from 'typeorm';

import { ENTITIES } from '../src/config/entities';
import { SnakeCaseNamingStrategy } from '../src/config/snake-case-naming.strategy';

const DB_HOST = process.env.DB_HOST ?? 'localhost';
const DB_PORT = Number(process.env.DB_PORT ?? '5442');
const DB_USERNAME = process.env.DB_USERNAME ?? 'visionamos';
const DB_PASSWORD = process.env.DB_PASSWORD ?? 'visionamos';
const DB_SSL = process.env.DB_SSL === 'true';
const ANCHOR_DB = process.env.DB_NAME ?? 'visionamos';
const TEST_DB = 'visionamos_test';

function connectionOptions(database: string) {
  return { host: DB_HOST, port: DB_PORT, user: DB_USERNAME, password: DB_PASSWORD, database, ssl: DB_SSL };
}

async function ensureTestDatabaseExists(): Promise<void> {
  const client = new Client(connectionOptions(ANCHOR_DB));
  await client.connect();
  try {
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [TEST_DB]);
    if (existing.rowCount === 0) {
      // Database names can't be parameterized — TEST_DB is a fixed literal
      // above, never user input.
      await client.query(`CREATE DATABASE "${TEST_DB}"`);
    }
  } finally {
    await client.end();
  }
}

async function applyBetterAuthSchema(): Promise<void> {
  const sql = await fs.readFile(path.join(__dirname, 'better-auth-schema.sql'), 'utf-8');
  const client = new Client(connectionOptions(TEST_DB));
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

// TypeORM's own migration-tracking table — truncating it would make
// `runMigrations()` think nothing has ever run and try to re-apply
// `CREATE TABLE`s that still physically exist (found the hard way: a
// second run of this suite failed with "relation already exists" before
// this exclusion was added).
const MIGRATIONS_TRACKING_TABLE = 'migrations';

async function truncateAllTables(): Promise<void> {
  const client = new Client(connectionOptions(TEST_DB));
  await client.connect();
  try {
    const { rows } = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != $1`,
      [MIGRATIONS_TRACKING_TABLE],
    );
    if (rows.length === 0) return;
    const tableList = rows.map((r) => `"${r.tablename}"`).join(', ');
    await client.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
  } finally {
    await client.end();
  }
}

export default async function globalSetup(): Promise<void> {
  await ensureTestDatabaseExists();

  // Built inline rather than reusing the `AppDataSource` singleton from
  // data-source.ts: that file reads `process.env.DB_NAME` once, at module
  // load time, and a dynamic `import()` of it from here would bypass
  // Jest's own module resolution (Jest transforms globalSetup's *static*
  // import graph, but a runtime `import()`/`require()` call goes through
  // Node's real loader instead — which only sees the real filesystem,
  // where migration/entity `.ts` files aren't separately compiled). A
  // fresh `DataSource` built from statically-imported pieces avoids both
  // problems and always targets TEST_DB explicitly, never `process.env.DB_NAME`.
  const testDataSource = new DataSource({
    type: 'postgres',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USERNAME, // note: `username` here, not `user` — different field name than pg.Client's ConnectionOptions (connectionOptions() above is pg-specific, not reused here on purpose).
    password: DB_PASSWORD,
    database: TEST_DB,
    ssl: DB_SSL,
    entities: ENTITIES,
    namingStrategy: new SnakeCaseNamingStrategy(),
    migrations: ['src/migrations/*.ts'],
    synchronize: false,
  });
  await testDataSource.initialize();
  try {
    await testDataSource.runMigrations();
  } finally {
    await testDataSource.destroy();
  }

  await applyBetterAuthSchema();
  await truncateAllTables();
}
