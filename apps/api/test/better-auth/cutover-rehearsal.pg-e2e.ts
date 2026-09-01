import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { DataSource } from 'typeorm';

import { configureApp } from '../../src/config/configure-app';
import type { Env } from '../../src/config/env.schema';
import type { BetterAuthInstance } from '../../src/infra/better-auth/better-auth.factory';
import { BETTER_AUTH_INSTANCE } from '../../src/infra/better-auth/better-auth.token';
import { signInAndGetSessionCookie, signOutSession } from './session-helper';
import { RehearsalAppModule } from './rehearsal-app.module';

/**
 * Fase 7 rehearsal (docs/auth-migration/07-cutover-rehearsal.md) — the real
 * business controllers of `AppModule`, completely unmodified, served with
 * `JwtAuthGuard` swapped for `BetterAuthSessionGuard` (the exact swap Fase
 * 10 cutover will make). Every assertion below runs against the REAL
 * `seed-demo.ts` fixtures already migrated to Better Auth
 * (docs/auth-migration/06-real-migration-run.md), on the real development
 * Postgres — not SQLite, not mocks. Requires Docker up and
 * `pnpm migrate:better-auth-users` already run. Run with
 * `pnpm test:auth-cutover-rehearsal`.
 *
 * Only `JwtAuthGuard`'s provider is overridden — `RolesGuard`, `CsrfGuard`,
 * `ScopeAuthorizationService`, and every controller/service are exactly
 * what runs in production today. A failure here means Better Auth
 * integration broke something real, not a fixture mismatch.
 */
