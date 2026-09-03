import type { Page, TestInfo } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { VISUAL_AUTH_FILE } from './visual-auth-file';

/**
 * VISUAL regression — NOT REAL E2E evidence (see
 * `docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md` §11.1, which keeps the two
 * categories separate on purpose). Baselines capture the screens Claude
 * Design already approved (§9 "Visual Contract", §18 "Historial") as they
 * render today — a diff here means "something changed since the design
 * was approved", to be triaged (regression vs. intentional change), never
 * auto-accepted with `--update-snapshots`.
 *
 * Runs under 3 dedicated viewport projects (`playwright.config.ts`:
 * visual-desktop/visual-tablet/visual-mobile — 1440×900/834×1112/390×844,
 * the same sizes already used for the manual responsive check in §13).
 * The 6 screens below run at all 3; `transacciones`/`configuracion` are
 * desktop-only — bonus coverage beyond the master prompt's minimum list,
 * skipped at tablet/mobile because their layout primitives (data table,
 * simple tabs/forms) are already exercised at every viewport by
 * `portales`/`usuarios` and `configuracion` respectively, so a second and
 * third copy would be redundant suite weight, not new risk coverage.
 *
 * Stability: `buildChart()` (Inicio's flow chart) is a pure function over
 * hardcoded demo constants, `formatDateEs` renders an absolute
 * `DD/MM/YYYY` (not relative-to-now), and the seed data's amounts/dates
 * are fixed at seed time — so authenticated pages are deterministic across
 * runs without masking or a frozen clock. Login runs unauthenticated, no
 * seed data involved. Auth uses the dedicated `e2e-superadmin` account
 * (`apps/api/src/scripts/seed-e2e-superadmin.ts`) so no page ever renders
 * a 403/empty-scope state instead of the approved design. Fonts/network
 * are awaited before every capture; Playwright disables CSS
 * animations/transitions for screenshot assertions by default.
 */
const AVANZA_PORTAL_ID = '5c95138e-25e0-4487-84e6-ce745ebaf5e5';
const UNIVERSIDAD_AVANZA_COMMERCE_ID = '75c52ec7-e04d-49b4-8834-c2761300c646';

async function stabilize(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
}

/** Skips the current test outside the given viewport project — see this file's docblock. */
function onlyOnProject(testInfo: TestInfo, name: string): void {
  test.skip(testInfo.project.name !== name, `Desktop-only baseline (bonus screen, see file docblock)`);
}

test('login', async ({ page }) => {
  await page.goto('/login');
  await stabilize(page);
  await expect(page).toHaveScreenshot('login.png', { fullPage: true });
});

test.describe('authenticated screens', () => {
  // Reuses the single login `auth.setup.ts` already performed (this
  // project's `dependencies`) instead of logging in fresh per test — see
  // that file's docblock for why (a real rate-limit hit, not a style
  // choice). The top-level `login` test above stays session-less on
  // purpose: `/login` redirects away when already authenticated.
  test.use({ storageState: VISUAL_AUTH_FILE });

  test('dashboard (Inicio)', async ({ page }) => {
    await stabilize(page);
    await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true });
  });

  test('portales', async ({ page }) => {
    await page.goto('/portales');
    await stabilize(page);
    await expect(page).toHaveScreenshot('portales.png', { fullPage: true });
  });

  test('portal detail', async ({ page }) => {
    await page.goto(`/portales/${AVANZA_PORTAL_ID}`);
    await stabilize(page);
    await expect(page).toHaveScreenshot('portal-detail.png', { fullPage: true });
  });

  test('aliado detail', async ({ page }) => {
    await page.goto(`/portales/${AVANZA_PORTAL_ID}/aliados/${UNIVERSIDAD_AVANZA_COMMERCE_ID}`);
    await stabilize(page);
    await expect(page).toHaveScreenshot('aliado-detail.png', { fullPage: true });
  });

  test('usuarios', async ({ page }) => {
    await page.goto('/usuarios');
    await stabilize(page);
    await expect(page).toHaveScreenshot('usuarios.png', { fullPage: true });
  });

  test('transacciones (desktop only)', async ({ page }, testInfo) => {
    onlyOnProject(testInfo, 'visual-desktop');
    await page.goto('/transacciones');
    await stabilize(page);
    await expect(page).toHaveScreenshot('transacciones.png', { fullPage: true });
  });

  test('configuración (desktop only)', async ({ page }, testInfo) => {
    onlyOnProject(testInfo, 'visual-desktop');
    await page.goto('/configuracion');
    await stabilize(page);
    await expect(page).toHaveScreenshot('configuracion.png', { fullPage: true });
  });
});
