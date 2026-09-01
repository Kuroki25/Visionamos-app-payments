import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import type { Env } from '../src/config/env.schema';
import { UserEntity } from '../src/modules/users/entities/user.entity';
import { extractCookie, TestSession } from './helpers/http';
import { seedSuperadmin } from './helpers/seed-superadmin';

describe('api (integration) — foundation: health, CSRF, Better Auth session lifecycle', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureApp(app, app.get(ConfigService<Env, true>));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health is reachable without authentication and returns status ok', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('a protected endpoint without an access token returns 401', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/users/00000000-0000-0000-0000-000000000000',
    );
    expect(response.status).toBe(401);
    expect(response.headers['content-type']).toContain('application/problem+json');
  });

  it('a mutating request without a matching CSRF header/cookie returns 403, even authenticated with the right role', async () => {
    // CsrfGuard runs last in the APP_GUARD chain (ThrottlerGuard →
    // BetterAuthSessionGuard → RolesGuard → CsrfGuard) — an unauthenticated
    // request would 401 before ever reaching it, so this must use a real,
    // authenticated, correctly-scoped session to actually exercise CsrfGuard
    // in isolation. (Before the cutover this used the now-retired public
    // `POST /api/v1/auth/login` instead — there is no public POST route left
    // to borrow for this anymore, which is itself expected: Better Auth's
    // own `/api/auth/*` is a separate namespace CsrfGuard never covers.)
    const session = await TestSession.create(app.getHttpServer());
    const superadmin = await seedSuperadmin(app);
    await session.login(superadmin.email, superadmin.password);

    const response = await session.agent
      .post('/api/v1/portals')
      .send({ name: `CSRF probe portal ${Date.now()}` });
    expect(response.status).toBe(403);
  });

  it('POST /api/v1/auth/register no longer exists — there is no public self-registration in Red Coopagos', async () => {
    const session = await TestSession.create(app.getHttpServer());
    const response = await session
      .post('/api/v1/auth/register')
      .send({ email: 'x@example.com', password: 'a-strong-password-123', fullName: 'X' });
    expect(response.status).toBe(404);
  });

  /**
   * Rewritten for the cutover (docs/adr/013-better-auth-migration.md,
   * docs/backend/authentication/BETTER_AUTH_CUTOVER_SOURCE_OF_TRUTH.md) —
   * `session.login()`/`session.logout()` now go through Better Auth's own
   * HTTP surface (`/api/auth/sign-in/email`, `/api/auth/sign-out`), not the
   * legacy `/api/v1/auth/*` endpoints (still present, still reachable, but
   * their cookies mean nothing to `BetterAuthSessionGuard` — the JWT
   * retirement pass removes them once this suite and Fase 7's rehearsal
   * suite both stay green). No `/auth/refresh` equivalent: Better Auth's
   * server-side session model has no separate refresh step for this flow.
   */
  describe('login → me → logout, with a seeded SUPERADMIN', () => {
    let session: TestSession;
    let superadmin: Awaited<ReturnType<typeof seedSuperadmin>>;

    beforeAll(async () => {
      superadmin = await seedSuperadmin(app);
      session = await TestSession.create(app.getHttpServer());
    });

    it('POST /api/auth/sign-in/email with valid credentials returns 200, the Better Auth user, and a session cookie', async () => {
      const res = await session.login(superadmin.email, superadmin.password);

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ email: superadmin.email });
      expect(res.body.user).not.toHaveProperty('password');
      expect(extractCookie(res, 'better-auth.session_token')).toEqual(expect.any(String));
    });

    it('GET /api/v1/auth/me resolves the AppUser (role/scope), not Better Auth\'s own user shape', async () => {
      const res = await session.get('/api/v1/auth/me');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ email: superadmin.email, role: 'SUPERADMIN', scopeType: 'GLOBAL', status: 'ACTIVE' });
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('POST /api/auth/sign-out invalidates the session immediately (AUTH-01 fix — see Fase 7 rehearsal for the original proof)', async () => {
      const res = await session.logout();
      expect(res.status).toBe(200);

      const meAfterLogout = await session.get('/api/v1/auth/me');
      expect(meAfterLogout.status).toBe(401);
    });
  });

  describe('login with wrong credentials', () => {
    it('a nonexistent account is rejected (Better Auth\'s own error shape, not AllExceptionsFilter — that filter never sees this route)', async () => {
      const session = await TestSession.create(app.getHttpServer());
      const res = await session.login('someone-who-does-not-exist@example.com', 'whatever-12345');

      expect(res.status).toBe(401);
    });

    it('the real password on a deactivated account still signs in at Better Auth\'s level (it has no concept of AppUser.status) — but the very next authenticated request is rejected, because BetterAuthSessionGuard checks status on every request, not just at login', async () => {
      const superadmin = await seedSuperadmin(app);
      const session = await TestSession.create(app.getHttpServer());

      // Deactivate directly (no admin exists above this SUPERADMIN to do it via API).
      const dataSource = app.get<DataSource>(getDataSourceToken());
      await dataSource.getRepository(UserEntity).update({ id: superadmin.id }, { status: 'INACTIVE' });

      const loginRes = await session.login(superadmin.email, superadmin.password);
      expect(loginRes.status).toBe(200);

      const meRes = await session.get('/api/v1/auth/me');
      expect(meRes.status).toBe(401);
    });
  });
});
