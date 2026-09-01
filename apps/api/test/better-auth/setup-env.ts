// Fase 7 (docs/auth-migration/07-cutover-rehearsal.md) — this suite runs
// against the REAL development Postgres (`visionamos`, not the dedicated
// `visionamos_test` — it exercises `RehearsalAppModule`/`seed-demo.ts`
// fixtures directly). `NODE_ENV=development` is mostly vestigial now that
// `database.module.ts` connects to real Postgres unconditionally
// (docs/adr/010, "Actualización 2026-09-01") — kept explicit anyway so this
// file's intent (real Postgres, not a fresh empty database) stays clear.
process.env.NODE_ENV = 'development';

// Same real connection this repo's docker-compose.yml/.env already use for
// local dev — not a secret, matches the committed docker-compose.yml
// defaults. Only applied if not already set, so a developer's real `.env`
// (loaded by whatever runs this) still wins.
process.env.DB_HOST ??= 'localhost';
process.env.DB_PORT ??= '5442';
process.env.DB_USERNAME ??= 'visionamos';
process.env.DB_PASSWORD ??= 'visionamos';
process.env.DB_NAME ??= 'visionamos';
process.env.DB_SSL ??= 'false';

process.env.COOKIE_SECURE ??= 'false';

// Must match whatever the target Postgres's Better Auth tables were
// actually created/migrated with (docs/auth-migration/06-real-migration-run.md)
// — a mismatched secret would make every session token fail to verify.
// Real value stays in each developer's own untracked apps/api/.env.
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    'BETTER_AUTH_SECRET must be set (matching the value used to run `npx auth migrate`) to run this suite — ' +
      'see apps/api/.env.',
  );
}
process.env.BETTER_AUTH_URL ??= 'http://localhost:4100';
