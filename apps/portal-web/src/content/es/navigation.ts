/**
 * `PublicHeader` copy (`01-public-home-directory.png`). `misPagos` is
 * rendered — the reference shows it — but its destination is an honest
 * "próximamente" placeholder, not invented payment history: no backend
 * model for a payer's own payment history exists yet (master prompt §19:
 * "clasifica como DEFER" when the capability isn't backend-confirmed; see
 * PORTAL_WEB_SOURCE_OF_TRUTH.md, "Known Limitations").
 */
export const navigation = {
  portalLabel: 'Portal',
  brandName: 'Redcoop',
  brandNameAccent: 'pagos',
  brandBadge: 'PSE',
  inicio: 'Inicio',
  preguntasFrecuentes: 'Preguntas frecuentes',
  misPagos: 'Mis Pagos',
  soporte: 'Soporte',
} as const;
