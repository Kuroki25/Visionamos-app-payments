import type { INestApplication } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import type { Express } from 'express';
import { json, urlencoded } from 'express';

import { BETTER_AUTH_INSTANCE } from './better-auth.token';
import type { BetterAuthInstance } from './better-auth.factory';

/**
 * Mounts Better Auth's own HTTP handler at `/api/auth/*` (its default
 * `basePath`, unchanged — `better-auth.factory.ts`) — the native transport,
 * not a hand-written wrapper controller (docs/adr/013-better-auth-migration.md,
 * "Integración con NestJS", revised). `/api/v1/*` (the global prefix,
 * `configure-app.ts`) stays entirely NestJS-owned; `/api/auth/*` is a
 * separate, deliberately un-prefixed namespace Better Auth owns outright.
 *
 * Requires `NestFactory.create(AppModule, { bodyParser: false })` — Better
 * Auth reads the raw request body itself; Nest's automatic body-parser
 * would otherwise consume the stream first and leave Better Auth's handler
 * with nothing to read (the official Express integration guidance:
 * "don't use express.json() before the Better Auth handler"). Because
 * `bodyParser: false` disables Nest's parser for *every* route, this
 * function re-registers `json()`/`urlencoded()` immediately after mounting
 * the Better Auth handler, so `/api/v1/*` controllers keep working exactly
 * as before — the net effect for them is unchanged, only *who* calls
 * `express.json()` and *when* is different.
 *
 * Called once by `configureApp()` (shared by `main.ts` and every
 * `test/*.e2e-spec.ts`) — never call this directly, call `configureApp`.
 */
export function mountBetterAuthHandler(app: INestApplication): void {
  const auth = app.get<BetterAuthInstance>(BETTER_AUTH_INSTANCE);
  const expressApp = app.getHttpAdapter().getInstance() as Express;

  expressApp.use('/api/auth', toNodeHandler(auth));
  expressApp.use(json());
  expressApp.use(urlencoded({ extended: true }));
}
