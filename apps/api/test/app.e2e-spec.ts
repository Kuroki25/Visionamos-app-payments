import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

describe('api (integration)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns 200 and status ok', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('POST /api/v1/users with a valid payload returns 201 and the created user', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ email: 'ana@example.com', fullName: 'Ana Pérez' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      email: 'ana@example.com',
      fullName: 'Ana Pérez',
      role: 'member',
    });
    expect(response.body.id).toEqual(expect.any(String));
  });

  it('POST /api/v1/users with an invalid payload returns 400 as application/problem+json', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body.status).toBe(400);
    expect(Array.isArray(response.body.errors)).toBe(true);
  });

  it('GET /api/v1/users/:id for a non-existent id returns 404 as application/problem+json', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/users/00000000-0000-0000-0000-000000000000',
    );

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body.status).toBe(404);
  });

  it('GET /api/v1/users/:id with a malformed id returns 400', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/users/not-a-uuid');
    expect(response.status).toBe(400);
  });
});
