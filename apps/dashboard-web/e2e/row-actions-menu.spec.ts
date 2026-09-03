import { expect, test } from '@playwright/test';

import { DEMO_USERS } from './fixtures';

/**
 * REAL E2E — regression coverage for the row-actions "⋮" dropdown documented
 * in `docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md` ("Functional UI Contracts
 * › Users"). The original hand-rolled `useState(openMenuId)` + `absolute`
 * `<div>` got clipped by the table's `overflow-hidden` (needed for the
 * rounded card corners) whenever there was no row below to give it room —
 * worst case, the very last row (see `docs/frontend/references/
 * 01-users-actions-current.png`). Replaced by `RowActionsMenu`
 * (`@radix-ui/react-dropdown-menu`, portals to `document.body`), which is
 * why assertions below query the page, not the row, for menu content.
 */
test.describe('Row actions menu — Radix dropdown (regression)', () => {
  test('Usuarios: last-row menu is fully visible and closes on Escape, click-outside, with keyboard nav and focus-return', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(DEMO_USERS.superadmin.email);
    await page.getByLabel('Contraseña').fill(DEMO_USERS.superadmin.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL('/');

    await page.goto('/usuarios');
    const triggers = page.getByTitle('ACCIONES');
    const lastTrigger = triggers.last();

    // Opens and is not clipped — the specific case the bug reproduced on.
    await lastTrigger.click();
    await expect(page.getByRole('menuitem', { name: 'Ver usuario' })).toBeVisible();

    // Escape closes it.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menuitem', { name: 'Ver usuario' })).toBeHidden();

    // Keyboard: Enter opens (first item auto-focused), ArrowDown moves to the next.
    await lastTrigger.focus();
    await lastTrigger.press('Enter');
    await expect(page.getByRole('menuitem', { name: 'Editar' })).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Editar' })).toBeFocused();
    await page.keyboard.press('Escape');

    // Click outside closes it.
    await lastTrigger.click();
    await expect(page.getByRole('menuitem', { name: 'Ver usuario' })).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(page.getByRole('menuitem', { name: 'Ver usuario' })).toBeHidden();

    // Focus returns to the trigger after close.
    await lastTrigger.click();
    await page.keyboard.press('Escape');
    await expect(lastTrigger).toBeFocused();
  });

  test('Portales: last-row menu is fully visible (same fix, second call site)', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(DEMO_USERS.superadmin.email);
    await page.getByLabel('Contraseña').fill(DEMO_USERS.superadmin.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL('/');

    await page.goto('/portales');
    await page.getByTitle('ACCIONES').last().click();
    await expect(page.getByRole('menuitem', { name: 'Ver portal' })).toBeVisible();
  });
});
