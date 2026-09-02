/**
 * Real credentials for `apps/api`'s seeded demo data
 * (`apps/api/src/scripts/seed-demo.ts`, run against the local dev
 * Postgres via `pnpm --filter api seed:demo`). `DEMO_PASSWORD` is the
 * exact literal from that already-committed script — referencing it here
 * introduces no new exposure. These tests are real E2E: they need the
 * demo seed to exist in whatever Postgres `apps/api` is pointed at when
 * `pnpm test:e2e` runs, not a mock.
 */
export const DEMO_PASSWORD = 'a-strong-password-123';

export const DEMO_USERS = {
  /** ADMIN_PORTAL, scoped to portal "Avanza". */
  adminAvanza: { email: 'admin.avanza@example.com', password: DEMO_PASSWORD },
  /** ADMIN_PORTAL, scoped to portal "Otrahuilca" — used for cross-tenant checks against adminAvanza. */
  adminOtrahuilca: { email: 'admin.otrahuilca@example.com', password: DEMO_PASSWORD },
  /** ADMIN_COMMERCE, scoped to the "Universidad Avanza" commerce (inside portal Avanza). */
  adminUniversidadAvanza: { email: 'admin.universidad-avanza@example.com', password: DEMO_PASSWORD },
  /** VIEWER, scoped to portal "Avanza". */
  viewerAvanza: { email: 'viewer.avanza@example.com', password: DEMO_PASSWORD },
} as const;
