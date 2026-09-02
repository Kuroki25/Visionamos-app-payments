import type { Transaction } from '@repo/contracts';

import { transaccionesPage } from '../content/es/transacciones';
import { paymentMethodLabels, transactionStatus } from '../content/es/transactions';
import { formatCOP, formatDateEs } from './format';
import type { Tone } from './tone';

/**
 * View model for a `TxTable` row — decoupled from the `Transaction` API DTO
 * on purpose (`DASHBOARD_SOURCE_OF_TRUTH.md`, §8.3 "Contratos":
 * "API DTO ≠ View Model"). Lives in `lib/`, not a feature: it's shared by
 * every page that renders a transaction row (Inicio, Transacciones, and
 * later Aliado detail) — `features/*` may not import each other
 * (§5 "Reglas de dependencias"), so cross-page shared logic belongs here,
 * same as `lib/format.ts`/`lib/tone.ts`.
 */
export interface TxRow {
  id: string;
  fecha: string;
  metodo: string;
  monto: string;
  estadoLabel: string;
  estadoTone: Tone;
}

/** `Transaction` (API DTO) → `TxRow` (view model). */
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
 * "Alertas de transacciones" (Transacciones page) — the design's own alert
 * copy fabricates rejection reasons ("por fondos insuficientes") the real
 * `Transaction` schema has no field for, so this uses only real data
 * (id/monto/fecha/estado) instead of inventing one. `mark` is the small
 * glyph in the alert's leading circle.
 */
export interface TxAlert {
  id: string;
  title: string;
  desc: string;
  tone: Tone;
  mark: string;
}

export function toTxAlert(tx: Transaction): TxAlert {
  const row = toTxRow(tx);
  const { descLead, descBy } = transaccionesPage.alerts;
  const mark = row.estadoTone === 'success' ? '✓' : row.estadoTone === 'danger' ? '✕' : '•';
  return {
    id: row.id,
    title: row.estadoLabel,
    desc: `${descLead} ${row.id} ${descBy} ${row.monto} — ${row.fecha}.`,
    tone: row.estadoTone,
    mark,
  };
}

/** Newest-first, unlimited. */
export function sortByRecent(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * `GET /transactions` has no `limit`/`sort` query params (read-only,
 * scope-filtered only — see `transactions.controller.ts`), so "most
 * recent N" is done client/server-side here rather than assuming backend
 * ordering.
 */
export function recentTxRows(transactions: Transaction[], limit: number): TxRow[] {
  return sortByRecent(transactions).slice(0, limit).map(toTxRow);
}

/** Same "most recent N" logic as `recentTxRows`, for the alert feed instead. */
export function recentTxAlerts(transactions: Transaction[], limit: number): TxAlert[] {
  return sortByRecent(transactions).slice(0, limit).map(toTxAlert);
}
