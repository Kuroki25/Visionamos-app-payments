/**
 * `displayName`/`serviceType`/`description` became required on
 * `CreatePortalSchema` (docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md §17.2)
 * — every integration test that creates a portal purely as a fixture (not
 * testing Portal creation itself) spreads this into its payload so a
 * future required field only needs updating here, not at every call site.
 */
export const PORTAL_FIXTURE_FIELDS = {
  displayName: 'Plataforma de prueba',
  serviceType: 'Educación',
  description: 'Portal de prueba usado como fixture en tests de integración.',
};
