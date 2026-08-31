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

describe('api (integration) — foundation: health, CSRF, JWT guard, auth lifecycle', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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

  it('a mutating request without a matching CSRF header/cookie returns 403', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever-not-real-12345' });
    expect(response.status).toBe(403);
  });

  it('POST /api/v1/auth/register no longer exists — there is no public self-registration in Red Coopagos', async () => {
    const session = await TestSession.create(app.getHttpServer());
    const response = await session
      .post('/api/v1/auth/register')
      .send({ email: 'x@example.com', password: 'a-strong-password-123', fullName: 'X' });
    expect(response.status).toBe(404);
  });

  describe('login → me → refresh → logout, with a seeded SUPERADMIN', () => {
    let session: TestSession;
    let superadmin: Awaited<ReturnType<typeof seedSuperadmin>>;

    beforeAll(async () => {
      superadmin = await seedSuperadmin(app);
      session = await TestSession.create(app.getHttpServer());
    });

    it('POST /auth/login with valid credentials returns 200, the user, and session cookies', async () => {
      const res = await session.login(superadmin.email, superadmin.password);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ email: superadmin.email, role: 'SUPERADMIN', scopeType: 'GLOBAL', status: 'ACTIVE' });
      expect(res.body).not.toHaveProperty('passwordHash');
      expect(extractCookie(res, 'access_token')).toEqual(expect.any(String));
      expect(extractCookie(res, 'refresh_token')).toEqual(expect.any(String));
    });

    it('GET /auth/me returns the authenticated user using the session cookie', async () => {
      const res = await session.get('/api/v1/auth/me');
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(superadmin.email);
      expect(res.body.role).toBe('SUPERADMIN');
    });

    it('POST /auth/refresh rotates the refresh token and re-resolves role/scope', async () => {
      const res = await session.post('/api/v1/auth/refresh');
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(superadmin.email);
      expect(extractCookie(res, 'access_token')).toEqual(expect.any(String));
    });

    it('POST /auth/logout clears the session and revokes the refresh token', async () => {
      const res = await session.post('/api/v1/auth/logout');
      expect(res.status).toBe(204);

      const meAfterLogout = await session.get('/api/v1/auth/me');
      expect(meAfterLogout.status).toBe(401);
    });
  });

  describe('login with wrong credentials', () => {
    it('returns a generic 401 that does not reveal whether the account exists', async () => {
      const session = await TestSession.create(app.getHttpServer());
      const res = await session.login('someone-who-does-not-exist@example.com', 'whatever-12345');

      expect(res.status).toBe(401);
      expect(res.body.detail).toBe('Invalid email or password.');
    });

    it('a deactivated account gets the same generic 401 (no account-status leak)', async () => {
      const superadmin = await seedSuperadmin(app);
      const session = await TestSession.create(app.getHttpServer());

      // Deactivate directly (no admin exists above this SUPERADMIN to do it via API).
      const dataSource = app.get<DataSource>(getDataSourceToken());
      await dataSource.getRepository(UserEntity).update({ id: superadmin.id }, { status: 'INACTIVE' });

      const res = await session.login(superadmin.email, superadmin.password);
      expect(res.status).toBe(401);
      expect(res.body.detail).toBe('Invalid email or password.');
    });
  });
});
