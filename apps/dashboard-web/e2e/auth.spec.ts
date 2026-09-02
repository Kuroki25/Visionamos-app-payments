import { expect, test } from '@playwright/test';

import { DEMO_USERS } from './fixtures';

/**
 * REAL E2E — real Better Auth, real session cookie, real Postgres-backed
 * demo user. Not mocked, not a bypassed session (see
 * `docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md`, "Testing" for the
 * REAL/MOCKED distinction).
 */
test.describe('Better Auth — real login/session/logout journey', () => {
  test('wrong password is rejected and never creates a session', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(DEMO_USERS.adminAvanza.email);
    await page.getByLabel('Contraseña').fill('definitely-the-wrong-password');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page.getByText(/[Cc]orreo o contraseña incorrectos/)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect((await page.context().cookies()).some((c) => c.name.includes('better-auth.session_token'))).toBe(false);
  });

  test('real login → dashboard → refresh persists → direct nav to a protected route → logout → protected route redirects again', async ({
    page,
    context,
  }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(DEMO_USERS.adminAvanza.email);
    await page.getByLabel('Contraseña').fill(DEMO_USERS.adminAvanza.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL('/');
    await expect(page.getByRole('heading', { name: 'Dashboard Principal' })).toBeVisible();

    const sessionCookie = (await context.cookies()).find((c) => c.name.includes('better-auth.session_token'));
    expect(sessionCookie?.httpOnly).toBe(true);

    // Refresh persists the session.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Dashboard Principal' })).toBeVisible();

    // Direct navigation to a different protected route.
    await page.goto('/usuarios');
    await expect(page.getByRole('heading', { name: 'Gestión de Usuarios' })).toBeVisible();

    // Browser back/forward.
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Dashboard Principal' })).toBeVisible();
    await page.goForward();
    await expect(page.getByRole('heading', { name: 'Gestión de Usuarios' })).toBeVisible();

    // Real logout.
    await page.getByTitle('Cerrar sesión').click();
    await page.waitForURL(/\/login$/);
    expect((await context.cookies()).some((c) => c.name.includes('better-auth.session_token'))).toBe(false);

    // Protected route after logout redirects again — the session is really gone, not just the UI's belief about it.
    await page.goto('/portales');
    await expect(page).toHaveURL(/\/login$/);
  });
});
