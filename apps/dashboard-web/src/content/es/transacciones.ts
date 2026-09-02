/**
 * Copy for the "Transacciones" screen — matches Claude Design's
 * `titles.transacciones` and the `isTx` section of
 * "RedCoop Dashboard.dc.html".
 */
export const transaccionesPage = {
  title: 'Gestión de Transacciones',
  subtitle: 'Administra y monitorea todas las transacciones del sistema',
  alerts: {
    title: 'Alertas de transacciones',
    newSuffix: 'nuevas',
    markAllRead: 'Marcar todas como leídas',
    newBadge: 'Nueva',
    /** Alert description: `{descLead} {id} {descBy} {monto} — {fecha}.` — no fabricated rejection reasons, only real fields (`lib/transactions.ts`, `toTxAlert`). */
    descLead: 'Transacción',
    descBy: 'por',
  },
  table: {
    title: 'Todas las transacciones',
    filterAll: 'Todos',
  },
} as const;
