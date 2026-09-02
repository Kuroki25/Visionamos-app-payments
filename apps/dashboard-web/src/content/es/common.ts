/**
 * Centralized, statically-typed application text — Spanish only for now,
 * deliberately no i18n library yet
 * (docs/frontend/DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md, "Textos y contenido").
 * Only static UI copy belongs here: titles, labels, buttons, generic
 * messages. Never backend-obtained names, dynamic data, or entity content.
 */
export const common = {
  appName: 'Dashboard Visionamos',
  /** `<meta name="description">`. */
  appDescription: 'Panel administrativo de Visionamos',
} as const;
