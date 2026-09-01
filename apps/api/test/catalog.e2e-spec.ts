import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import type { Env } from '../src/config/env.schema';
import { TestSession } from './helpers/http';
import { seedSuperadmin } from './helpers/seed-superadmin';

/** Portal/Category/Commerce/Service CRUD, status/publish lifecycle, and the cross-table category↔portal invariant (docs/adr/011 §1, CommercesService). */
describe('catalog (integration)', () => {
  let app: INestApplication;
  let superadmin: TestSession;
  let portalId: string;
  let categoryId: string;
  let commerceId: string;

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

  describe('Portal', () => {
    it('POST /portals creates a portal, INACTIVE by default is false — starts ACTIVE and unpublished', async () => {
      const res = await superadmin.post('/api/v1/portals').send({ name: `Avanza ${Date.now()}` });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ status: 'ACTIVE', isPublished: false });
      portalId = res.body.id;
    });

    it('GET /portals/:id returns the portal', async () => {
      const res = await superadmin.get(`/api/v1/portals/${portalId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(portalId);
    });

    it('PATCH /portals/:id/publish sets isPublished true', async () => {
      const res = await superadmin.patch(`/api/v1/portals/${portalId}/publish`);
      expect(res.status).toBe(200);
      expect(res.body.isPublished).toBe(true);
    });

    it('PATCH /portals/:id/unpublish sets isPublished back to false', async () => {
      const res = await superadmin.patch(`/api/v1/portals/${portalId}/unpublish`);
      expect(res.status).toBe(200);
      expect(res.body.isPublished).toBe(false);
    });

    it('PATCH /portals/:id/status deactivates the portal', async () => {
      const res = await superadmin.patch(`/api/v1/portals/${portalId}/status`).send({ status: 'INACTIVE' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('INACTIVE');

      // Reactivate — later tests in this file assume an ACTIVE portal.
      await superadmin.patch(`/api/v1/portals/${portalId}/status`).send({ status: 'ACTIVE' });
    });

    it('POST /portals with a duplicate name returns 409', async () => {
      const name = `Duplicate Portal ${Date.now()}`;
      const first = await superadmin.post('/api/v1/portals').send({ name });
      expect(first.status).toBe(201);
      const second = await superadmin.post('/api/v1/portals').send({ name });
      expect(second.status).toBe(409);
    });
  });

  describe('Category', () => {
    it('POST /portals/:portalId/categories creates a category scoped to that portal', async () => {
      const res = await superadmin.post(`/api/v1/portals/${portalId}/categories`).send({ name: 'Instituciones educativas' });
      expect(res.status).toBe(201);
      expect(res.body.portalId).toBe(portalId);
      categoryId = res.body.id;
    });

    it('two different portals may each have a category with the same name', async () => {
      const otherPortal = await superadmin.post('/api/v1/portals').send({ name: `Otro Portal ${Date.now()}` });
      const res = await superadmin
        .post(`/api/v1/portals/${otherPortal.body.id}/categories`)
        .send({ name: 'Instituciones educativas' });
      expect(res.status).toBe(201);
    });

    it('the same name twice within the same portal returns 409', async () => {
      const res = await superadmin.post(`/api/v1/portals/${portalId}/categories`).send({ name: 'Instituciones educativas' });
      expect(res.status).toBe(409);
    });
  });

  describe('Commerce', () => {
    it('POST /portals/:portalId/commerces creates a commerce classified by a category of the same portal', async () => {
      const res = await superadmin.post(`/api/v1/portals/${portalId}/commerces`).send({
        categoryId,
        tradeName: 'Universidad X',
        legalName: 'Universidad X S.A.S.',
        taxId: `900${Date.now()}`,
        contactName: 'Carlos Pérez',
        contactEmail: 'carlos@universidadx.edu.co',
        contactPhone: '3001234567',
        address: 'Calle 1 # 2-3',
        city: 'Bogotá',
      });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ portalId, categoryId, status: 'ACTIVE', isPublished: false });
      expect(res.body).not.toHaveProperty('bankAccount');
      commerceId = res.body.id;
    });

    it('using a categoryId that belongs to a different portal returns 409', async () => {
      const otherPortal = await superadmin.post('/api/v1/portals').send({ name: `Portal Ajeno ${Date.now()}` });
      const otherCategory = await superadmin
        .post(`/api/v1/portals/${otherPortal.body.id}/categories`)
        .send({ name: 'Otra categoría' });

      const res = await superadmin.post(`/api/v1/portals/${portalId}/commerces`).send({
        categoryId: otherCategory.body.id,
        tradeName: 'Comercio Inválido',
        legalName: 'Comercio Inválido S.A.S.',
        taxId: `900${Date.now()}X`,
        contactName: 'Nadie',
        contactEmail: 'nadie@example.com',
        contactPhone: '3000000000',
        address: 'N/A',
        city: 'N/A',
      });
      expect(res.status).toBe(409);
    });

    it('PATCH /commerces/:id/publish and /unpublish toggle isPublished', async () => {
      const published = await superadmin.patch(`/api/v1/commerces/${commerceId}/publish`);
      expect(published.status).toBe(200);
      expect(published.body.isPublished).toBe(true);

      const unpublished = await superadmin.patch(`/api/v1/commerces/${commerceId}/unpublish`);
      expect(unpublished.status).toBe(200);
      expect(unpublished.body.isPublished).toBe(false);
    });

    it('a duplicate taxId returns 409', async () => {
      const commerce = await superadmin.get(`/api/v1/commerces/${commerceId}`);
      const res = await superadmin.post(`/api/v1/portals/${portalId}/commerces`).send({
        categoryId,
        tradeName: 'Otro Comercio',
        legalName: 'Otro Comercio S.A.S.',
        taxId: commerce.body.taxId,
        contactName: 'Alguien',
        contactEmail: 'alguien@example.com',
        contactPhone: '3000000002',
        address: 'N/A',
        city: 'N/A',
      });
      expect(res.status).toBe(409);
    });
  });

  describe('Service', () => {
    it('POST /commerces/:commerceId/services creates a service with no status field', async () => {
      const res = await superadmin.post(`/api/v1/commerces/${commerceId}/services`).send({ name: 'Matrícula' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ commerceId, name: 'Matrícula' });
      expect(res.body).not.toHaveProperty('status');
    });

    it('the same name twice within the same commerce returns 409', async () => {
      const res = await superadmin.post(`/api/v1/commerces/${commerceId}/services`).send({ name: 'Matrícula' });
      expect(res.status).toBe(409);
    });
  });

  /**
   * Regression for GAP-01 (docs/auth-migration/02-business-access-model.md):
   * CategoriesService used to call assertScope with a portalId only, and
   * assertScope's COMMERCE branch requires a matching commerceId to ever
   * pass — so an ADMIN_COMMERCE always got 403 reading categories, even for
   * their own portal, contradicting the 👁 read access documented in
   * docs/business/ROLE_PERMISSION_MATRIX.md §5.3.
   */
  describe('Category — commerce-scoped read (GAP-01 regression)', () => {
    let adminCommerce: TestSession;
    let otherPortalId: string;
    let otherCategoryId: string;

    beforeAll(async () => {
      const email = `admin-commerce-cat-${Date.now()}@example.com`;
      const password = 'a-strong-password-123';
      const createRes = await superadmin.post('/api/v1/users').send({
        email,
        password,
        fullName: 'Admin Commerce Cat',
        role: 'ADMIN_COMMERCE',
        scopeCommerceId: commerceId,
      });
      expect(createRes.status).toBe(201);

      adminCommerce = await TestSession.create(app.getHttpServer());
      const loginRes = await adminCommerce.login(email, password);
      expect(loginRes.status).toBe(200);

      const otherPortal = await superadmin.post('/api/v1/portals').send({ name: `Portal Ajeno Cat ${Date.now()}` });
      otherPortalId = otherPortal.body.id;
      const otherCategory = await superadmin
        .post(`/api/v1/portals/${otherPortalId}/categories`)
        .send({ name: `Categoría ajena ${Date.now()}` });
      otherCategoryId = otherCategory.body.id;
    });

    it('ADMIN_COMMERCE can list categories of the portal their own commerce belongs to', async () => {
      const res = await adminCommerce.get(`/api/v1/portals/${portalId}/categories`);
      expect(res.status).toBe(200);
      const categories = res.body as { id: string }[];
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.some((c) => c.id === categoryId)).toBe(true);
    });

    it('ADMIN_COMMERCE can view a category of their own portal by id', async () => {
      const res = await adminCommerce.get(`/api/v1/categories/${categoryId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(categoryId);
    });

    it('ADMIN_COMMERCE cannot list categories of a different portal (cross-portal BOLA)', async () => {
      const res = await adminCommerce.get(`/api/v1/portals/${otherPortalId}/categories`);
      expect(res.status).toBe(403);
    });

    it('ADMIN_COMMERCE cannot view a category belonging to a different portal (cross-portal BOLA)', async () => {
      const res = await adminCommerce.get(`/api/v1/categories/${otherCategoryId}`);
      expect(res.status).toBe(403);
    });
  });
});
