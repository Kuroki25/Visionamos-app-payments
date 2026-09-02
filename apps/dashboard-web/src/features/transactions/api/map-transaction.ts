import type { Transaction } from '@repo/contracts';

import { paymentMethodLabels, transactionStatus } from '../../../content/es/transactions';
import { formatCOP, formatDateEs } from '../../../lib/format';
import type { TxRow } from '../types';

/** `Transaction` (API DTO) → `TxRow` (view model). See `types.ts`. */
export function toTxRow(tx: Transaction): TxRow {
  const status = transactionStatus[tx.status];
  return {
    // Real ids are UUIDs, not the mock's short sequential numbers — this
    // keeps the table's visual shape (a short `#xxxxxx` tag) without
    // inventing a fake sequential id.
    id: '#' + tx.id.slice(0, 6).toUpperCase(),
    fecha: formatDateEs(tx.createdAt),
    metodo: paymentMethodLabels[tx.method],
    monto: formatCOP(tx.amount),
    estadoLabel: status.label,
    estadoTone: status.tone,
  };
}

/**
 * `GET /transactions` has no `limit`/`sort` query params (read-only,
 * scope-filtered only — see `transactions.controller.ts`), so "most
 * recent N" is done client/server-side here rather than assuming backend
 * ordering.
 */
export function recentTxRows(transactions: Transaction[], limit: number): TxRow[] {
  return [...transactions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map(toTxRow);
}
