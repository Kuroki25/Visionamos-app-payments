import { expect, test } from '@playwright/test';

import { DEMO_USERS } from './fixtures';

/**
 * REAL E2E — Slice 3 ("Crear portal") of `docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md`
 * §17.2/§17.5. Only real gap closed: `CreatePortalSchema.status` (the
 * "Portal activo" toggle, `06-portal-form-expected-bottom.png`), defaulting
 * to `ACTIVE`. Everything else that image shows (displayName/serviceType/
 * description/logo) is a confirmed `BACKEND_GAP` left undone by the
 * user's own decision — not tested here because it doesn't exist.
 */
test.describe('Create Portal — real E2E against PostgreSQL (Slice 3)', () => {
  test('SUPERADMIN creates a portal with the default (active) toggle', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(DEMO_USERS.superadmin.email);
    await page.getByLabel('Contraseña').fill(DEMO_USERS.superadmin.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL('/');

    await page.goto('/portales');
    await page.getByRole('button', { name: 'Nuevo portal' }).click();

    const name = `E2E Portal ${Date.now()}`;
    await page.getByLabel(/Nombre del portal/).fill(name);
    // Toggle defaults ON — leave it untouched for this case.

    const createPromise = page.waitForResponse(
      (r) => /\/api\/v1\/portals$/.test(r.url()) && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Guardar' }).click();
    const createResponse = await createPromise;
    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()) as { status: string };
    expect(created.status).toBe('ACTIVE');

    await expect(page.getByText('Portal creado correctamente.')).toBeVisible();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  });

  test('SUPERADMIN creates a portal with the toggle switched off — real INACTIVE, not just a decorative switch', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(DEMO_USERS.superadmin.email);
    await page.getByLabel('Contraseña').fill(DEMO_USERS.superadmin.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL('/');

    await page.goto('/portales');
    await page.getByRole('button', { name: 'Nuevo portal' }).click();

    const name = `E2E Portal Inactive ${Date.now()}`;
    await page.getByLabel(/Nombre del portal/).fill(name);

    const toggle = page.getByRole('switch', { name: 'Portal activo' });
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    const createPromise = page.waitForResponse(
      (r) => /\/api\/v1\/portals$/.test(r.url()) && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Guardar' }).click();
    const createResponse = await createPromise;
    const created = (await createResponse.json()) as { status: string };
    expect(created.status).toBe('INACTIVE');
  });
});
