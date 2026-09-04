import { request as playwrightRequest, type APIRequestContext } from '@playwright/test';

/**
 * Real credentials for `apps/api`'s seeded E2E SUPERADMIN
 * (`apps/api/src/scripts/seed-e2e-superadmin.ts`, idempotent, already
 * committed — same account dashboard-web's own E2E suite uses, see
 * `apps/dashboard-web/e2e/fixtures.ts`). Portal-web has no admin UI of its
 * own, so its E2E creates fixtures by calling the real NestJS API directly
 * (`createPublishedFixture` below), the same way `apps/api/test/*.e2e-spec.ts`
 * does over supertest — here over Playwright's `APIRequestContext` instead,
 * against the real, already-running dev server (`pnpm --filter api
 * start:dev`), never a mock.
 */
export const E2E_SUPERADMIN = { email: 'e2e-superadmin@example.com', password: 'a-strong-password-123' };

const API_BASE_URL = 'http://localhost:4100';

async function csrfToken(context: APIRequestContext): Promise<string> {
  await context.get(`${API_BASE_URL}/api/v1/health`);
  const state = await context.storageState();
  const cookie = state.cookies.find((c) => c.name === 'csrf_token');
  if (!cookie) {
    throw new Error('csrf_token cookie was not set by GET /health');
  }
  return cookie.value;
}

export interface PublishedFixture {
  portalId: string;
  portalName: string;
  categoryId: string;
  categoryName: string;
  commerceId: string;
  commerceName: string;
  /** Must be called once the fixture is no longer needed — disposes the underlying API context. */
  dispose: () => Promise<void>;
}

/**
 * Creates and publishes a real Portal + Category + Commerce via the real
 * API (SUPERADMIN), unique per call (`marker` suffixes every name) — a
 * fresh, throwaway fixture per test run, never shared mutable state between
 * tests (same discipline as `apps/api/test/public-catalog.e2e-spec.ts`).
 */
export async function createPublishedFixture(marker: string): Promise<PublishedFixture> {
  // Better Auth rejects a sign-in with no/mismatched `Origin` header
  // (CSRF-adjacent hardening — real browsers always send one; a standalone
  // `APIRequestContext`, unlike `page.request`, does not by default). This
  // must match an entry in `apps/api/.env`'s `CORS_ALLOWED_ORIGINS` —
  // portal-web's own dev origin.
  const context = await playwrightRequest.newContext({ baseURL: API_BASE_URL, extraHTTPHeaders: { Origin: 'http://localhost:3100' } });
  const token = await csrfToken(context);
  const headers = { 'X-CSRF-Token': token };

  const loginRes = await context.post('/api/auth/sign-in/email', {
    data: { email: E2E_SUPERADMIN.email, password: E2E_SUPERADMIN.password },
  });
  if (!loginRes.ok()) {
    throw new Error(`E2E superadmin login failed: ${loginRes.status()} ${await loginRes.text()}`);
  }

  const portalName = `E2E Portal ${marker}`;
  const portalRes = await context.post('/api/v1/portals', {
    headers,
    data: {
      name: portalName,
      displayName: `Plataforma ${marker}`,
      serviceType: 'Educación',
      description: `Portal de prueba E2E — ${marker}.`,
    },
  });
  if (!portalRes.ok()) {
    throw new Error(`Portal creation failed: ${portalRes.status()} ${await portalRes.text()}`);
  }
  const portal = (await portalRes.json()) as { id: string };

  const publishRes = await context.patch(`/api/v1/portals/${portal.id}/publish`, { headers, data: {} });
  if (!publishRes.ok()) {
    throw new Error(`Portal publish failed: ${publishRes.status()} ${await publishRes.text()}`);
  }

  const categoryName = `Categoría ${marker}`;
  const categoryRes = await context.post(`/api/v1/portals/${portal.id}/categories`, {
    headers,
    data: { name: categoryName },
  });
  if (!categoryRes.ok()) {
    throw new Error(`Category creation failed: ${categoryRes.status()} ${await categoryRes.text()}`);
  }
  const category = (await categoryRes.json()) as { id: string };

  const commerceName = `Comercio ${marker}`;
  const commerceRes = await context.post(`/api/v1/portals/${portal.id}/commerces`, {
    headers,
    data: {
      categoryId: category.id,
      tradeName: commerceName,
      legalName: `${commerceName} S.A.S.`,
      taxId: `E2E-${Date.now()}`,
      contactName: 'Contacto E2E',
      contactEmail: `contacto-${Date.now()}@example.com`,
      contactPhone: '+57 3000000000',
      address: 'Calle 1 # 2-3',
      city: 'Bogotá',
    },
  });
  if (!commerceRes.ok()) {
    throw new Error(`Commerce creation failed: ${commerceRes.status()} ${await commerceRes.text()}`);
  }
  const commerce = (await commerceRes.json()) as { id: string };

  const commercePublishRes = await context.patch(`/api/v1/commerces/${commerce.id}/publish`, { headers, data: {} });
  if (!commercePublishRes.ok()) {
    throw new Error(`Commerce publish failed: ${commercePublishRes.status()} ${await commercePublishRes.text()}`);
  }

  return {
    portalId: portal.id,
    portalName,
    categoryId: category.id,
    categoryName,
    commerceId: commerce.id,
    commerceName,
    dispose: () => context.dispose(),
  };
}
