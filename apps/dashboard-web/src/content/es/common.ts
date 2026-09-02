/**
 * Centralized, statically-typed application text — Spanish only for now,
 * deliberately no i18n library yet
 * (docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md, §10 "Textos (`content/es/`)").
 * Only static UI copy belongs here: titles, labels, buttons, generic
 * messages. Never backend-obtained names, dynamic data, or entity content.
 */
export const common = {
  appName: 'Dashboard Visionamos',
  /** `<meta name="description">`. */
  appDescription: 'Panel administrativo de Visionamos',
  // Generic action labels shared by every form/modal/confirm dialog.
  cancel: 'Cancelar',
  save: 'Guardar',
  saving: 'Guardando...',
  create: 'Crear',
  edit: 'Editar',
  delete: 'Eliminar',
  view: 'Ver',
  genericError: 'Ocurrió un error. Inténtalo de nuevo.',
} as const;
