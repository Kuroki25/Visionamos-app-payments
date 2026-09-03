import { expect, test } from '@playwright/test';

import { DEMO_USERS } from './fixtures';

/**
 * REAL E2E — Slice 2 ("Crear usuario") of `docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md`
 * §17.1. Covers the backend gap closed in this pass: the admin no longer
 * chooses a password — `POST /users` generates one server-side and returns
 * it exactly once as `temporaryPassword`, shown in `CredentialReveal`
 * (`UserForm.tsx`). This test proves the whole chain for real: the API
 * response carries it, the UI shows it, and it actually authenticates —
 * not just that a field exists.
 */
test.describe('Create User — real E2E against Better Auth + PostgreSQL (Slice 2)', () => {
  test('SUPERADMIN creates a VIEWER, sees the one-time provisional password in the UI, and it really logs in', async ({
    page,
    browser,
  }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(DEMO_USERS.superadmin.email);
    await page.getByLabel('Contraseña').fill(DEMO_USERS.superadmin.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL('/');

    await page.goto('/usuarios');
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();

    const email = `e2e-created-${Date.now()}@example.com`;
    await page.getByLabel('Nombre completo').fill('E2E Created User');
    await page.getByLabel('Correo electrónico').fill(email);
    // Role defaults to VIEWER, scope defaults to Global — no extra fields
    // required, matching CreateUserSchema (§17.5: VIEWER with no scope
    // defaults to GLOBAL).

    const createPromise = page.waitForResponse(
      (r) => /\/api\/v1\/users$/.test(r.url()) && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Crear' }).click();
    const createResponse = await createPromise;
    expect(createResponse.status()).toBe(201);

    const created = (await createResponse.json()) as { email: string; temporaryPassword: string };
    expect(created.email).toBe(email);
    expect(typeof created.temporaryPassword).toBe('string');
    expect(created.temporaryPassword.length).toBeGreaterThanOrEqual(12);

    // Shown once, in the modal — real UI evidence, not just the API shape.
    await expect(page.getByText('Usuario creado correctamente')).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByText(created.temporaryPassword)).toBeVisible();

    await page.getByRole('button', { name: 'Listo' }).click();
    await expect(page.getByText('Usuario creado correctamente.')).toBeVisible();
    // Modal closed, list refreshed — the new user is now a real row.
    await expect(page.getByText(email)).toBeVisible();

    // Real login proof with the exact password the admin was shown — a
    // fabricated/decorative field would fail here. A fresh, cookie-less
    // context: `/login` redirects away when a session already exists
    // (see `e2e/visual.spec.ts`'s docblock), and this browser is still
    // logged in as SUPERADMIN.
    const freshContext = await browser.newContext();
    const newPage = await freshContext.newPage();
    await newPage.goto('/login');
    await newPage.getByLabel('Correo electrónico').fill(email);
    await newPage.getByLabel('Contraseña').fill(created.temporaryPassword);
    await newPage.getByRole('button', { name: 'Iniciar sesión' }).click();
    await newPage.waitForURL('/');
    await expect(newPage.getByText('Visor')).toBeVisible();
    await freshContext.close();
  });

  test('GET /users/:id never returns the provisional password again', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(DEMO_USERS.superadmin.email);
    await page.getByLabel('Contraseña').fill(DEMO_USERS.superadmin.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL('/');

    await page.goto('/usuarios');
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    const email = `e2e-created-noget-${Date.now()}@example.com`;
    await page.getByLabel('Nombre completo').fill('E2E No Get User');
    await page.getByLabel('Correo electrónico').fill(email);

    const createPromise = page.waitForResponse(
      (r) => /\/api\/v1\/users$/.test(r.url()) && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Crear' }).click();
    const created = (await (await createPromise).json()) as { id: string };
    await page.getByRole('button', { name: 'Listo' }).click();

    // `page.request` shares the browsing context's cookie jar (including
    // httpOnly ones), so the real session cookie rides along automatically.
    const getResponse = await page.request.get(`http://localhost:4100/api/v1/users/${created.id}`);
    const body = (await getResponse.json()) as Record<string, unknown>;
    expect(body).not.toHaveProperty('temporaryPassword');
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('passwordHash');
  });
});
