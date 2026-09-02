/**
 * Copy for the persistent admin chrome (sidebar + topbar) — see
 * `docs/frontend/design-handoff/DASHBOARD_INICIO_HANDOFF_ANALYSIS.md` for
 * where these strings come from (Claude Design "RedCoop Dashboard.dc.html").
 * Only static labels live here — page titles/subtitles are per-route and
 * live in each page's own content module.
 */
export const nav = {
  brand: 'RedCoop',
  brandSub: 'pagos',
  menuLabel: 'MENÚ',
  toggleSidebar: 'Menú',
  items: {
    inicio: 'Inicio',
    transacciones: 'Transacciones',
    portales: 'Portales',
    usuarios: 'Usuarios',
    configuracion: 'Configuración',
  },
  darkMode: 'Modo oscuro',
  notifications: 'Notificaciones',
  notificationsTitle: 'Notificaciones',
  notificationsEmpty: 'No tienes notificaciones nuevas.',
  markAllRead: 'Marcar todas leídas',
  searchPlaceholder: 'Buscar o escribir un comando...',
  // The design never depicted a sign-out affordance (no login/logout was
  // in its original scope) — added once real login made a real way to
  // leave the session necessary too.
  logOut: 'Cerrar sesión',
} as const;
