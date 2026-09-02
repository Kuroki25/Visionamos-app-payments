import type { PaymentMethod, TransactionStatus } from '@repo/contracts';

/**
 * Spanish labels for the real `PaymentMethod`/`TransactionStatus` enums
 * (`@repo/contracts`, `transactions.ts`). Claude Design's `TxTable`
 * sub-component only ever mocked 3 statuses (Exitosa/Pendiente/Rechazado);
 * the real backend has 7 — this covers the full real set. See the handoff
 * analysis, item TRANSACTIONS.
 */
export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  PSE: 'PSE',
  DIGITAL_WALLET: 'Billetera digital',
};

export type StatusTone = 'success' | 'danger' | 'accent' | 'neutral';

export const transactionStatus: Record<TransactionStatus, { label: string; tone: StatusTone }> = {
  CREATED: { label: 'Creada', tone: 'neutral' },
  PENDING: { label: 'Pendiente', tone: 'accent' },
  PROCESSING: { label: 'Procesando', tone: 'accent' },
  APPROVED: { label: 'Aprobada', tone: 'success' },
  REJECTED: { label: 'Rechazada', tone: 'danger' },
  FAILED: { label: 'Fallida', tone: 'danger' },
  CANCELLED: { label: 'Cancelada', tone: 'neutral' },
};

export const txTable = {
  columns: {
    id: 'ID',
    fecha: 'FECHA',
    metodo: 'MÉTODO',
    tipo: 'TIPO',
    monto: 'MONTO',
    estado: 'ESTADO',
  },
  /**
   * The domain has no ingreso/egreso split for admin-visible transactions
   * (every `Transaction` is an incoming payment — see
   * `packages/contracts/src/transactions.ts`) — the mock's "↗ Ingreso" chip
   * becomes a single, honest "Pago" label instead of fabricating a
   * distinction the data doesn't carry.
   */
  tipoLabel: 'Pago',
  empty: 'Aún no hay transacciones para mostrar.',
} as const;
