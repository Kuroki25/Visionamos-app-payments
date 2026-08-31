import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import type { Env } from '../src/config/env.schema';
import { TestSession } from './helpers/http';
import { seedSuperadmin } from './helpers/seed-superadmin';

/**
 * Covers the role-creation matrix and BOLA/BFLA for the users/role-assignments
 * modules (docs/adr/011 §4/§5). Portal/Commerce fixtures are created through
 * the real HTTP API (as a logged-in SUPERADMIN) rather than seeded directly,
 * so this suite exercises the actual authorization chain end-to-end.
 */
describe('users & roles (integration)', () => {
  let app: INestApplication;
  let superadmin: TestSession;
  let portalAId: string;
  let portalBId: string;
  let commerceAId: string;
  let commerceBId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app, app.get(ConfigService<Env, true>));
    await app.init();

    const seeded = await seedSuperadmin(app);
    superadmin = await TestSession.create(app.getHttpServer());
    await superadmin.login(seeded.email, seeded.password);

    const portalA = await superadmin.post('/api/v1/portals').send({ name: `Portal A ${Date.now()}` });
    portalAId = portalA.body.id;
    const portalB = await superadmin.post('/api/v1/portals').send({ name: `Portal B ${Date.now()}` });
    portalBId = portalB.body.id;

    const categoryA = await superadmin.post(`/api/v1/portals/${portalAId}/categories`).send({ name: 'Educación' });
    const categoryB = await superadmin.post(`/api/v1/portals/${portalBId}/categories`).send({ name: 'Educación' });

    const commerceA = await superadmin.post(`/api/v1/portals/${portalAId}/commerces`).send({
      categoryId: categoryA.body.id,
      tradeName: 'Universidad A',
      legalName: 'Universidad A S.A.S.',
      taxId: `900${Date.now()}A`,
      contactName: 'Carlos',
      contactEmail: 'carlos@example.com',
      contactPhone: '3000000000',
      address: 'Calle 1',
      city: 'Bogotá',
    });
    commerceAId = commerceA.body.id;

    const commerceB = await superadmin.post(`/api/v1/portals/${portalBId}/commerces`).send({
      categoryId: categoryB.body.id,
      tradeName: 'Universidad B',
      legalName: 'Universidad B S.A.S.',
      taxId: `900${Date.now()}B`,
      contactName: 'Diana',
      contactEmail: 'diana@example.com',
      contactPhone: '3000000001',
      address: 'Calle 2',
      city: 'Medellín',
    });
    commerceBId = commerceB.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createUser(session: TestSession, overrides: Record<string, unknown>) {
    return session.post('/api/v1/users').send({
      email: `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      password: 'a-strong-password-123',
      fullName: 'Test User',
      ...overrides,
    });
  }

  it('SUPERADMIN creates an ADMIN_PORTAL for Portal A', async () => {
    const res = await createUser(superadmin, { role: 'ADMIN_PORTAL', scopePortalId: portalAId });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ role: 'ADMIN_PORTAL', scopePortalId: portalAId });
  });

  describe('ADMIN_PORTAL(A) creation authority', () => {
    let adminPortalA: TestSession;
    let adminPortalAEmail: string;
    let adminPortalAPassword: string;

    beforeAll(async () => {
      adminPortalAEmail = `admin-portal-a-${Date.now()}@example.com`;
      adminPortalAPassword = 'a-strong-password-123';
      const createRes = await createUser(superadmin, {
        email: adminPortalAEmail,
        password: adminPortalAPassword,
        role: 'ADMIN_PORTAL',
        scopePortalId: portalAId,
      });
      expect(createRes.status).toBe(201);

      adminPortalA = await TestSession.create(app.getHttpServer());
      const loginRes = await adminPortalA.login(adminPortalAEmail, adminPortalAPassword);
      expect(loginRes.status).toBe(200);
    });

    it('cannot create another ADMIN_PORTAL (no privilege escalation)', async () => {
      const res = await createUser(adminPortalA, { role: 'ADMIN_PORTAL', scopePortalId: portalAId });
      expect(res.status).toBe(403);
    });

    it('cannot create an ADMIN_COMMERCE for a commerce in a different portal (cross-portal BOLA)', async () => {
      const res = await createUser(adminPortalA, { role: 'ADMIN_COMMERCE', scopeCommerceId: commerceBId });
      expect(res.status).toBe(403);
    });

    it('can create an ADMIN_COMMERCE for a commerce inside their own portal', async () => {
      const res = await createUser(adminPortalA, { role: 'ADMIN_COMMERCE', scopeCommerceId: commerceAId });
      expect(res.status).toBe(201);
    });

    it('can create a VIEWER scoped to their own portal', async () => {
      const res = await createUser(adminPortalA, { role: 'VIEWER', scopePortalId: portalAId });
      expect(res.status).toBe(201);
    });

    it('cannot read a commerce belonging to a different portal (BOLA)', async () => {
      const res = await adminPortalA.get(`/api/v1/commerces/${commerceBId}`);
      expect(res.status).toBe(403);
    });

    it('can read a commerce belonging to their own portal', async () => {
      const res = await adminPortalA.get(`/api/v1/commerces/${commerceAId}`);
      expect(res.status).toBe(200);
    });

    it('cannot publish a portal it does not own (BOLA)', async () => {
      const res = await adminPortalA.patch(`/api/v1/portals/${portalBId}/publish`);
      expect(res.status).toBe(403);
    });

    it('cannot reassign a scope — SUPERADMIN only', async () => {
      const res = await adminPortalA.patch(`/api/v1/users/does-not-matter/role-assignment`).send({
        role: 'VIEWER',
        scopeType: 'GLOBAL',
      });
      expect(res.status).toBe(403);
    });
  });

  describe('ADMIN_COMMERCE creation authority', () => {
    let adminCommerce: TestSession;

    beforeAll(async () => {
      const email = `admin-commerce-${Date.now()}@example.com`;
      const password = 'a-strong-password-123';
      const createRes = await createUser(superadmin, {
        email,
        password,
        role: 'ADMIN_COMMERCE',
        scopeCommerceId: commerceAId,
      });
      expect(createRes.status).toBe(201);

      adminCommerce = await TestSession.create(app.getHttpServer());
      const loginRes = await adminCommerce.login(email, password);
      expect(loginRes.status).toBe(200);
    });

    it('cannot create another ADMIN_COMMERCE (no privilege escalation)', async () => {
      const res = await createUser(adminCommerce, { role: 'ADMIN_COMMERCE', scopeCommerceId: commerceAId });
      expect(res.status).toBe(403);
    });

    it('cannot create a VIEWER for a different commerce', async () => {
      const res = await createUser(adminCommerce, { role: 'VIEWER', scopeCommerceId: commerceBId });
      expect(res.status).toBe(403);
    });

    it('can create a VIEWER for its own commerce', async () => {
      const res = await createUser(adminCommerce, { role: 'VIEWER', scopeCommerceId: commerceAId });
      expect(res.status).toBe(201);
    });
  });

  describe('VIEWER has no creation rights', () => {
    it('POST /users returns 403 for a VIEWER (BFLA)', async () => {
      const email = `viewer-${Date.now()}@example.com`;
      const password = 'a-strong-password-123';
      const createRes = await createUser(superadmin, { email, password, role: 'VIEWER', scopePortalId: portalAId });
      expect(createRes.status).toBe(201);

      const viewerSession = await TestSession.create(app.getHttpServer());
      await viewerSession.login(email, password);

      const res = await createUser(viewerSession, { role: 'VIEWER', scopePortalId: portalAId });
      expect(res.status).toBe(403);
    });
  });

  describe('role reassignment', () => {
    it('SUPERADMIN reassigns an ADMIN_PORTAL from Portal A to Portal B, auditably', async () => {
      const createRes = await createUser(superadmin, { role: 'ADMIN_PORTAL', scopePortalId: portalAId });
      const userId = createRes.body.id;

      const reassignRes = await superadmin
        .patch(`/api/v1/users/${userId}/role-assignment`)
        .send({ role: 'ADMIN_PORTAL', scopeType: 'PORTAL', scopePortalId: portalBId });

      expect(reassignRes.status).toBe(200);
      expect(reassignRes.body.scopePortalId).toBe(portalBId);

      const userAfter = await superadmin.get(`/api/v1/users/${userId}`);
      expect(userAfter.body.scopePortalId).toBe(portalBId);
    });
  });

  it('DELETE /commerces/:id does not exist — a commerce is never physically deleted in this phase', async () => {
    const res = await superadmin.delete(`/api/v1/commerces/${commerceAId}`);
    expect(res.status).toBe(404);
  });
});
