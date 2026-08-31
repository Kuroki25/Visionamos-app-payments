// Runs before the test framework loads (jest-e2e.json "setupFiles") — i.e.
// before the test file's own `import { AppModule } from '../src/app.module'`
// triggers env validation. JWT secrets have no default in env.schema.ts on
// purpose (fail fast in real environments), so tests must supply their own
// fixed, obviously-fake values.
process.env.JWT_ACCESS_SECRET ??= 'test-only-access-secret-do-not-use-in-prod-0000';
process.env.JWT_REFRESH_SECRET ??= 'test-only-refresh-secret-do-not-use-in-prod-0000';
process.env.COOKIE_SECURE ??= 'false';
