import { expect, test } from '@playwright/test';

// `/` is the real Inicio dashboard behind `(dashboard)/layout.tsx`'s
// session check. Playwright has no Better Auth session here, so this
// smoke test exercises the real redirect to `/login` (a real page as of
// the E2E-closure pass) rather than a fake fallback.
test('unauthenticated visit to / redirects to the real login page', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
});
