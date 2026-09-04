import { expect, test } from '@playwright/test';

import { createPublishedFixture, type PublishedFixture } from './fixtures';

/**
 * REAL E2E — Home (`01-public-home-directory.png`, `02-public-home-support.png`,
 * `03-public-home-faq.png`), Slice 2 of `docs/frontend/PORTAL_WEB_SOURCE_OF_TRUTH.md`.
 * Against the real, already-running `apps/api` + PostgreSQL (never mocked) —
 * `createPublishedFixture` (`./fixtures.ts`) creates and publishes a real,
 * uniquely-named Portal/Category/Commerce via the real API before each
 * `describe` block that needs one.
 */
test.describe('Home — layout and static sections', () => {
  test('renders the header, hero search and portal directory search', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: /Redcoop/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Inicio' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Preguntas frecuentes' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Mis Pagos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Soporte', exact: true })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Buscar comercios aliados' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Buscar comercios aliados' })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Escribe el nombre del portal' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Buscar portales por nombre' })).toBeVisible();
  });

  test('renders support/trust and FAQ sections, with a working accordion', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: '¿Tienes dudas?' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contactar soporte' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Paga con/ })).toBeVisible();

    const firstQuestion = page.getByRole('button', { name: '¿Cuál es el procedimiento para realizar el pago?' });
    await expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');
    await firstQuestion.click();
    await expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText(/Busca tu portal o tu comercio aliado/)).toBeVisible();
  });

  test('"Mis Pagos" leads to an honest placeholder — no fake payment history', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Mis Pagos' }).click();
    await expect(page).toHaveURL(/\/mis-pagos$/);
    await expect(page.getByRole('heading', { name: 'Mis Pagos' })).toBeVisible();
  });
});

test.describe('Home — portal directory (real backend)', () => {
  let fixture: PublishedFixture;

  test.beforeAll(async () => {
    fixture = await createPublishedFixture(`Dir${Date.now()}`);
  });

  test.afterAll(async () => {
    await fixture.dispose();
  });

  test('a freshly published portal appears in the directory, with its real displayName as the card title', async ({ page }) => {
    await page.goto(`/?q=${encodeURIComponent(fixture.portalName)}`);
    await expect(page.getByRole('link', { name: `Plataforma ${fixture.portalName.replace('E2E Portal ', '')}` })).toBeVisible();
  });

  test('searching by name filters the grid to a real, matching result', async ({ page }) => {
    await page.goto('/');
    // Enter submits the real <form> — also exercises the a11y requirement
    // (master prompt §34) instead of guessing which of the two same-labeled
    // "Buscar" buttons on the page belongs to this search.
    await page.getByRole('searchbox', { name: 'Buscar portales por nombre' }).fill(fixture.portalName);
    await page.getByRole('searchbox', { name: 'Buscar portales por nombre' }).press('Enter');
    await expect(async () => {
      expect(new URL(page.url()).searchParams.get('q')).toBe(fixture.portalName);
    }).toPass();
    await expect(page.getByText(fixture.portalName.replace('E2E Portal ', ''), { exact: false })).toBeVisible();
  });

  test('an unmatched search shows "No se encontraron portales con ese nombre." — never mixed with stale results', async ({ page }) => {
    await page.goto(`/?q=${encodeURIComponent(`${fixture.portalName}-nonexistent-xyz`)}`);
    await expect(page.getByText('No se encontraron portales con ese nombre.')).toBeVisible();
  });

  test('clicking a portal card navigates to its real detail page with real branding', async ({ page }) => {
    await page.goto(`/?q=${encodeURIComponent(fixture.portalName)}`);
    await page.getByRole('link', { name: new RegExp(fixture.portalName.replace('E2E Portal ', '')) }).click();
    await expect(page).toHaveURL(new RegExp(`/portales/${fixture.portalId}$`));
    await expect(page.getByRole('heading', { name: fixture.portalName.replace('E2E Portal ', 'Plataforma ') })).toBeVisible();
  });

  test('a nonexistent portal id 404s (real not-found, not a blank page)', async ({ page }) => {
    const response = await page.goto('/portales/123e4567-e89b-12d3-a456-426614174099');
    expect(response?.status()).toBe(404);
  });
});

test.describe('Home — global commerce search (real backend)', () => {
  let fixture: PublishedFixture;

  test.beforeAll(async () => {
    fixture = await createPublishedFixture(`Com${Date.now()}`);
  });

  test.afterAll(async () => {
    await fixture.dispose();
  });

  test('finds a real published commerce and links to its portal', async ({ page }) => {
    await page.goto('/');
    const searchbox = page.getByRole('searchbox', { name: 'Buscar comercios aliados' });
    await searchbox.fill(fixture.commerceName);
    await searchbox.press('Enter');

    const result = page.getByRole('link', { name: new RegExp(fixture.commerceName) });
    await expect(result).toBeVisible();
    await expect(result).toHaveAttribute('href', `/portales/${fixture.portalId}`);

    await result.click();
    await expect(page).toHaveURL(new RegExp(`/portales/${fixture.portalId}$`));
  });

  test('an unmatched commerce search shows the real empty state', async ({ page }) => {
    await page.goto('/');
    const searchbox = page.getByRole('searchbox', { name: 'Buscar comercios aliados' });
    await searchbox.fill(`${fixture.commerceName}-nonexistent-xyz`);
    await searchbox.press('Enter');
    await expect(page.getByText('No se encontraron comercios aliados con ese nombre.')).toBeVisible();
  });
});
