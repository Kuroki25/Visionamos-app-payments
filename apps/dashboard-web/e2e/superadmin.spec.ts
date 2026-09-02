import { expect, test } from '@playwright/test';

import { DEMO_USERS } from './fixtures';

/**
 * REAL E2E — SUPERADMIN happy path against the real backend. Closes the
 * gap documented in `docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md` §7.2/§11.3
 * ("SUPERADMIN camino de éxito INFERIDO", no seeded credentials). Uses a
 * dedicated `e2e-superadmin@example.com` account (`apps/api/src/scripts/
 * seed-e2e-superadmin.ts`) — never the original bootstrap SUPERADMIN,
 * whose password is unknown and was never touched.
 *
 * Real IDs from `apps/api/src/scripts/seed-demo.ts`, same as
 * `e2e/rbac.spec.ts` — reused here to prove SUPERADMIN's GLOBAL scope
 * reaches exactly the resources `rbac.spec.ts` shows ADMIN_PORTAL/
 * ADMIN_COMMERCE get a real 403 on (Otrahuilca portal for adminAvanza,
 * Hotel Avanza Plaza commerce for adminUniversidadAvanza) — the same
 * backend guards, a different, real, elevated authorization outcome.
 */
const AVANZA_PORTAL_ID = '5c95138e-25e0-4487-84e6-ce745ebaf5e5';
const OTRAHUILCA_PORTAL_ID = '08339759-847b-4263-a19c-dad3042002fc';
const HOTEL_AVANZA_COMMERCE_ID = 'd2ffc0b0-207d-4c19-9e19-8953a53a356c';

test.describe('SUPERADMIN — real happy path against the real backend', () => {
  test('login → sesión SUPERADMIN real → acceso global (portal/aliado ajenos a un admin con scope) → operación permitida → logout', async ({
    page,
    context,
  }) => {
    // --- Login real, sesión Better Auth real ---
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(DEMO_USERS.superadmin.email);
    await page.getByLabel('Contraseña').fill(DEMO_USERS.superadmin.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL('/');
    await expect(page.getByRole('heading', { name: 'Dashboard Principal' })).toBeVisible();

    const sessionCookie = (await context.cookies()).find((c) => c.name.includes('better-auth.session_token'));
    expect(sessionCookie?.httpOnly).toBe(true);

    // --- La sesión identifica realmente SUPERADMIN (no solo un botón visible) ---
    await expect(page.getByText('Superadministrador')).toBeVisible();

    // --- Acceso global real: ve TODOS los portales, no solo uno (contraste con ADMIN_PORTAL en rbac.spec.ts) ---
    await page.goto('/portales');
    await expect(page.getByRole('heading', { name: 'Gestión de Portales' })).toBeVisible();
    await expect(page.getByText('Avanza', { exact: true })).toBeVisible();
    await expect(page.getByText('Otrahuilca', { exact: true })).toBeVisible();
    await expect(page.getByText('Coopenjo', { exact: true })).toBeVisible();

    // --- Acceso a portal ajeno al scope de un ADMIN_PORTAL: 200 real, no "No tienes acceso" ---
    await page.goto(`/portales/${OTRAHUILCA_PORTAL_ID}`);
    await expect(page.getByRole('heading', { name: 'Otrahuilca' })).toBeVisible();
    await expect(page.getByText('No tienes acceso')).not.toBeVisible();

    // --- Acceso a aliado ajeno al scope de un ADMIN_COMMERCE: 200 real ---
    await page.goto(`/portales/${AVANZA_PORTAL_ID}/aliados/${HOTEL_AVANZA_COMMERCE_ID}`);
    await expect(page.getByRole('heading', { name: 'Hotel Avanza Plaza' })).toBeVisible();
    await expect(page.getByText('No tienes acceso')).not.toBeVisible();

    // --- Operación permitida apropiada: PATCH real sobre un portal fuera del
    // alcance de cualquier ADMIN_PORTAL sembrado — el backend lo autoriza
    // para SUPERADMIN. Renombra al mismo nombre (sin cambio de negocio,
    // mismo patrón ya usado en e2e/accessibility.spec.ts) para que la
    // prueba sea repetible sin acumular datos. ---
    await page.goto('/portales');
    const otrahuilcaRow = page.getByRole('link', { name: /Otrahuilca/ }).locator('..');
    await otrahuilcaRow.getByTitle('ACCIONES').click();
    await otrahuilcaRow.getByRole('button', { name: 'Editar' }).click();

    const patchPromise = page.waitForResponse(
      (r) => /\/api\/v1\/portals\/[^/]+$/.test(r.url()) && r.request().method() === 'PATCH',
    );
    await page.getByLabel(/Nombre del portal/).fill('Otrahuilca');
    await page.getByRole('button', { name: 'Guardar' }).click();

    const patchResponse = await patchPromise;
    expect(patchResponse.status()).toBe(200);
    await expect(page.getByText('Portal actualizado correctamente.')).toBeVisible();

    // --- Logout real ---
    await page.getByTitle('Cerrar sesión').click();
    await page.waitForURL(/\/login$/);
    expect((await context.cookies()).some((c) => c.name.includes('better-auth.session_token'))).toBe(false);

    // --- Ruta protegida tras logout vuelve a redirigir — la sesión ya no existe realmente ---
    await page.goto('/portales');
    await expect(page).toHaveURL(/\/login$/);
  });
});
