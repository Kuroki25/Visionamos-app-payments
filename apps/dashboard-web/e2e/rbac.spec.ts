import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { DEMO_USERS } from './fixtures';

/**
 * REAL E2E — RBAC/scope enforcement, verified against the real NestJS
 * guards (`RolesGuard`, `ScopeAuthorizationService`), not asserted from
 * reading the controller source. IDs below are the real seeded demo data
 * (`apps/api/src/scripts/seed-demo.ts`) — see `e2e/fixtures.ts`.
 */
const AVANZA_PORTAL_ID = '5c95138e-25e0-4487-84e6-ce745ebaf5e5';
const OTRAHUILCA_PORTAL_ID = '08339759-847b-4263-a19c-dad3042002fc';
const UNIVERSIDAD_AVANZA_COMMERCE_ID = '75c52ec7-e04d-49b4-8834-c2761300c646';
const HOTEL_AVANZA_COMMERCE_ID = 'd2ffc0b0-207d-4c19-9e19-8953a53a356c';

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL('/');
}

test.describe('RBAC and scope — real backend enforcement', () => {
  test('ADMIN_PORTAL sees only their own portal in the list (real server-side scoping)', async ({ page }) => {
    await loginAs(page, DEMO_USERS.adminAvanza.email, DEMO_USERS.adminAvanza.password);
    await page.goto('/portales');
    await expect(page.getByRole('heading', { name: 'Gestión de Portales' })).toBeVisible();

    await expect(page.getByText('Avanza', { exact: true })).toBeVisible();
    await expect(page.getByText('Otrahuilca')).not.toBeVisible();
    await expect(page.getByText('Coopenjo')).not.toBeVisible();
  });

  test('ADMIN_PORTAL viewing another portal (cross-tenant) gets a real 403 rendered as a handled state, not a crash', async ({
    page,
  }) => {
    await loginAs(page, DEMO_USERS.adminAvanza.email, DEMO_USERS.adminAvanza.password);
    await page.goto(`/portales/${OTRAHUILCA_PORTAL_ID}`);

    await expect(page.getByText('No tienes acceso')).toBeVisible();
    // Never a generic Next.js error boundary.
    await expect(page.getByText(/This page couldn.?t load/i)).not.toBeVisible();
  });

  test('ADMIN_COMMERCE sees their own commerce but gets 403 on a different commerce in the same portal', async ({ page }) => {
    await loginAs(page, DEMO_USERS.adminUniversidadAvanza.email, DEMO_USERS.adminUniversidadAvanza.password);

    await page.goto(`/portales/${AVANZA_PORTAL_ID}/aliados/${UNIVERSIDAD_AVANZA_COMMERCE_ID}`);
    await expect(page.getByRole('heading', { name: 'Universidad Avanza' })).toBeVisible();
    await expect(page.getByText('No tienes acceso')).not.toBeVisible();

    await page.goto(`/portales/${AVANZA_PORTAL_ID}/aliados/${HOTEL_AVANZA_COMMERCE_ID}`);
    await expect(page.getByText('No tienes acceso')).toBeVisible();
  });

  test('VIEWER can read but a write attempt is really rejected by the backend (button visibility is not the security boundary)', async ({
    page,
  }) => {
    await loginAs(page, DEMO_USERS.viewerAvanza.email, DEMO_USERS.viewerAvanza.password);
    await page.goto('/portales');
    await expect(page.getByRole('heading', { name: 'Gestión de Portales' })).toBeVisible();

    const responsePromise = page.waitForResponse(
      (r) => /\/api\/v1\/portals$/.test(r.url()) && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Nuevo portal' }).click();
    // All 4 required fields, so client-side validation actually lets the
    // request reach the backend — the point of this test is that the
    // *backend* rejects it, not that the form happens to be incomplete.
    await page.getByLabel(/Nombre del portal/).fill('Should Be Rejected By The Real Backend');
    await page.getByLabel(/Nombre de visualización/).fill('Debería ser rechazado');
    await page.getByLabel(/Tipo de servicio/).fill('Educación');
    await page.getByLabel(/Descripción/).fill('Este intento debe ser rechazado por el backend real.');
    await page.getByRole('button', { name: 'Guardar' }).click();

    const response = await responsePromise;
    expect(response.status()).toBe(403);
    // The real backend's rejection message reaches the UI, not a blank/crashed modal.
    await expect(page.getByText(/permission|permiso/i)).toBeVisible();
  });
});
