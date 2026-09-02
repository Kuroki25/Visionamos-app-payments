/**
 * Copy for the "Inicio" screen (`app/(dashboard)/page.tsx`) — matches
 * Claude Design's `titles.inicio` and the Inicio section of
 * "RedCoop Dashboard.dc.html".
 */
export const dashboardHome = {
  title: 'Dashboard Principal',
  subtitle: 'Resumen general del sistema de pagos',
  flowCard: {
    title: 'Flujo de transacciones',
    subtitle: 'Comparativo con el periodo anterior',
    live: 'Tiempo real',
    current: 'Este periodo',
    previous: 'Periodo anterior',
  },
  goalCard: {
    title: 'Meta mensual',
    subtitle: 'Meta establecida para este mes',
    changeVsLastMonth: '↗ +10% vs mes pasado',
    todayPrefix: 'Hoy recaudaste ',
    todaySuffix: ', más que el mismo día del mes pasado. ¡Sigue así!',
  },
  recentTx: {
    title: 'Últimas transacciones',
    subtitle: 'Actividad reciente del sistema',
    viewAll: 'Ver todas',
  },
  /**
   * "Ingresos/Egresos/Transacciones totales /mes" con % de cambio, la
   * gráfica de flujo y la meta mensual no tienen endpoint agregado en el
   * backend todavía (no existe `GET /transactions/summary` ni concepto de
   * "meta mensual" en `@repo/contracts`) — ver
   * `features/dashboard-overview/api/get-overview-metrics.ts` y la sección
   * "Datos estáticos → datos reales" del handoff analysis.
   */
  metricsPendingNote:
    'Estas métricas usan datos de referencia hasta que exista un endpoint agregado en el backend.',
} as const;
