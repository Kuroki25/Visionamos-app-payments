import { expect, test } from '@playwright/test';

import { DEMO_USERS } from './fixtures';

/**
 * REAL E2E — Slice 5 ("Alertas de transacciones") of
 * `docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md` §17.4, the `BACKEND_GAP`
 * this pass closes: real, per-user read/unread persistence
 * (`transaction_alert_reads`) behind "Marcar todas como leídas", which used
 * to have no `onClick` at all. Uses a dedicated fresh VIEWER (never used
 * before, so every alert starts genuinely unread) rather than
 * `e2e-superadmin`, whose read-state would carry over from earlier runs of
 * this very test and make "starts unread" unprovable.
 */
const AVANZA_PORTAL_ID = '5c95138e-25e0-4487-84e6-ce745ebaf5e5';

test.describe('Transaction Alerts — real E2E against PostgreSQL (Slice 5)', () => {
  test('unread alerts show the "Nueva" badge and a real unread count; "Marcar todas como leídas" persists across reload', async ({
    page,
    browser,
  }) => {
    // A fresh VIEWER scoped to Avanza, created via the real SUPERADMIN
    // session, the same pattern as e2e/create-user.spec.ts.
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(DEMO_USERS.superadmin.email);
    await page.getByLabel('Contraseña').fill(DEMO_USERS.superadmin.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL('/');

    await page.goto('/usuarios');
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    const email = `e2e-alerts-viewer-${Date.now()}@example.com`;
    await page.getByLabel('Nombre completo').fill('E2E Alerts Viewer');
    await page.getByLabel('Correo electrónico').fill(email);
    const createPromise = page.waitForResponse(
      (r) => /\/api\/v1\/users$/.test(r.url()) && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Crear' }).click();
    const created = (await (await createPromise).json()) as { temporaryPassword: string };
    await page.getByRole('button', { name: 'Listo' }).click();
    await page.getByTitle('Cerrar sesión').click();
    await page.waitForURL(/\/login$/);

    // Fresh, isolated context for the new VIEWER (never logged in before —
    // `/login` redirects away when a session already exists, and this
    // browser was just SUPERADMIN).
    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();
    await viewerPage.goto('/login');
    await viewerPage.getByLabel('Correo electrónico').fill(email);
    await viewerPage.getByLabel('Contraseña').fill(created.temporaryPassword);
    await viewerPage.getByRole('button', { name: 'Iniciar sesión' }).click();
    await viewerPage.waitForURL('/');

    await viewerPage.goto('/transacciones');
    await expect(viewerPage.getByText('Alertas de transacciones')).toBeVisible();

    const newBadges = viewerPage.getByText('Nueva', { exact: true });
    const initialUnread = await newBadges.count();
    expect(initialUnread).toBeGreaterThan(0);

    const markAllPromise = viewerPage.waitForResponse(
      (r) => /\/api\/v1\/transactions\/alerts\/read-all$/.test(r.url()) && r.request().method() === 'POST',
    );
    await viewerPage.getByRole('button', { name: 'Marcar todas como leídas' }).click();
    const markAllResponse = await markAllPromise;
    expect(markAllResponse.status()).toBe(200);
    const afterMark = (await markAllResponse.json()) as { isRead: boolean }[];
    expect(afterMark.every((a) => a.isRead)).toBe(true);

    // Real UI reaction: no more "Nueva" badges, no unread count pill.
    await expect(newBadges).toHaveCount(0);

    // Real persistence: a fresh page load re-fetches from the server —
    // still all read, not reset to "unread" on refresh.
    await viewerPage.reload();
    await expect(viewerPage.getByText('Alertas de transacciones')).toBeVisible();
    await expect(viewerPage.getByText('Nueva', { exact: true })).toHaveCount(0);

    await viewerContext.close();
  });

  test('alerts are scope-filtered server-side — a fresh ADMIN_PORTAL(Avanza) only ever sees alerts for their own portal', async ({
    page,
  }) => {
    // The Transacciones page fetches `/transactions/alerts` server-side
    // (Next.js Server Component, `serverApiClient`) — invisible to the
    // browser's own network tab, so `page.waitForResponse` would never see
    // it. `page.request` shares the same real session cookie and hits the
    // real API endpoint directly instead (same technique as
    // `e2e/create-user.spec.ts`'s "never returns the provisional password
    // again" test) — real scope enforcement, not a UI-rendering proxy for it.
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(DEMO_USERS.adminAvanza.email);
    await page.getByLabel('Contraseña').fill(DEMO_USERS.adminAvanza.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL('/');

    const alertsResponse = await page.request.get('http://localhost:4100/api/v1/transactions/alerts');
    expect(alertsResponse.status()).toBe(200);
    const alerts = (await alertsResponse.json()) as { portalId: string }[];
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.every((a) => a.portalId === AVANZA_PORTAL_ID)).toBe(true);
  });
});
