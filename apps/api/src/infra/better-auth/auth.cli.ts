/**
 * Config entry point for the Better Auth CLI (`npx auth generate`/`migrate`,
 * `docs/auth-migration/03-database-migration-strategy.md`) — the CLI needs
 * a file exporting a real `betterAuth()` instance, not the parameterized
 * factory the running app uses (`better-auth.factory.ts`). Kept as its own
 * small file rather than folded into the factory so the app's own
 * bootstrap never depends on `process.env` being read outside
 * `EnvSchema`/`ConfigService` (docs/adr/005-validation-strategy.md) — this
 * file is for the CLI only, never imported by `app.module.ts`.
 *
 * The `pg.Pool` built here is never explicitly closed — this process is a
 * short-lived CLI invocation, not a long-running server
 * (`better-auth.module.ts` is where pool lifecycle actually matters).
 */
import { Pool } from 'pg';

import { createBetterAuthInstance } from './better-auth.factory';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set in the environment to run the Better Auth CLI.`);
  }
  return value;
}

const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5442),
  user: process.env.DB_USERNAME ?? 'visionamos',
  password: process.env.DB_PASSWORD ?? 'visionamos',
  database: process.env.DB_NAME ?? 'visionamos',
  ssl: process.env.DB_SSL === 'true',
});

export const auth = createBetterAuthInstance(
  {
    BETTER_AUTH_SECRET: required('BETTER_AUTH_SECRET'),
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4100',
    BETTER_AUTH_SESSION_TTL_DAYS: Number(process.env.BETTER_AUTH_SESSION_TTL_DAYS ?? 7),
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3100,http://localhost:3101',
  },
  pool,
);
