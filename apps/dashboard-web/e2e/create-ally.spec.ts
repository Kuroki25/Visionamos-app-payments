import { expect, test } from '@playwright/test';

import { DEMO_USERS } from './fixtures';

/**
 * REAL E2E — Slice 4 ("Crear aliado") of `docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md`
 * §17.3. This slice was visual-only (field reorder + relabeling to match
 * `07-ally-form-expected-top.png`/`08-ally-form-expected-bottom.png`, no
 * contract/backend change) — this test exists to prove the reorder didn't
 * silently break any field's wiring, not because a bug was found.
 */
const AVANZA_PORTAL_ID = '5c95138e-25e0-4487-84e6-ce745ebaf5e5';

test.describe('Create Ally — real E2E against PostgreSQL (Slice 4)', () => {
  test('SUPERADMIN creates a commerce with the reordered form and it really persists inside its portal', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(DEMO_USERS.superadmin.email);
    await page.getByLabel('Contraseña').fill(DEMO_USERS.superadmin.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL('/');

    await page.goto(`/portales/${AVANZA_PORTAL_ID}`);
    await page.getByRole('button', { name: 'Nuevo aliado' }).click();

    const tradeName = `E2E Aliado ${Date.now()}`;
    await page.getByLabel(/Nombre del establecimiento/).fill(tradeName);
    await page.getByLabel(/Tipo de establecimiento/).selectOption({ index: 1 });
    await page.getByLabel(/NIT o Identificación/).fill(`900${Date.now()}`);
    await page.getByLabel(/Razón social/).fill(`${tradeName} S.A.S.`);
    await page.getByLabel(/^Email/).fill(`contacto-${Date.now()}@example.com`);
    await page.getByLabel(/Teléfono/).fill('3000000000');
    await page.getByLabel(/Ciudad/).fill('Bogotá');
    await page.getByLabel(/Dirección/).fill('Calle 123');
    await page.getByLabel(/Nombre de contacto/).fill('Contacto E2E');

    const createPromise = page.waitForResponse(
      (r) => /\/api\/v1\/portals\/[^/]+\/commerces$/.test(r.url()) && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Crear' }).click();
    const createResponse = await createPromise;
    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()) as { portalId: string; tradeName: string };
    expect(created.portalId).toBe(AVANZA_PORTAL_ID);
    expect(created.tradeName).toBe(tradeName);

    await expect(page.getByText('Aliado creado correctamente.')).toBeVisible();
    await expect(page.getByText(tradeName)).toBeVisible();
  });
});
