/**
 * Portal detail page copy (`/portales/[portalId]`). This is a deliberately
 * minimal Slice 3 start, not the full Portal detail page the master prompt
 * describes (categories/comercios/paginación — PORTAL_WEB_SOURCE_OF_TRUTH.md,
 * "Deferred Features") — it exists only so links from Home (portal cards,
 * commerce search results) have a real, honest destination instead of a
 * dead link or invented data.
 */
export const portalDetail = {
  comingSoonTitle: 'Comercios aliados de este portal',
  comingSoonMessage: 'Estamos construyendo el directorio de comercios aliados de este portal. Vuelve pronto.',
  backToHome: 'Volver al inicio',
} as const;

export const misPagos = {
  title: 'Mis Pagos',
  comingSoonMessage:
    'La consulta de tus pagos realizados estará disponible próximamente. Si necesitas el comprobante de un pago reciente, contacta a soporte.',
  backToHome: 'Volver al inicio',
} as const;
