import { expect, test } from '@playwright/test';

// `/` is now the real Inicio dashboard behind `(dashboard)/layout.tsx`'s
// session check. Playwright has no Better Auth session here, so this
// smoke test exercises the honest "not authenticated" fallback
// (`UnauthenticatedNotice`) rather than a login flow that doesn't exist
// yet (see the design handoff analysis — login is out of scope for this
// pass).
test('dashboard-web home page loads and shows the unauthenticated fallback', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Dashboard Visionamos' })).toBeVisible();
  await expect(page.getByRole('alert')).toBeVisible();
});
