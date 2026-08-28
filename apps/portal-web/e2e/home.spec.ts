import { expect, test } from '@playwright/test';

test('portal-web home page loads and renders the shared UI kit', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Portal Visionamos' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Comenzar' })).toBeVisible();
});
