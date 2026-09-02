import { expect, test } from '@playwright/test';

import { DEMO_USERS } from './fixtures';

/**
 * REAL E2E — regression coverage for the P1 accessibility gap documented in
 * `docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md` §12: `PerfilTab`,
 * `SeguridadTab`, `PortalForm`, `UserForm` and `CommerceForm` used a bare
 * `<button onClick>` with no real `<form>` — `Enter` inside a text field did
 * nothing for a keyboard-only user. All five are now `<form onSubmit>`.
 * This test exercises one of them for real against the backend; the fix is
 * the same generic mechanism in the other four (see PR that closed this gap),
 * not five independent implementations worth separately re-verifying here.
 */
test.describe('Accessibility — keyboard form submission (regression)', () => {
  test('Enter inside a text field submits the form, not just a click on the button', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(DEMO_USERS.adminAvanza.email);
    await page.getByLabel('Contraseña').fill(DEMO_USERS.adminAvanza.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL('/');

    await page.goto('/configuracion');
    const nameInput = page.getByLabel('Nombre completo');
    const currentName = await nameInput.inputValue();

    const patchPromise = page.waitForResponse(
      (r) => /\/api\/v1\/users\/[^/]+$/.test(r.url()) && r.request().method() === 'PATCH',
    );
    // Re-fill the same value (no business data changes) and press Enter
    // instead of clicking "Guardar".
    await nameInput.fill(currentName);
    await nameInput.press('Enter');

    const response = await patchPromise;
    expect(response.status()).toBe(200);
    await expect(page.getByText('Perfil actualizado correctamente.')).toBeVisible();
  });
});
