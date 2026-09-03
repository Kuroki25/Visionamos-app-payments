import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { DEMO_USERS } from './fixtures';

/**
 * REAL E2E — Slice 3 ("Crear portal") of `docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md`
 * §17.2. `displayName`/`serviceType`/`description` are real fields as of
 * this pass (the user reversed an earlier "not yet" decision — see §17.2's
 * "Historial" for the full reasoning) and the logo is real, local-disk
 * storage — not a decorative uploader.
 */
const ONE_PX_TRANSPARENT_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL('/');
}

test.describe('Create Portal — real E2E against PostgreSQL (Slice 3)', () => {
  test('SUPERADMIN creates a portal with the default (active) toggle', async ({ page }) => {
    await login(page, DEMO_USERS.superadmin.email, DEMO_USERS.superadmin.password);

    await page.goto('/portales');
    await page.getByRole('button', { name: 'Nuevo portal' }).click();

    const name = `E2E Portal ${Date.now()}`;
    await page.getByLabel(/Nombre del portal/).fill(name);
    await page.getByLabel(/Nombre de visualización/).fill('E2E Plataforma');
    await page.getByLabel(/Tipo de servicio/).fill('Educación');
    await page.getByLabel(/Descripción/).fill('Portal de prueba E2E.');
    // Toggle defaults ON — leave it untouched for this case.

    const createPromise = page.waitForResponse(
      (r) => /\/api\/v1\/portals$/.test(r.url()) && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Guardar' }).click();
    const createResponse = await createPromise;
    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()) as { status: string; displayName: string };
    expect(created.status).toBe('ACTIVE');
    expect(created.displayName).toBe('E2E Plataforma');

    await expect(page.getByText('Portal creado correctamente.')).toBeVisible();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  });

  test('SUPERADMIN creates a portal with the toggle switched off — real INACTIVE, not just a decorative switch', async ({
    page,
  }) => {
    await login(page, DEMO_USERS.superadmin.email, DEMO_USERS.superadmin.password);

    await page.goto('/portales');
    await page.getByRole('button', { name: 'Nuevo portal' }).click();

    const name = `E2E Portal Inactive ${Date.now()}`;
    await page.getByLabel(/Nombre del portal/).fill(name);
    await page.getByLabel(/Nombre de visualización/).fill('E2E Plataforma Inactiva');
    await page.getByLabel(/Tipo de servicio/).fill('Salud');
    await page.getByLabel(/Descripción/).fill('Portal de prueba E2E inactivo.');

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

  test('creating a portal without the new required fields is rejected (real validation, not decorative asterisks)', async ({
    page,
  }) => {
    await login(page, DEMO_USERS.superadmin.email, DEMO_USERS.superadmin.password);

    await page.goto('/portales');
    await page.getByRole('button', { name: 'Nuevo portal' }).click();
    await page.getByLabel(/Nombre del portal/).fill(`E2E Portal Incompleto ${Date.now()}`);
    // displayName/serviceType/description left empty on purpose.
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Completa todos los campos obligatorios.')).toBeVisible();
  });

  test('logo upload: real file, real second HTTP call, served back with the right bytes/content-type', async ({
    page,
  }) => {
    await login(page, DEMO_USERS.superadmin.email, DEMO_USERS.superadmin.password);

    await page.goto('/portales');
    await page.getByRole('button', { name: 'Nuevo portal' }).click();

    const name = `E2E Portal Logo ${Date.now()}`;
    await page.getByLabel(/Nombre del portal/).fill(name);
    await page.getByLabel(/Nombre de visualización/).fill('E2E Plataforma Logo');
    await page.getByLabel(/Tipo de servicio/).fill('Comercio');
    await page.getByLabel(/Descripción/).fill('Portal de prueba E2E con logo.');

    await page
      .locator('#portal-logo-input')
      .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(ONE_PX_TRANSPARENT_PNG_BASE64, 'base64') });
    // Real client-side preview — proves the file was actually accepted, not just silently stored.
    await expect(page.getByText('Cambiar imagen')).toBeVisible();

    const createPromise = page.waitForResponse(
      (r) => /\/api\/v1\/portals$/.test(r.url()) && r.request().method() === 'POST',
    );
    const logoUploadPromise = page.waitForResponse(
      (r) => /\/api\/v1\/portals\/[^/]+\/logo$/.test(r.url()) && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Guardar' }).click();
    const createResponse = await createPromise;
    const created = (await createResponse.json()) as { id: string };
    const logoUploadResponse = await logoUploadPromise;
    expect(logoUploadResponse.status()).toBe(201);
    const withLogo = (await logoUploadResponse.json()) as { logoUrl: string };
    expect(withLogo.logoUrl).toBe(`/portals/${created.id}/logo`);

    // `logoUrl` is relative to the API's own prefix (`/api/v1`, `toPortal`'s
    // docblock in `packages/contracts/src/portals.ts`) — the same
    // `${API_BASE_URL}${logoUrl}` construction `PortalForm.tsx` itself uses.
    const logoRes = await page.request.get(`http://localhost:4100/api/v1${withLogo.logoUrl}`);
    expect(logoRes.status()).toBe(200);
    expect(logoRes.headers()['content-type']).toBe('image/png');
    expect(Buffer.compare(await logoRes.body(), Buffer.from(ONE_PX_TRANSPARENT_PNG_BASE64, 'base64'))).toBe(0);
  });

  test('editing a portal pre-fills the real displayName/serviceType/description, and saving persists the change', async ({
    page,
  }) => {
    await login(page, DEMO_USERS.superadmin.email, DEMO_USERS.superadmin.password);

    // Create a portal with known fields to edit.
    await page.goto('/portales');
    await page.getByRole('button', { name: 'Nuevo portal' }).click();
    const name = `E2E Portal Editar ${Date.now()}`;
    await page.getByLabel(/Nombre del portal/).fill(name);
    await page.getByLabel(/Nombre de visualización/).fill('Antes de editar');
    await page.getByLabel(/Tipo de servicio/).fill('Educación');
    await page.getByLabel(/Descripción/).fill('Descripción original.');
    const createPromise = page.waitForResponse(
      (r) => /\/api\/v1\/portals$/.test(r.url()) && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Guardar' }).click();
    await createPromise;
    await expect(page.getByText('Portal creado correctamente.')).toBeVisible();

    // Open its row's edit form.
    const row = page.getByRole('link', { name: new RegExp(name) }).locator('..');
    await row.getByTitle('ACCIONES').click();
    await page.getByRole('menuitem', { name: 'Editar' }).click();

    await expect(page.getByLabel(/Nombre de visualización/)).toHaveValue('Antes de editar');
    await expect(page.getByLabel(/Tipo de servicio/)).toHaveValue('Educación');
    await expect(page.getByLabel(/Descripción/)).toHaveValue('Descripción original.');

    await page.getByLabel(/Nombre de visualización/).fill('Después de editar');
    const patchPromise = page.waitForResponse(
      (r) => /\/api\/v1\/portals\/[^/]+$/.test(r.url()) && r.request().method() === 'PATCH',
    );
    await page.getByRole('button', { name: 'Guardar' }).click();
    const patchResponse = await patchPromise;
    const patched = (await patchResponse.json()) as { displayName: string };
    expect(patched.displayName).toBe('Después de editar');
    await expect(page.getByText('Portal actualizado correctamente.')).toBeVisible();
  });
});
