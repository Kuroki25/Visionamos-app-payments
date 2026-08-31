import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import type { Env } from '../src/config/env.schema';
import { TestSession } from './helpers/http';
import { seedSuperadmin } from './helpers/seed-superadmin';

/**
 * FormDefinition → FormVersion → FormField → FormSubmission lifecycle
 * (docs/business/DOMAIN_GLOSSARY_RED_COOPAGOS.md §8), including the
 * publish invariant (at most one published version per definition —
 * enforced by both the service and the database's partial unique index,
 * FormVersionEntity) and version immutability once published.
 */
describe('forms (integration)', () => {
  let app: INestApplication;
  let superadmin: TestSession;
  let adminCommerce: TestSession;
  let serviceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app, app.get(ConfigService<Env, true>));
    await app.init();

    const seeded = await seedSuperadmin(app);
    superadmin = await TestSession.create(app.getHttpServer());
    await superadmin.login(seeded.email, seeded.password);

    const portal = await superadmin.post('/api/v1/portals').send({ name: `Portal Forms ${Date.now()}` });
    const category = await superadmin.post(`/api/v1/portals/${portal.body.id}/categories`).send({ name: 'Educación' });
    const commerce = await superadmin.post(`/api/v1/portals/${portal.body.id}/commerces`).send({
      categoryId: category.body.id,
      tradeName: 'Universidad Forms',
      legalName: 'Universidad Forms S.A.S.',
      taxId: `900${Date.now()}F`,
      contactName: 'Ana',
      contactEmail: 'ana@example.com',
      contactPhone: '3000000003',
      address: 'Calle 3',
      city: 'Cali',
    });
    const service = await superadmin.post(`/api/v1/commerces/${commerce.body.id}/services`).send({ name: 'Matrícula' });
    serviceId = service.body.id;

    const adminCommerceEmail = `admin-commerce-forms-${Date.now()}@example.com`;
    const adminCommercePassword = 'a-strong-password-123';
    await superadmin.post('/api/v1/users').send({
      email: adminCommerceEmail,
      password: adminCommercePassword,
      fullName: 'Admin Commerce',
      role: 'ADMIN_COMMERCE',
      scopeCommerceId: commerce.body.id,
    });
    adminCommerce = await TestSession.create(app.getHttpServer());
    await adminCommerce.login(adminCommerceEmail, adminCommercePassword);
  });

  afterAll(async () => {
    await app.close();
  });

  let formDefinitionId: string;
  let version1Id: string;
  let version2Id: string;

  it('POST /services/:serviceId/form-definition creates the definition and version #1 (draft)', async () => {
    const res = await superadmin.post(`/api/v1/services/${serviceId}/form-definition`);
    expect(res.status).toBe(201);
    formDefinitionId = res.body.id;

    const versions = await superadmin.get(`/api/v1/form-definitions/${formDefinitionId}/versions`);
    expect(versions.status).toBe(200);
    expect(versions.body).toHaveLength(1);
    expect(versions.body[0]).toMatchObject({ versionNumber: 1, isPublished: false });
    version1Id = versions.body[0].id;
  });

  it('creating a second form definition for the same service returns 409 (1:1)', async () => {
    const res = await superadmin.post(`/api/v1/services/${serviceId}/form-definition`);
    expect(res.status).toBe(409);
  });

  it('POST /form-definitions/:id/versions creates version #2', async () => {
    const res = await superadmin.post(`/api/v1/form-definitions/${formDefinitionId}/versions`);
    expect(res.status).toBe(201);
    expect(res.body.versionNumber).toBe(2);
    version2Id = res.body.id;
  });

  describe('fields', () => {
    it('rejects a SELECT field with no options (400)', async () => {
      const res = await superadmin
        .post(`/api/v1/form-versions/${version2Id}/fields`)
        .send({ key: 'program', label: 'Programa', type: 'SELECT' });
      expect(res.status).toBe(400);
    });

    it('accepts a SELECT field with options', async () => {
      const res = await superadmin.post(`/api/v1/form-versions/${version2Id}/fields`).send({
        key: 'program',
        label: 'Programa',
        type: 'SELECT',
        isRequired: true,
        options: [{ value: 'sistemas', label: 'Ingeniería de Sistemas' }],
      });
      expect(res.status).toBe(201);
    });

    it('accepts a required TEXT field', async () => {
      const res = await superadmin
        .post(`/api/v1/form-versions/${version2Id}/fields`)
        .send({ key: 'studentCode', label: 'Código de estudiante', type: 'TEXT', isRequired: true, sortOrder: 1 });
      expect(res.status).toBe(201);
    });

    it('GET /form-versions/:id returns the version with its fields sorted by sortOrder', async () => {
      const res = await superadmin.get(`/api/v1/form-versions/${version2Id}`);
      expect(res.status).toBe(200);
      expect(res.body.fields).toHaveLength(2);
      const fields = res.body.fields as { key: string }[];
      expect(fields.map((f) => f.key)).toEqual(['program', 'studentCode']);
    });
  });

  describe('publish invariant', () => {
    it('ADMIN_COMMERCE cannot publish (only SUPERADMIN/ADMIN_PORTAL — confirmed business rule)', async () => {
      const res = await adminCommerce.patch(`/api/v1/form-versions/${version1Id}/publish`);
      expect(res.status).toBe(403);
    });

    it('SUPERADMIN publishes version #1', async () => {
      const res = await superadmin.patch(`/api/v1/form-versions/${version1Id}/publish`);
      expect(res.status).toBe(200);
      expect(res.body.isPublished).toBe(true);
    });

    it('publishing version #2 transactionally unpublishes version #1', async () => {
      const res = await superadmin.patch(`/api/v1/form-versions/${version2Id}/publish`);
      expect(res.status).toBe(200);
      expect(res.body.isPublished).toBe(true);

      const v1After = await superadmin.get(`/api/v1/form-versions/${version1Id}`);
      expect(v1After.body.isPublished).toBe(false);
    });

    it('editing fields of a published version returns 409 (immutable)', async () => {
      const res = await superadmin
        .post(`/api/v1/form-versions/${version2Id}/fields`)
        .send({ key: 'extra', label: 'Extra', type: 'TEXT' });
      expect(res.status).toBe(409);
    });
  });

  describe('submissions', () => {
    it('cannot submit against an unpublished version', async () => {
      const res = await superadmin
        .post(`/api/v1/form-versions/${version1Id}/submissions`)
        .send({ answers: { program: 'sistemas', studentCode: 'A123' } });
      expect(res.status).toBe(409);
    });

    it('rejects a submission missing a required field', async () => {
      const res = await superadmin.post(`/api/v1/form-versions/${version2Id}/submissions`).send({ answers: { program: 'sistemas' } });
      expect(res.status).toBe(400);
    });

    it('rejects a SELECT value outside its configured options', async () => {
      const res = await superadmin
        .post(`/api/v1/form-versions/${version2Id}/submissions`)
        .send({ answers: { program: 'not-a-real-program', studentCode: 'A123' } });
      expect(res.status).toBe(400);
    });

    it('accepts a valid submission against the published version', async () => {
      const res = await superadmin
        .post(`/api/v1/form-versions/${version2Id}/submissions`)
        .send({ answers: { program: 'sistemas', studentCode: 'A123' } });
      expect(res.status).toBe(201);
      expect(res.body.answers).toEqual({ program: 'sistemas', studentCode: 'A123' });
    });

    it('GET /form-versions/:id/submissions lists the captured submission', async () => {
      const res = await superadmin.get(`/api/v1/form-versions/${version2Id}/submissions`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });
});
