// Runs before the test framework loads (jest-e2e.json "setupFiles") — i.e.
// before the test file's own `import { AppModule } from '../src/app.module'`
// triggers env validation. BETTER_AUTH_SECRET has no default in
// env.schema.ts on purpose (fail fast in real environments), so tests must
// supply their own fixed, obviously-fake value.
process.env.COOKIE_SECURE ??= 'false';
process.env.BETTER_AUTH_SECRET ??= 'test-only-better-auth-secret-do-not-use-in-prod-0';

// Every `.e2e-spec.ts` file boots its own AppModule in its own Jest worker
// process, separate from `global-setup-postgres.ts`'s process — this must
// independently target the same dedicated test database that globalSetup
// prepared (docs/adr/010, "Actualización 2026-09-01"), never the real
// development database.
process.env.DB_NAME = 'visionamos_test';
