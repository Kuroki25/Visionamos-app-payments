import { test as setup } from '@playwright/test';

import { DEMO_USERS } from './fixtures';
import { VISUAL_AUTH_FILE } from './visual-auth-file';

/**
 * One-time login for `e2e/visual.spec.ts`'s authenticated screens —
 * Playwright's own recommended pattern for sharing a session across many
 * tests (`dependencies`/`storageState`), not a REAL E2E test itself (no
 * assertions here; `e2e/auth.spec.ts`/`superadmin.spec.ts` already cover
 * the real login journey).
 *
 * This exists to fix a real problem found while adding visual regression:
 * logging in fresh per screenshot test (6 screens × 3 viewports) tripped
 * the backend's real rate limiter (`THROTTLE_LIMIT=100`/60s,
 * `docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md` §15) under Playwright's
 * default parallelism — not a bug in the limiter, too much redundant load
 * from this suite. One login, reused via `storageState`, is the fix; the
 * limiter itself was never touched.
 */
setup('authenticate once for visual regression', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(DEMO_USERS.superadmin.email);
  await page.getByLabel('Contraseña').fill(DEMO_USERS.superadmin.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL('/');
  await page.context().storageState({ path: VISUAL_AUTH_FILE });
});
