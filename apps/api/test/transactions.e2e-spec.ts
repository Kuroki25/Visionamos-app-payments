import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import type { Env } from '../src/config/env.schema';
import { TestSession } from './helpers/http';
import { PORTAL_FIXTURE_FIELDS } from './helpers/portal-fixture';
import { seedSuperadmin } from './helpers/seed-superadmin';
import { seedTransaction } from './helpers/seed-transaction';

/**
 * Read-only module (docs/adr/012). Fixtures are seeded via
 * `TransactionsService.create` directly (test/helpers/seed-transaction.ts)
 * — there is no `POST /transactions` to create them through HTTP, by
 * design.
 */
describe('transactions (integration)', () => {
  let app: INestApplication;
  let superadmin: TestSession;
  let portalAId: string;
  let portalBId: string;
  let commerceAId: string;
  let serviceAId: string;
  let serviceA2Id: string;
  let serviceBId: string;
  let transactionAId: string;
  let transactionA2Id: string;
  let transactionBId: string;

  async function createCommerceAndService(portalId: string, taxSuffix: string) {
    const category = await superadmin.post(`/api/v1/portals/${portalId}/categories`).send({ name: `Cat-${taxSuffix}` });
    const commerce = await superadmin.post(`/api/v1/portals/${portalId}/commerces`).send({
      categoryId: category.body.id,
      tradeName: `Comercio ${taxSuffix}`,
      legalName: `Comercio ${taxSuffix} S.A.S.`,
      taxId: `900${Date.now()}${taxSuffix}`,
      contactName: 'Contacto',
      contactEmail: `contacto-${taxSuffix}@example.com`,
      contactPhone: '3000000000',
      address: 'N/A',
      city: 'N/A',
    });
    const service = await superadmin.post(`/api/v1/commerces/${commerce.body.id}/services`).send({ name: `Servicio ${taxSuffix}` });
    return { commerceId: commerce.body.id as string, serviceId: service.body.id as string };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureApp(app, app.get(ConfigService<Env, true>));
    await app.init();

    const seeded = await seedSuperadmin(app);
    superadmin = await TestSession.create(app.getHttpServer());
    await superadmin.login(seeded.email, seeded.password);

    const portalA = await superadmin.post('/api/v1/portals').send({ name: `Portal TX A ${Date.now()}`, ...PORTAL_FIXTURE_FIELDS });
    portalAId = portalA.body.id;
    const portalB = await superadmin.post('/api/v1/portals').send({ name: `Portal TX B ${Date.now()}`, ...PORTAL_FIXTURE_FIELDS });
    portalBId = portalB.body.id;

    const a = await createCommerceAndService(portalAId, 'A');
    commerceAId = a.commerceId;
    serviceAId = a.serviceId;
    const a2 = await createCommerceAndService(portalAId, 'A2');
    serviceA2Id = a2.serviceId;
    const b = await createCommerceAndService(portalBId, 'B');
    serviceBId = b.serviceId;

    const txInput = (serviceId: string) => ({
      serviceId,
      payerEmail: 'ana@example.com',
      payerDocumentType: 'CC',
      payerDocumentNumber: '1234567890',
      payerFirstName: 'Ana',
      payerLastName: 'Pérez',
      payerPhone: '3000000000',
      amount: 5_000_000,
      method: 'PSE' as const,
    });

    transactionAId = (await seedTransaction(app, txInput(serviceAId))).id;
    transactionA2Id = (await seedTransaction(app, txInput(serviceA2Id))).id;
    transactionBId = (await seedTransaction(app, txInput(serviceBId))).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('seeded transactions start in CREATED status with a cached portalId/commerceId', async () => {
    const res = await superadmin.get(`/api/v1/transactions/${transactionAId}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'CREATED', portalId: portalAId, commerceId: commerceAId });
  });

  it('GET /transactions/:id/events returns the initial CREATED event', async () => {
    const res = await superadmin.get(`/api/v1/transactions/${transactionAId}/events`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ previousStatus: null, newStatus: 'CREATED', source: 'SYSTEM' });
  });

  it('SUPERADMIN sees every transaction', async () => {
    const res = await superadmin.get('/api/v1/transactions');
    expect(res.status).toBe(200);
    const transactions = res.body as { id: string }[];
    const ids = transactions.map((tx) => tx.id);
    expect(ids).toEqual(expect.arrayContaining([transactionAId, transactionA2Id, transactionBId]));
  });

  it('POST /transactions does not exist — no manual creation, ever (BR confirmed)', async () => {
    const res = await superadmin.post('/api/v1/transactions').send({ serviceId: serviceAId });
    expect(res.status).toBe(404);
  });

  it('PATCH /transactions/:id does not exist — no arbitrary status edits', async () => {
    const res = await superadmin.patch(`/api/v1/transactions/${transactionAId}`).send({ status: 'APPROVED' });
    expect(res.status).toBe(404);
  });

  describe('ADMIN_PORTAL(A) scope', () => {
    let adminPortalA: TestSession;

    beforeAll(async () => {
      const email = `admin-portal-tx-${Date.now()}@example.com`;
      const createRes = await superadmin
        .post('/api/v1/users')
        .send({ email, fullName: 'Admin Portal TX', role: 'ADMIN_PORTAL', scopePortalId: portalAId });

      adminPortalA = await TestSession.create(app.getHttpServer());
      await adminPortalA.login(email, createRes.body.temporaryPassword);
    });

    it('lists only transactions of its own portal (both commerces within it)', async () => {
      const res = await adminPortalA.get('/api/v1/transactions');
      expect(res.status).toBe(200);
      const transactions = res.body as { id: string }[];
      const ids = transactions.map((tx) => tx.id);
      expect(ids).toEqual(expect.arrayContaining([transactionAId, transactionA2Id]));
      expect(ids).not.toContain(transactionBId);
    });

    it('cannot read a transaction from a different portal (BOLA)', async () => {
      const res = await adminPortalA.get(`/api/v1/transactions/${transactionBId}`);
      expect(res.status).toBe(403);
    });

    it('can read a transaction from its own portal', async () => {
      const res = await adminPortalA.get(`/api/v1/transactions/${transactionAId}`);
      expect(res.status).toBe(200);
    });
  });

  describe('ADMIN_COMMERCE(A) scope — narrower than its own portal', () => {
    let adminCommerceA: TestSession;

    beforeAll(async () => {
      const email = `admin-commerce-tx-${Date.now()}@example.com`;
      const createRes = await superadmin
        .post('/api/v1/users')
        .send({ email, fullName: 'Admin Commerce TX', role: 'ADMIN_COMMERCE', scopeCommerceId: commerceAId });

      adminCommerceA = await TestSession.create(app.getHttpServer());
      await adminCommerceA.login(email, createRes.body.temporaryPassword);
    });

    it('lists only its own commerce\'s transactions, not the sibling commerce in the same portal', async () => {
      const res = await adminCommerceA.get('/api/v1/transactions');
      expect(res.status).toBe(200);
      const transactions = res.body as { id: string }[];
      const ids = transactions.map((tx) => tx.id);
      expect(ids).toEqual([transactionAId]);
    });

    it('cannot read a transaction from a sibling commerce in the same portal', async () => {
      const res = await adminCommerceA.get(`/api/v1/transactions/${transactionA2Id}`);
      expect(res.status).toBe(403);
    });
  });

  /**
   * "Alertas de transacciones" real read/unread persistence
   * (docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md §17.4 — the `BACKEND_GAP`
   * this table closes). Uses its own dedicated SUPERADMIN-created actor
   * (not the shared `superadmin`/`adminPortalA` above) so its read-state
   * assertions don't depend on execution order with the other `describe`
   * blocks touching the same transactions.
   */
  describe('alerts (read/unread persistence)', () => {
    let viewerA: TestSession;
    let viewerAEmail: string;

    beforeAll(async () => {
      viewerAEmail = `viewer-alerts-${Date.now()}@example.com`;
      const createRes = await superadmin
        .post('/api/v1/users')
        .send({ email: viewerAEmail, fullName: 'Viewer Alerts', role: 'VIEWER', scopePortalId: portalAId });

      viewerA = await TestSession.create(app.getHttpServer());
      await viewerA.login(viewerAEmail, createRes.body.temporaryPassword);
    });

    it('GET /transactions/alerts is scope-filtered the same as GET /transactions, and starts unread', async () => {
      const res = await viewerA.get('/api/v1/transactions/alerts');
      expect(res.status).toBe(200);
      const alerts = res.body as { id: string; isRead: boolean }[];
      const ids = alerts.map((a) => a.id);
      expect(ids).toEqual(expect.arrayContaining([transactionAId, transactionA2Id]));
      expect(ids).not.toContain(transactionBId);
      expect(alerts.every((a) => a.isRead === false)).toBe(true);
    });

    it('POST /transactions/alerts/read-all marks the given ids read, and it persists across a fresh GET', async () => {
      const markRes = await viewerA
        .post('/api/v1/transactions/alerts/read-all')
        .send({ transactionIds: [transactionAId] });
      expect(markRes.status).toBe(200);

      const marked = (markRes.body as { id: string; isRead: boolean }[]).find((a) => a.id === transactionAId);
      expect(marked?.isRead).toBe(true);
      const stillUnread = (markRes.body as { id: string; isRead: boolean }[]).find((a) => a.id === transactionA2Id);
      expect(stillUnread?.isRead).toBe(false);

      const getRes = await viewerA.get('/api/v1/transactions/alerts');
      const afterRefresh = (getRes.body as { id: string; isRead: boolean }[]).find((a) => a.id === transactionAId);
      expect(afterRefresh?.isRead).toBe(true);
    });

    it('is idempotent — marking an already-read alert again does not error', async () => {
      const res = await viewerA.post('/api/v1/transactions/alerts/read-all').send({ transactionIds: [transactionAId] });
      expect(res.status).toBe(200);
    });

    it('an id outside the actor\'s real scope is silently dropped, never recorded (BOLA — API1)', async () => {
      const res = await viewerA
        .post('/api/v1/transactions/alerts/read-all')
        .send({ transactionIds: [transactionBId] });
      expect(res.status).toBe(200);

      // viewerA can't even see transactionBId, so it never appears in the
      // response — the real proof is that a *different*, actually-scoped
      // actor's read state for it is untouched (checked below via
      // superadmin, who can see it).
      const superadminAlerts = await superadmin.get('/api/v1/transactions/alerts');
      const forB = (superadminAlerts.body as { id: string; isRead: boolean }[]).find((a) => a.id === transactionBId);
      expect(forB?.isRead).toBe(false);
    });

    it('read state is per-user — marking read for viewerA does not mark it read for a different actor', async () => {
      const email2 = `viewer-alerts-2-${Date.now()}@example.com`;
      const createRes2 = await superadmin
        .post('/api/v1/users')
        .send({ email: email2, fullName: 'Viewer Alerts 2', role: 'VIEWER', scopePortalId: portalAId });
      const viewerA2 = await TestSession.create(app.getHttpServer());
      await viewerA2.login(email2, createRes2.body.temporaryPassword);

      // transactionAId was already marked read by viewerA above.
      const res = await viewerA2.get('/api/v1/transactions/alerts');
      const forA = (res.body as { id: string; isRead: boolean }[]).find((a) => a.id === transactionAId);
      expect(forA?.isRead).toBe(false);
    });
  });
});
