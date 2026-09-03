/**
 * Copy for "Gestión de Portales" and the portal-form modal. Matches Claude
 * Design's `titles.portales` / `isPortales` section. `displayName`/
 * `serviceType`/`description`/logo (`@repo/contracts`) are real fields as
 * of docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md §17.2 — `serviceType` is
 * free text, not the closed dropdown the reference image shows, since no
 * confirmed category list exists (see the entity's own docblock).
 */
export const portalesPage = {
  title: 'Gestión de Portales',
  subtitle: 'Administra los portales de comercios aliados',
  searchPlaceholder: 'Escribe el nombre del portal',
  newPortal: 'Nuevo portal',
  empty: 'No se encontraron portales con ese nombre.',
  columns: { portal: 'PORTAL', aliados: 'ALIADOS', transacciones: 'TRANSACCIONES', estado: 'ESTADO', acciones: 'ACCIONES' },
  stats: {
    totalPortales: 'Total de portales',
    totalAliados: 'Total de aliados',
    transacciones: 'Transacciones',
    totalProcesado: 'Total procesado',
  },
  menu: { view: 'Ver portal', edit: 'Editar', enable: 'Habilitar', disable: 'Deshabilitar' },
  aliadosSuffix: { singular: 'comercio aliado', plural: 'comercios aliados' },
  modal: {
    createTitle: 'Agregar nuevo portal',
    createSubtitle: 'Registra un nuevo portal de comercios aliados',
    editTitle: 'Editar portal',
    editSubtitle: 'Actualiza la información del portal',
    nameLabel: 'Nombre del portal',
    namePlaceholder: 'Ej. Red Avanza',
    displayNameLabel: 'Nombre de visualización',
    displayNamePlaceholder: 'Ej. Plataforma Avanza',
    displayNameHint: 'Nombre que verán los usuarios',
    serviceTypeLabel: 'Tipo de servicio',
    serviceTypePlaceholder: 'Ej. Educación',
    descriptionLabel: 'Descripción',
    descriptionPlaceholder: 'Describe brevemente los servicios que ofrece este portal.',
    descriptionMaxLength: 500,
    descriptionCounterSuffix: 'caracteres',
    logoLabel: 'Logotipo del portal',
    logoDropText: 'Clic para subir o arrastra una imagen',
    logoDropHint: 'PNG, JPG, WebP (máx. 5MB)',
    logoChange: 'Cambiar imagen',
    logoInvalidTypeError: 'El logotipo debe ser PNG, JPG o WebP.',
    logoTooLargeError: 'El logotipo no puede superar los 5MB.',
    logoUploadError: 'El portal se creó, pero no se pudo subir el logotipo. Podés intentarlo de nuevo desde Editar.',
    requiredError: 'Completa todos los campos obligatorios.',
    activeLabel: 'Portal activo',
  },
  toasts: {
    created: 'Portal creado correctamente.',
    updated: 'Portal actualizado correctamente.',
    enabled: 'Portal habilitado.',
    disabled: 'Portal deshabilitado.',
  },
  // `${prefix}${portal.name}${suffix}` — kept as split fragments (not a
  // template function) to match this app's content-file convention (see
  // `content/es/dashboardHome.ts`'s `goalCard.todayPrefix/todaySuffix`).
  confirmDisable: { title: 'Deshabilitar portal', messagePrefix: '¿Seguro que deseas deshabilitar "', messageSuffix: '"? Sus aliados dejarán de operar.' },
  confirmEnable: { title: 'Habilitar portal', messagePrefix: '¿Confirmas que quieres volver a habilitar "', messageSuffix: '"?' },
} as const;
