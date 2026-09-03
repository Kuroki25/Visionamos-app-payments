import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import type { Env } from '../src/config/env.schema';
import { TestSession } from './helpers/http';
import { seedSuperadmin } from './helpers/seed-superadmin';

/**
 * `POST /portals` — the `status` field added in
 * docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md §17.5 (Slice 3, "Portal
 * activo" toggle on create) and the guard that keeps `PATCH /portals/:id`
 * (plain edit) from being able to silently change it — only
 * `PATCH /portals/:id/status` may, because that's the one that audits
 * `PORTAL_ACTIVATED`/`PORTAL_DEACTIVATED` (`PortalsService.updateStatus`).
 */
describe('portals — status on create (integration)', () => {
  let app: INestApplication;
  let superadmin: TestSession;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureApp(app, app.get(ConfigService<Env, true>));
    await app.init();

    const seeded = await seedSuperadmin(app);
    superadmin = await TestSession.create(app.getHttpServer());
    await superadmin.login(seeded.email, seeded.password);
  });

  afterAll(async () => {
    await app.close();
  });

  it('defaults to ACTIVE when status is omitted', async () => {
    const res = await superadmin.post('/api/v1/portals').send({ name: `Portal Default ${Date.now()}` });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ACTIVE');
  });

  it('creates INACTIVE when the caller sends status explicitly', async () => {
    const res = await superadmin.post('/api/v1/portals').send({ name: `Portal Inactive ${Date.now()}`, status: 'INACTIVE' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('INACTIVE');
  });

  it('PATCH /portals/:id (plain edit) ignores a status field in the body instead of changing it', async () => {
    const createRes = await superadmin.post('/api/v1/portals').send({ name: `Portal Edit Guard ${Date.now()}` });
    expect(createRes.body.status).toBe('ACTIVE');
    const portalId = createRes.body.id;

    const editRes = await superadmin
      .patch(`/api/v1/portals/${portalId}`)
      .send({ name: 'Portal Edit Guard (renamed)', status: 'INACTIVE' });
    expect(editRes.status).toBe(200);
    // Zod strips the unknown `status` key from UpdatePortalSchema — the
    // plain edit path never sees it, so status is untouched.
    expect(editRes.body.status).toBe('ACTIVE');
    expect(editRes.body.name).toBe('Portal Edit Guard (renamed)');

    const afterRes = await superadmin.get(`/api/v1/portals/${portalId}`);
    expect(afterRes.body.status).toBe('ACTIVE');
  });

  it('PATCH /portals/:id/status (the dedicated, audited endpoint) does change it', async () => {
    const createRes = await superadmin.post('/api/v1/portals').send({ name: `Portal Real Toggle ${Date.now()}` });
    const portalId = createRes.body.id;

    const statusRes = await superadmin.patch(`/api/v1/portals/${portalId}/status`).send({ status: 'INACTIVE' });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe('INACTIVE');
  });
});
