import { expect, test } from '@playwright/test';

test('dashboard-web home page loads and renders the shared UI kit', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Dashboard Visionamos' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver reportes' })).toBeVisible();
});
