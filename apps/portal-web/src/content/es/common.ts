/**
 * Centralized, statically-typed application text — Spanish only for now,
 * deliberately no i18n library yet (portal-web master prompt §22 — "no
 * agregues automáticamente next-intl/i18next si no existe requerimiento
 * multiidioma"). Only static UI copy belongs here: titles, labels, buttons,
 * generic messages. Never backend-obtained names/descriptions/logos (those
 * are entity content, fetched from the API) — portal-web master prompt §21.
 */
export const common = {
  appName: 'RedCoop Pagos',
  appDescription: 'Portal público de pagos de Red Coopagos: encuentra tu portal y paga a tus comercios aliados.',
  search: 'Buscar',
  genericError: 'Ocurrió un error. Inténtalo de nuevo.',
  loading: 'Cargando...',
} as const;
