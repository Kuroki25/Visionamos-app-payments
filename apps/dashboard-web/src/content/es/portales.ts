/**
 * Copy for "Gestión de Portales" and the portal-form modal. Matches Claude
 * Design's `titles.portales` / `isPortales` section, adapted to the real
 * `Portal` shape (`@repo/contracts`: only `name` — the mock's "nombre de
 * visualización", "tipo de servicio", "descripción" and "logo" fields
 * don't exist on the real entity, see `lib/portals.ts`'s docblock).
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
    requiredError: 'El nombre del portal es obligatorio.',
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
