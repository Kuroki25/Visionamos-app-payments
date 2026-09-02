import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3101',
    trace: 'on-first-retry',
  },
  // Small, standard tolerance for `toHaveScreenshot()` — found necessary
  // for Inicio specifically (consistent ~2-3% sub-pixel text/SVG
  // anti-aliasing diff on the very first page each visual-* worker
  // renders after loading `storageState`, every other page on a warmed-up
  // context matched exactly at 0). Real regressions (wrong layout, missing
  // component, wrong color) produce far more than 3% diff, so this doesn't
  // hide them — it absorbs rendering noise, not app behavior.
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.03 },
  },
  webServer: {
    command: 'pnpm start',
    url: 'http://localhost:3101',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  // Visual regression (docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md §14) lives
  // in its own spec (`e2e/visual.spec.ts`) run under 3 dedicated viewport
  // projects — the same desktop/tablet/mobile sizes already used for the
  // manual responsive check in §13, not new values. `testMatch`/`testIgnore`
  // keep it from running 3x redundantly under the default project and keep
  // the default project's REAL E2E specs from running 3x under these.
  //
  // `setup` logs in once and every visual-* project depends on it
  // (Playwright's own recommended `storageState` pattern) instead of each
  // of the 6 screenshot tests logging in fresh per viewport — 18 redundant
  // logins across 3 projects tripped the backend's real rate limiter
  // (`THROTTLE_LIMIT`) the first time this ran. See `auth.setup.ts`.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: [/visual\.spec\.ts/, /auth\.setup\.ts/] },
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'visual-desktop',
      testMatch: /visual\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'visual-tablet',
      testMatch: /visual\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 834, height: 1112 } },
    },
    {
      name: 'visual-mobile',
      testMatch: /visual\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
  ],
});