describe('Better Auth cutover rehearsal (real Postgres, real seed-demo.ts fixtures)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let auth: BetterAuthInstance;

  let avanzaPortalId: string;
  let otrahuilcaPortalId: string;
  let universidadAvanzaCommerceId: string;
  let hotelAvanzaCommerceId: string;

  let superadminCookie: string;
  let adminAvanzaCookie: string;
  let adminOtrahuilcaCookie: string;
  let adminCommerceCookie: string;
  let viewerAvanzaCookie: string;

  const DEMO_PASSWORD = 'a-strong-password-123'; // seed-demo.ts — already printed by that script, not a real secret.

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [RehearsalAppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureApp(app, app.get(ConfigService<Env, true>));
    await app.init();

    dataSource = app.get(getDataSourceToken());
    auth = app.get(BETTER_AUTH_INSTANCE);

    const portals: { id: string; name: string }[] = await dataSource.query(
      `SELECT id, name FROM portals WHERE name IN ('Avanza', 'Otrahuilca')`,
    );
    avanzaPortalId = portals.find((p) => p.name === 'Avanza')!.id;
    otrahuilcaPortalId = portals.find((p) => p.name === 'Otrahuilca')!.id;

    const commerces: { id: string; trade_name: string }[] = await dataSource.query(
      `SELECT id, trade_name FROM commerces WHERE trade_name IN ('Universidad Avanza', 'Hotel Avanza Plaza')`,
    );
    universidadAvanzaCommerceId = commerces.find((c) => c.trade_name === 'Universidad Avanza')!.id;
    hotelAvanzaCommerceId = commerces.find((c) => c.trade_name === 'Hotel Avanza Plaza')!.id;

    superadminCookie = await signInAndGetSessionCookie(auth, 'superadmin@example.com', DEMO_PASSWORD);
    adminAvanzaCookie = await signInAndGetSessionCookie(auth, 'admin.avanza@example.com', DEMO_PASSWORD);
    adminOtrahuilcaCookie = await signInAndGetSessionCookie(auth, 'admin.otrahuilca@example.com', DEMO_PASSWORD);
    adminCommerceCookie = await signInAndGetSessionCookie(auth, 'admin.universidad-avanza@example.com', DEMO_PASSWORD);
    viewerAvanzaCookie = await signInAndGetSessionCookie(auth, 'viewer.avanza@example.com', DEMO_PASSWORD);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication (the only thing this migration changes)', () => {
    it('rejects a request with no session cookie at all', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('rejects a garbage/tampered session cookie', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', 'better-auth.session_token=not-a-real-session-value');
      expect(res.status).toBe(401);
    });

    it('resolves the correct identity from a real session — GET /auth/me', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', superadminCookie);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('superadmin@example.com');
    });
  });

  describe('BOLA — cross-portal (ADMIN_PORTAL)', () => {
    it('ADMIN_PORTAL(Avanza) can read their own portal', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/portals/${avanzaPortalId}`)
        .set('Cookie', adminAvanzaCookie);
      expect(res.status).toBe(200);
    });

    it('ADMIN_PORTAL(Avanza) is blocked from a different portal', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/portals/${otrahuilcaPortalId}`)
        .set('Cookie', adminAvanzaCookie);
      expect(res.status).toBe(403);
    });

    it('ADMIN_PORTAL(Otrahuilca) can read their own portal but not Avanza', async () => {
      const own = await request(app.getHttpServer())
        .get(`/api/v1/portals/${otrahuilcaPortalId}`)
        .set('Cookie', adminOtrahuilcaCookie);
      expect(own.status).toBe(200);

      const other = await request(app.getHttpServer())
        .get(`/api/v1/portals/${avanzaPortalId}`)
        .set('Cookie', adminOtrahuilcaCookie);
      expect(other.status).toBe(403);
    });
  });

  describe('BOLA — cross-commerce (ADMIN_COMMERCE), same portal', () => {
    it('ADMIN_COMMERCE can read their own commerce', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/commerces/${universidadAvanzaCommerceId}`)
        .set('Cookie', adminCommerceCookie);
      expect(res.status).toBe(200);
    });

    it('ADMIN_COMMERCE is blocked from a different commerce in the SAME portal', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/commerces/${hotelAvanzaCommerceId}`)
        .set('Cookie', adminCommerceCookie);
      expect(res.status).toBe(403);
    });
  });

  describe('BFLA — a spoofed role/identity header changes nothing', () => {
    it('VIEWER is still rejected from a SUPERADMIN-only route even with a forged role header', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-events')
        .set('Cookie', viewerAvanzaCookie)
        .set('X-Role', 'SUPERADMIN')
        .set('X-User-Role', 'SUPERADMIN');
      expect(res.status).toBe(403);
    });

    it('SUPERADMIN really can reach that same route (control case — 403 above is scope, not brokenness)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/audit-events').set('Cookie', superadminCookie);
      expect(res.status).toBe(200);
    });
  });

  describe('Session revocation is immediate — AUTH-01 fix proof', () => {
    it('a session works, then is rejected on the very next request after sign-out', async () => {
      const email = 'admin.otrahuilca@example.com';
      const cookie = await signInAndGetSessionCookie(auth, email, DEMO_PASSWORD);

      const before = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', cookie);
      expect(before.status).toBe(200);

      await signOutSession(auth, cookie);

      const after = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', cookie);
      expect(after.status).toBe(401);
    });
  });

  describe('Deactivation takes effect immediately, not after an access-token TTL', () => {
    const email = 'admin.otrahuilca@example.com';

    afterEach(async () => {
      // Restore real dev data regardless of assertion outcome.
      await dataSource.query(`UPDATE users SET status = 'ACTIVE' WHERE email = $1`, [email]);
    });

    it('a valid, non-revoked session is rejected the moment the profile is deactivated', async () => {
      const cookie = await signInAndGetSessionCookie(auth, email, DEMO_PASSWORD);

      const before = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', cookie);
      expect(before.status).toBe(200);

      await dataSource.query(`UPDATE users SET status = 'INACTIVE' WHERE email = $1`, [email]);

      // Better Auth's own session is still perfectly valid here — it knows
      // nothing about `status`. BetterAuthSessionGuard's own extra check
      // (docs/auth-migration/05-authorization-adapter.md) is what closes this.
      const after = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', cookie);
      expect(after.status).toBe(401);
    });
  });
});
