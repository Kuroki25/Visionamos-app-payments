import type { INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import type { Env } from './env.schema';

/**
 * Applies every request-pipeline concern that isn't expressible as a Nest
 * module (`app.use(...)` middleware, global prefix, global filters).
 *
 * Both `main.ts` (real server) and `test/app.e2e-spec.ts` (integration
 * tests, which build the app straight from `AppModule` via
 * `Test.createTestingModule`) MUST call this — it used to live only in
 * `bootstrap()`, so the e2e app never had `cookie-parser` wired in and
 * `req.cookies` was always `undefined`, silently breaking CsrfGuard and
 * JwtAuthGuard (every request looked like it had no cookies at all). One
 * shared function means the two entry points cannot drift again.
 */
export function configureApp(app: INestApplication, config: ConfigService<Env, true>): void {
  // Security headers (section 27/28 baseline: CSP, HSTS, X-Content-Type-Options, ...).
  app.use(helmet());

  // Auth (docs/adr/006) reads/writes httpOnly cookies — req.cookies must exist.
  app.use(cookieParser());

  // Explicit origin allowlist — never "*" together with credentials (section 23).
  const allowedOrigins = config
    .get('CORS_ALLOWED_ORIGINS', { infer: true })
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new AllExceptionsFilter());
}
