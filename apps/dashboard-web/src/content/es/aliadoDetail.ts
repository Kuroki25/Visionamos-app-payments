/**
 * Copy for the Aliado detail screen. Adapted to what's real per tab — see
 * `lib/aliado-detail.ts`'s docblock for the full mock-vs-real breakdown.
 */
export const aliadoDetailPage = {
  subtitle: 'Operación y actividad del aliado',
  sinceLabel: 'Aliado desde',
  tabs: {
    resumen: 'Resumen',
    transacciones: 'Transacciones',
    movimientos: 'Movimientos',
    metodos: 'Métodos de pago',
    informes: 'Informes',
    informacion: 'Información',
  },
  comingSoon: {
    // Neither has any backing concept in the backend at all — `Commerce`'s
    // own docblock says settlement/ledger is "explicitly-pending", and
    // there is no reports/documents module — so these stay honestly
    // unbuilt rather than faking a balance or a document list.
    movimientos: 'El detalle de movimientos y saldo llegará junto con la cuenta de liquidación — próximamente.',
    informes: 'La generación de informes descargables — próximamente.',
  },
  resumen: {
    performanceTitle: 'Rendimiento por periodo',
    activityTitle: 'Actividad reciente',
    noActivity: 'Sin transacciones registradas todavía.',
    stats: {
      total: 'Total procesado',
      count: 'Transacciones',
      approved: 'Aprobadas',
      pending: 'Pendientes',
      rejected: 'Rechazadas',
      cancelled: 'Canceladas',
    },
  },
  metodos: {
    empty: 'Sin transacciones registradas todavía.',
    opsSuffix: 'ops',
  },
  informacion: {
    legalName: 'Razón social',
    taxId: 'NIT',
    category: 'Categoría',
    city: 'Ciudad',
    address: 'Dirección',
    contactName: 'Nombre de contacto',
    contactEmail: 'Email de contacto',
    contactPhone: 'Teléfono',
    createdAt: 'Fecha de incorporación',
  },
  notFound: 'No se encontró el aliado solicitado.',
} as const;
