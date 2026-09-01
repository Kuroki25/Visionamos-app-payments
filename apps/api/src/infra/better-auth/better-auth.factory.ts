import { betterAuth } from 'better-auth';
import type { Pool } from 'pg';

import { hashPassword, verifyPassword } from './argon2-password';

/**
 * Builds the Better Auth instance — the app's only authentication mechanism
 * since the cutover (docs/adr/013-better-auth-migration.md). Registered in
 * `app.module.ts` via `BetterAuthModule`; its HTTP handler is mounted at
 * `/api/auth/*` (`mount-better-auth-handler.ts`) and `BetterAuthSessionGuard`
 * is the app's global `APP_GUARD`.
 *
 * Every option below is deliberate, per the ADR — nothing here is a
 * placeholder:
 * - `database`: a raw `pg.Pool` (owned and closed by the caller — see this
 *   function's own docblock below), pointed at the same Postgres as
 *   `apps/api/src/config/database.module.ts` (one Postgres, two schema
 *   owners — see docs/auth-migration/03-database-migration-strategy.md).
 * - `advanced.database.generateId: 'uuid'`: verified against
 *   `node_modules/@better-auth/core/dist/types/init-options.d.mts:374` — for
 *   Postgres this uses `gen_random_uuid()`, matching every other table's
 *   `uuid` primary key in this schema.
 * - `emailAndPassword.password.{hash,verify}`: reuses the existing Argon2id
 *   hashes untouched (see `argon2-password.ts`) — no forced password reset.
 * - `emailAndPassword.disableSignUp: true`: no public self-registration,
 *   matching ADR 006 (there is no `POST /auth/register` today either). User
 *   creation stays exclusively `POST /users`, gated by
 *   `ScopeAuthorizationService.assertCanAssignRole` (ADR 011 §4) — Better
 *   Auth never decides who can create whom.
 * - `session`: server-side by default (no JWT plugin) — deliberately fixes
 *   AUTH-01 (`docs/auth-migration/01-auth-audit.md`): logout/deactivation
 *   becomes effective on the very next request, no TTL-bounded staleness
 *   window like the retired JWT access token had. `expiresIn` is
 *   `BETTER_AUTH_SESSION_TTL_DAYS` (default 7 days).
 * - `trustedOrigins`: reuses `CORS_ALLOWED_ORIGINS` (the same list
 *   `configure-app.ts` already passes to Nest's own `enableCors`) — Better
 *   Auth has its *own*, separate origin allowlist for `/api/auth/*`
 *   (`node_modules/better-auth/dist/api/middlewares/origin-check.mjs`); it
 *   is NOT derived from Nest's CORS config automatically. Found the hard
 *   way: without this, `baseURL`'s own origin was the *only* trusted
 *   origin, so a real frontend's state-changing calls (sign-in once a
 *   session cookie exists, sign-out) would all fail with `INVALID_ORIGIN`
 *   the moment they came from `http://localhost:3100`/`3101` instead of
 *   `http://localhost:4100` itself.
 */
interface BetterAuthEnv {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SESSION_TTL_DAYS: number;
  CORS_ALLOWED_ORIGINS: string;
}

/**
 * `database` is now a caller-provided `Pool`, not constructed here —
 * `better-auth.module.ts` owns that `Pool` as its own provider specifically
 * so it can close it on shutdown (`onModuleDestroy`). A `Pool` this
 * function created internally had no owner able to call `.end()` on it;
 * every fresh `Test.createTestingModule({imports:[...BetterAuthModule...]})`
 * across the e2e suite leaked a full connection pool that never closed —
 * found the hard way via `GET /api/v1/health` intermittently returning 503
 * (Postgres connection exhaustion) and Jest's own "did not exit one second
 * after" warning on every run.
 */
export function createBetterAuthInstance(env: BetterAuthEnv, database: Pool) {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database,
    // Same parsing as configure-app.ts's enableCors — one list, two
    // consumers, so they can't silently drift apart.
    trustedOrigins: env.CORS_ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    advanced: {
      database: {
        generateId: 'uuid',
      },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      password: {
        hash: hashPassword,
        verify: verifyPassword,
      },
    },
    session: {
      expiresIn: env.BETTER_AUTH_SESSION_TTL_DAYS * 24 * 60 * 60,
    },
  });
}

export type BetterAuthInstance = ReturnType<typeof createBetterAuthInstance>;
