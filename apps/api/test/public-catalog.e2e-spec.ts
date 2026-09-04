import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import type { Env } from '../src/config/env.schema';
import { TestSession } from './helpers/http';
import { PORTAL_FIXTURE_FIELDS } from './helpers/portal-fixture';
import { seedSuperadmin } from './helpers/seed-superadmin';

/** `res.body` is `any` (supertest) — this is the shape every `paginatedSchema()` response actually has, cast at each call site instead of leaving `.map`/`.find` calls unsafe. */
interface PaginatedItemsBody<T> {
  items: T[];
}

/**
 * `GET /public/*` — the unauthenticated surface `portal-web` reads
 * (docs/frontend/PORTAL_WEB_SOURCE_OF_TRUTH.md, "Public API Architecture").
 * The central property under test throughout: a DRAFT/INACTIVE/unpublished
 * Portal or Commerce must be unreachable through these routes under any
 * query shape — enforced server-side (master prompt §7/§18), never left to
 * the frontend to filter out.
 */
describe('public catalog (integration, unauthenticated)', () => {
  let app: INestApplication;
  let superadmin: TestSession;
  const marker = `PubCat${Date.now()}`;

  async function createPortal(name: string): Promise<string> {
    const res = await superadmin.post('/api/v1/portals').send({ name, ...PORTAL_FIXTURE_FIELDS });
    expect(res.status).toBe(201);
    return res.body.id as string;
  }

  async function publishPortal(id: string): Promise<void> {
    const res = await superadmin.patch(`/api/v1/portals/${id}/publish`).send({});
    expect(res.status).toBe(200);
  }

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

  describe('GET /public/portals', () => {
    it('never requires a session — a fresh, cookie-less request succeeds', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/public/portals');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('meta');
    });

    it('lists a published+active portal, excludes an unpublished one and one that was published then deactivated', async () => {
      const publishedId = await createPortal(`${marker} Publicado`);
      await publishPortal(publishedId);

      const draftId = await createPortal(`${marker} Borrador`);
      // never published

      const deactivatedId = await createPortal(`${marker} Desactivado`);
      await publishPortal(deactivatedId);
      const statusRes = await superadmin.patch(`/api/v1/portals/${deactivatedId}/status`).send({ status: 'INACTIVE' });
      expect(statusRes.status).toBe(200);

      const res = await request(app.getHttpServer()).get(`/api/v1/public/portals?q=${encodeURIComponent(marker)}&pageSize=50`);
      expect(res.status).toBe(200);
      const ids = (res.body as PaginatedItemsBody<{ id: string }>).items.map((p) => p.id);
      expect(ids).toContain(publishedId);
      expect(ids).not.toContain(draftId);
      expect(ids).not.toContain(deactivatedId);
    });

    it('returns only the public shape — no status/isPublished/createdAt/updatedAt leak through', async () => {
      const publishedId = await createPortal(`${marker} Shape`);
      await publishPortal(publishedId);

      const res = await request(app.getHttpServer()).get(`/api/v1/public/portals?q=${encodeURIComponent(marker)} Shape`);
      const found = (res.body as PaginatedItemsBody<{ id: string }>).items.find((p) => p.id === publishedId);
      expect(found).toMatchObject({ id: publishedId, name: `${marker} Shape`, displayName: PORTAL_FIXTURE_FIELDS.displayName });
      expect(found).not.toHaveProperty('status');
      expect(found).not.toHaveProperty('isPublished');
      expect(found).not.toHaveProperty('createdAt');
    });

    it('"No se encontraron portales" case: an unmatched query returns an empty items array, meta.total 0, totalPages 1', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/public/portals?q=${marker}-nonexistent-xyz`);
      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.meta).toMatchObject({ total: 0, totalPages: 1 });
    });

    it('paginates real results — not a hardcoded "Página 1 de 2"', async () => {
      const a = await createPortal(`${marker} Pag A`);
      const b = await createPortal(`${marker} Pag B`);
      await publishPortal(a);
      await publishPortal(b);

      const res = await request(app.getHttpServer()).get(`/api/v1/public/portals?q=${encodeURIComponent(marker)} Pag&pageSize=1&page=1`);
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.meta).toMatchObject({ page: 1, pageSize: 1, total: 2, totalPages: 2 });
    });

    it('rejects a pageSize above the server-side cap (50) instead of allowing an unbounded page', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/public/portals?pageSize=1000');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /public/portals/:id', () => {
    it('returns the public shape for a published+active portal', async () => {
      const id = await createPortal(`${marker} Detail`);
      await publishPortal(id);

      const res = await request(app.getHttpServer()).get(`/api/v1/public/portals/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
    });

    it('404s for an unpublished portal — same as "does not exist", never a 403 that would confirm it exists', async () => {
      const id = await createPortal(`${marker} Detail Draft`);
      const res = await request(app.getHttpServer()).get(`/api/v1/public/portals/${id}`);
      expect(res.status).toBe(404);
    });

    it('404s for a random id', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/public/portals/123e4567-e89b-12d3-a456-426614174099');
      expect(res.status).toBe(404);
    });

    it('rejects a non-UUID id with 400, not a raw SQL/500 error', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/public/portals/not-a-uuid');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /public/commerces', () => {
    async function createCategory(portalId: string, name: string): Promise<string> {
      const res = await superadmin.post(`/api/v1/portals/${portalId}/categories`).send({ name });
      expect(res.status).toBe(201);
      return res.body.id as string;
    }

    async function createCommerce(portalId: string, categoryId: string, tradeName: string): Promise<string> {
      const res = await superadmin.post(`/api/v1/portals/${portalId}/commerces`).send({
        categoryId,
        tradeName,
        legalName: `${tradeName} S.A.S.`,
        taxId: `NIT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        contactName: 'Contacto de prueba',
        contactEmail: `contacto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`,
        contactPhone: '+57 3000000000',
        address: 'Calle 1 # 2-3',
        city: 'Bogotá',
      });
      expect(res.status).toBe(201);
      return res.body.id as string;
    }

    async function publishCommerce(id: string): Promise<void> {
      const res = await superadmin.patch(`/api/v1/commerces/${id}/publish`).send({});
      expect(res.status).toBe(200);
    }

    it('finds a published commerce of a published portal, with portal/category denormalized; excludes an unpublished commerce and one whose portal is unpublished', async () => {
      const portalId = await createPortal(`${marker} ComPortal`);
      await publishPortal(portalId);
      const categoryId = await createCategory(portalId, `${marker} Categoria`);

      const visibleId = await createCommerce(portalId, categoryId, `${marker} Comercio Visible`);
      await publishCommerce(visibleId);

      const unpublishedCommerceId = await createCommerce(portalId, categoryId, `${marker} Comercio Sin Publicar`);
      // never published

      const draftPortalId = await createPortal(`${marker} ComPortal Borrador`);
      const draftPortalCategoryId = await createCategory(draftPortalId, `${marker} Categoria 2`);
      const commerceOfDraftPortalId = await createCommerce(draftPortalId, draftPortalCategoryId, `${marker} Comercio De Portal Borrador`);
      await publishCommerce(commerceOfDraftPortalId); // published itself, but its Portal never was

      const res = await request(app.getHttpServer()).get(`/api/v1/public/commerces?q=${encodeURIComponent(marker)}&pageSize=50`);
      expect(res.status).toBe(200);
      const body = res.body as PaginatedItemsBody<{ id: string }>;
      const ids = body.items.map((c) => c.id);
      expect(ids).toContain(visibleId);
      expect(ids).not.toContain(unpublishedCommerceId);
      expect(ids).not.toContain(commerceOfDraftPortalId);

      const found = body.items.find((c) => c.id === visibleId);
      expect(found).toMatchObject({
        id: visibleId,
        tradeName: `${marker} Comercio Visible`,
        portalId,
        portalName: `${marker} ComPortal`,
        categoryId,
        categoryName: `${marker} Categoria`,
      });
      expect(found).not.toHaveProperty('contactEmail');
      expect(found).not.toHaveProperty('taxId');
      expect(found).not.toHaveProperty('legalName');
    });

    it('filters by portalId', async () => {
      const portalId = await createPortal(`${marker} FiltroPortal`);
      await publishPortal(portalId);
      const categoryId = await createCategory(portalId, `${marker} FiltroCategoria`);
      const commerceId = await createCommerce(portalId, categoryId, `${marker} FiltroComercio`);
      await publishCommerce(commerceId);

      const res = await request(app.getHttpServer()).get(`/api/v1/public/commerces?portalId=${portalId}`);
      expect(res.status).toBe(200);
      const body = res.body as PaginatedItemsBody<{ id: string; portalId: string }>;
      expect(body.items.every((c) => c.portalId === portalId)).toBe(true);
      expect(body.items.map((c) => c.id)).toContain(commerceId);
    });

    it('never requires a session', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/public/commerces');
      expect(res.status).toBe(200);
    });
  });
});
