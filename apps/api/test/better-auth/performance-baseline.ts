/**
 * Fase 8 (docs/auth-migration/08-performance-baseline.md) — measures the
 * one trade-off ADR 013 flagged as "pending, not assumed": swapping the
 * stateless-JWT `JwtAuthGuard` (verifies a signature, zero DB reads) for
 * `BetterAuthSessionGuard` (a real session lookup + two extra reads —
 * `users`, `role_assignments`) costs latency per authenticated request in
 * exchange for fixing AUTH-01 (immediate revocation). This script measures
 * both against the SAME real Postgres, the SAME endpoint
 * (`GET /api/v1/auth/me`), the SAME account, so the delta reflects the
 * guard's own cost — not network/JSON/routing noise, which both scenarios
 * share equally.
 *
 * Not a Jest spec on purpose — timing measurements are cleaner without
 * Jest's own instrumentation overhead in the loop. Run with
 * `pnpm perf:auth-cutover-rehearsal` (needs Docker up, `NODE_ENV=development`
 * so DatabaseModule connects to real Postgres, not SQLite).
 */
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/config/configure-app';
import type { Env } from '../../src/config/env.schema';
import { TestSession } from '../helpers/http';
import type { BetterAuthInstance } from '../../src/infra/better-auth/better-auth.factory';
import { BETTER_AUTH_INSTANCE } from '../../src/infra/better-auth/better-auth.token';
import { RehearsalAppModule } from './rehearsal-app.module';
import { signInAndGetSessionCookie } from './session-helper';

// Kept under the app's own default rate limit (THROTTLE_LIMIT=100 per
// THROTTLE_TTL_MS=60s, env.schema.ts) — each scenario boots its own fresh
// app instance (its own in-memory ThrottlerGuard counter), so 60 total
// requests per scenario stays safely under that ceiling without needing to
// override the app's real throttling config for this measurement.
const ITERATIONS = 50;
const WARMUP = 10;
const DEMO_PASSWORD = 'a-strong-password-123'; // seed-demo.ts — already public, not a real secret.

interface Stats {
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}

function computeStats(timingsMs: number[]): Stats {
  const sorted = [...timingsMs].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const pick = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]!;
  return {
    mean: sum / sorted.length,
    p50: pick(0.5),
    p95: pick(0.95),
    p99: pick(0.99),
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
  };
}

async function measureRequests(fn: () => Promise<number>, iterations: number, warmup: number): Promise<Stats> {
  for (let i = 0; i < warmup; i++) {
    const status = await fn();
    if (status !== 200) throw new Error(`Warm-up request returned ${status}, expected 200 — aborting benchmark.`);
  }

  const timingsMs: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    const status = await fn();
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
    if (status !== 200) throw new Error(`Request ${i} returned ${status}, expected 200 — aborting benchmark.`);
    timingsMs.push(elapsedMs);
  }
  return computeStats(timingsMs);
}

function printStats(label: string, stats: Stats): void {
  // eslint-disable-next-line no-console -- benchmark script output, not a leftover debug log.
  console.log(
    `${label}: mean=${stats.mean.toFixed(2)}ms p50=${stats.p50.toFixed(2)}ms ` +
      `p95=${stats.p95.toFixed(2)}ms p99=${stats.p99.toFixed(2)}ms min=${stats.min.toFixed(2)}ms max=${stats.max.toFixed(2)}ms`,
  );
}

/**
 * HISTORICAL — captured the real before/after numbers now recorded in
 * docs/auth-migration/08-performance-baseline.md, before the cutover
 * (docs/adr/013) replaced `JwtAuthGuard` with `BetterAuthSessionGuard` in
 * `app.module.ts` for real. Left as-is for the record, but **this scenario
 * no longer runs correctly**: `AppModule` no longer wires `JwtAuthGuard` at
 * all, so `GET /auth/me` here now goes through `BetterAuthSessionGuard`
 * too (a legacy JWT login still succeeds — `AuthController.login` stays
 * `@Public()` until the JWT retirement pass — but the cookie it sets means
 * nothing to the guard that actually runs now), and every request in this
 * function will 401. Slated for removal alongside the rest of the JWT
 * legacy code, not before — see docs/backend/authentication/BETTER_AUTH_CUTOVER_SOURCE_OF_TRUTH.md.
 */
async function measureJwtGuard(): Promise<Stats> {
  const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app: INestApplication = moduleFixture.createNestApplication({ bodyParser: false });
  configureApp(app, app.get(ConfigService<Env, true>));
  await app.init();

  try {
    // Reuses the SAME real seed-demo.ts account as measureBetterAuthGuard()
    // (not test/helpers/seed-superadmin.ts, which inserts a brand-new random
    // user every call — fine for the throwaway SQLite suite, but this
    // script runs against real Postgres and must not leave extra rows
    // behind in the user's actual development data).
    const session = await TestSession.create(app.getHttpServer());
    const loginRes = await session.login('superadmin@example.com', DEMO_PASSWORD);
    if (loginRes.status !== 200) {
      throw new Error(`Login as superadmin@example.com failed (${loginRes.status}) — is seed-demo.ts data present?`);
    }

    return await measureRequests(async () => {
      const res = await session.get('/api/v1/auth/me');
      return res.status;
    }, ITERATIONS, WARMUP);
  } finally {
    await app.close();
  }
}

async function measureBetterAuthGuard(): Promise<Stats> {
  const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [RehearsalAppModule] }).compile();
  const app: INestApplication = moduleFixture.createNestApplication({ bodyParser: false });
  configureApp(app, app.get(ConfigService<Env, true>));
  await app.init();

  try {
    const auth = app.get<BetterAuthInstance>(BETTER_AUTH_INSTANCE);
    const cookie = await signInAndGetSessionCookie(auth, 'superadmin@example.com', DEMO_PASSWORD);
    const agent = request.agent(app.getHttpServer());

    return await measureRequests(async () => {
      const res = await agent.get('/api/v1/auth/me').set('Cookie', cookie);
      return res.status;
    }, ITERATIONS, WARMUP);
  } finally {
    await app.close();
  }
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`Fase 8 baseline — ${ITERATIONS} requests each (${WARMUP} warm-up, discarded), GET /api/v1/auth/me\n`);

  const jwtStats = await measureJwtGuard();
  printStats('JwtAuthGuard   (current, stateless)      ', jwtStats);

  const betterAuthStats = await measureBetterAuthGuard();
  printStats('BetterAuthSessionGuard (new, 2 DB reads)  ', betterAuthStats);

  const deltaMs = betterAuthStats.mean - jwtStats.mean;
  const deltaPct = (deltaMs / jwtStats.mean) * 100;
  // eslint-disable-next-line no-console
  console.log(`\nDelta (mean): ${deltaMs >= 0 ? '+' : ''}${deltaMs.toFixed(2)}ms (${deltaPct.toFixed(1)}%)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
