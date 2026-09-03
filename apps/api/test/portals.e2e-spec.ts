import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import type { Env } from '../src/config/env.schema';
import { TestSession } from './helpers/http';
import { PORTAL_FIXTURE_FIELDS } from './helpers/portal-fixture';
import { seedSuperadmin } from './helpers/seed-superadmin';

/**
 * `POST /portals` — the `status` field added in
 * docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md §17.5 (Slice 3, "Portal
 * activo" toggle on create) and the guard that keeps `PATCH /portals/:id`
 * (plain edit) from being able to silently change it — only
 * `PATCH /portals/:id/status` may, because that's the one that audits
 * `PORTAL_ACTIVATED`/`PORTAL_DEACTIVATED` (`PortalsService.updateStatus`).
 * Also `displayName`/`serviceType`/`description` (now required, §17.2) and
 * the logo upload/serve endpoints (§17.2 — local disk storage).
 */
describe('portals — status, fields, and logo on create (integration)', () => {
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
    const res = await superadmin
      .post('/api/v1/portals')
      .send({ name: `Portal Default ${Date.now()}`, ...PORTAL_FIXTURE_FIELDS });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ACTIVE');
  });

  it('creates INACTIVE when the caller sends status explicitly', async () => {
    const res = await superadmin
      .post('/api/v1/portals')
      .send({ name: `Portal Inactive ${Date.now()}`, status: 'INACTIVE', ...PORTAL_FIXTURE_FIELDS });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('INACTIVE');
  });

  it('rejects creation missing displayName/serviceType/description — real business fields, not decorative (§17.2)', async () => {
    const res = await superadmin.post('/api/v1/portals').send({ name: `Portal Sin Campos ${Date.now()}` });
    expect(res.status).toBe(400);
  });

  it('persists displayName/serviceType/description for real, returned on both create and a fresh GET', async () => {
    const createRes = await superadmin.post('/api/v1/portals').send({
      name: `Portal Completo ${Date.now()}`,
      displayName: 'Plataforma Completa',
      serviceType: 'Salud',
      description: 'Descripción real del portal, no inventada.',
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({
      displayName: 'Plataforma Completa',
      serviceType: 'Salud',
      description: 'Descripción real del portal, no inventada.',
      logoUrl: null,
    });

    const getRes = await superadmin.get(`/api/v1/portals/${createRes.body.id}`);
    expect(getRes.body).toMatchObject({ displayName: 'Plataforma Completa', serviceType: 'Salud' });
  });

  it('PATCH /portals/:id (plain edit) ignores a status field in the body instead of changing it', async () => {
    const createRes = await superadmin
      .post('/api/v1/portals')
      .send({ name: `Portal Edit Guard ${Date.now()}`, ...PORTAL_FIXTURE_FIELDS });
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
    const createRes = await superadmin
      .post('/api/v1/portals')
      .send({ name: `Portal Real Toggle ${Date.now()}`, ...PORTAL_FIXTURE_FIELDS });
    const portalId = createRes.body.id;

    const statusRes = await superadmin.patch(`/api/v1/portals/${portalId}/status`).send({ status: 'INACTIVE' });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe('INACTIVE');
  });

  describe('logo upload/serve (local disk storage, §17.2)', () => {
    // A real, minimal 1x1 transparent PNG — real magic bytes (`89 50 4E 47
    // 0D 0A 1A 0A ...`), not a fake/renamed file. A second, different PNG
    // (1x1 red) proves a re-upload really replaces the served bytes, not
    // just the row.
    const ONE_PX_TRANSPARENT_PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    const ONE_PX_RED_PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );

    async function createPortal(name: string) {
      const res = await superadmin.post('/api/v1/portals').send({ name, ...PORTAL_FIXTURE_FIELDS });
      expect(res.status).toBe(201);
      return res.body.id as string;
    }

    it('uploads a real PNG, and GET serves back the exact same bytes with the right Content-Type', async () => {
      const portalId = await createPortal(`Portal Logo ${Date.now()}`);

      const uploadRes = await superadmin
        .post(`/api/v1/portals/${portalId}/logo`)
        .attach('logo', ONE_PX_TRANSPARENT_PNG, 'logo.png');
      expect(uploadRes.status).toBe(201);
      expect(uploadRes.body.logoUrl).toBe(`/portals/${portalId}/logo`);

      const getRes = await superadmin.get(`/api/v1/portals/${portalId}/logo`);
      expect(getRes.status).toBe(200);
      expect(getRes.headers['content-type']).toBe('image/png');
      expect(Buffer.compare(getRes.body as Buffer, ONE_PX_TRANSPARENT_PNG)).toBe(0);
    });

    it('re-uploading replaces the served logo for real, not just the row', async () => {
      const portalId = await createPortal(`Portal Logo Replace ${Date.now()}`);
      await superadmin.post(`/api/v1/portals/${portalId}/logo`).attach('logo', ONE_PX_TRANSPARENT_PNG, 'logo.png');
      await superadmin.post(`/api/v1/portals/${portalId}/logo`).attach('logo', ONE_PX_RED_PNG, 'logo2.png');

      const getRes = await superadmin.get(`/api/v1/portals/${portalId}/logo`);
      expect(Buffer.compare(getRes.body as Buffer, ONE_PX_RED_PNG)).toBe(0);
      expect(Buffer.compare(getRes.body as Buffer, ONE_PX_TRANSPARENT_PNG)).not.toBe(0);
    });

    it('rejects a non-image file even when it claims to be a PNG (real magic-byte check, not just the client Content-Type)', async () => {
      const portalId = await createPortal(`Portal Logo Spoof ${Date.now()}`);

      const res = await superadmin
        .post(`/api/v1/portals/${portalId}/logo`)
        .attach('logo', Buffer.from('this is definitely not a PNG'), { filename: 'logo.png', contentType: 'image/png' });
      expect(res.status).toBe(400);

      const afterRes = await superadmin.get(`/api/v1/portals/${portalId}`);
      expect(afterRes.body.logoUrl).toBeNull();
    });

    it('GET /portals/:id/logo is real 404, not a broken image, when no logo was ever uploaded', async () => {
      const portalId = await createPortal(`Portal Sin Logo ${Date.now()}`);
      const res = await superadmin.get(`/api/v1/portals/${portalId}/logo`);
      expect(res.status).toBe(404);
    });

    it('ADMIN_PORTAL cannot upload a logo to a portal outside their scope (BOLA)', async () => {
      const ownPortalId = await createPortal(`Portal Propio Logo ${Date.now()}`);
      const otherPortalId = await createPortal(`Portal Ajeno Logo ${Date.now()}`);

      const email = `admin-portal-logo-${Date.now()}@example.com`;
      const createUserRes = await superadmin
        .post('/api/v1/users')
        .send({ email, fullName: 'Admin Portal Logo', role: 'ADMIN_PORTAL', scopePortalId: ownPortalId });
      const adminPortal = await TestSession.create(app.getHttpServer());
      await adminPortal.login(email, createUserRes.body.temporaryPassword);

      const res = await adminPortal
        .post(`/api/v1/portals/${otherPortalId}/logo`)
        .attach('logo', ONE_PX_TRANSPARENT_PNG, 'logo.png');
      expect(res.status).toBe(403);
    });
  });
});
