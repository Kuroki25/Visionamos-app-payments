import type { Commerce, PaymentMethod, Transaction } from '@repo/contracts';

import { aliadoDetailPage } from '../content/es/aliadoDetail';
import { paymentMethodLabels } from '../content/es/transactions';
import { formatCOP, formatDateEs, getInitials } from './format';
import type { Tone } from './tone';

/**
 * View models for the Aliado detail screen — one function per tab, each
 * computed from the aliado's own real transactions
 * (`transactions.filter(t => t.commerceId === id)`, fetched once by the
 * page). Two of the mock's 6 tabs have no real backing at all and are
 * left as "próximamente" instead of being ported:
 *
 * - **Movimientos** (ledger rows + running "saldo"): `Commerce`'s own
 *   docblock (`@repo/contracts`) says settlement/ledger tracking is "a
 *   separate, explicitly-pending concept (SettlementAccount)" — there is
 *   nothing to compute this from, real or otherwise.
 * - **Informes** (downloadable reports): no reports/documents module
 *   exists in the backend.
 *
 * The other 4 tabs (Resumen, Transacciones, Métodos de pago, Información)
 * ARE fully real — unlike the mock, which fabricates fixed percentage
 * splits (86% aprobado / 8% pendiente / etc.) and a made-up
 * "Estado de integración" field.
 */

export interface ResumenStat {
  label: string;
  value: string;
  tone: Tone;
}

export function buildResumenStats(transactions: Transaction[]): ResumenStat[] {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const approved = transactions.filter((t) => t.status === 'APPROVED').length;
  const pending = transactions.filter((t) => t.status === 'PENDING' || t.status === 'PROCESSING' || t.status === 'CREATED').length;
  const rejected = transactions.filter((t) => t.status === 'REJECTED' || t.status === 'FAILED').length;
  const cancelled = transactions.filter((t) => t.status === 'CANCELLED').length;
  const copy = aliadoDetailPage.resumen.stats;

  return [
    { label: copy.total, value: formatCOP(total), tone: 'accent' },
    { label: copy.count, value: String(transactions.length), tone: 'neutral' },
    { label: copy.approved, value: String(approved), tone: 'success' },
    { label: copy.pending, value: String(pending), tone: 'orange' },
    { label: copy.rejected, value: String(rejected), tone: 'danger' },
    { label: copy.cancelled, value: String(cancelled), tone: 'neutral' },
  ];
}

export interface PerformanceBar {
  label: string;
  pct: number;
}

/**
 * Splits the aliado's own observed transaction date range into 8 equal
 * periods and sums the amount in each — adapts to whatever data actually
 * exists instead of assuming "the last 8 calendar weeks" (which could be
 * entirely empty depending on when the data was seeded vs. viewed).
 */
export function buildPerformanceBars(transactions: Transaction[]): PerformanceBar[] {
  const BUCKET_COUNT = 8;
  if (transactions.length === 0) {
    return Array.from({ length: BUCKET_COUNT }, (_, i) => ({ label: `P${i + 1}`, pct: 0 }));
  }

  const times = transactions.map((t) => new Date(t.createdAt).getTime());
  const min = Math.min(...times);
  const span = Math.max(Math.max(...times) - min, 1);
  const buckets = Array<number>(BUCKET_COUNT).fill(0);

  for (const t of transactions) {
    const idx = Math.min(BUCKET_COUNT - 1, Math.floor(((new Date(t.createdAt).getTime() - min) / span) * BUCKET_COUNT));
    buckets[idx] = (buckets[idx] ?? 0) + t.amount;
  }

  const bucketMax = Math.max(...buckets, 1);
  return buckets.map((v, i) => ({ label: `P${i + 1}`, pct: Math.round((v / bucketMax) * 100) }));
}

export interface MetodoBreakdown {
  method: PaymentMethod;
  label: string;
  count: number;
  pct: number;
  tone: Tone;
}

const METODO_TONE: Record<PaymentMethod, Tone> = {
  PSE: 'accent',
  DIGITAL_WALLET: 'success',
  CARD: 'orange',
  CASH: 'neutral',
};
const METODO_ORDER: PaymentMethod[] = ['PSE', 'DIGITAL_WALLET', 'CARD', 'CASH'];

export function buildMetodosBreakdown(transactions: Transaction[]): MetodoBreakdown[] {
  const total = transactions.length;
  const counts = new Map<PaymentMethod, number>();
  for (const t of transactions) counts.set(t.method, (counts.get(t.method) ?? 0) + 1);

  return METODO_ORDER.map((method) => {
    const count = counts.get(method) ?? 0;
    return { method, label: paymentMethodLabels[method], count, pct: total > 0 ? Math.round((count / total) * 100) : 0, tone: METODO_TONE[method] };
  }).filter((m) => m.count > 0);
}

/** CSS `conic-gradient` matching the mock's donut, built from the real breakdown above. */
export function buildDonutGradient(breakdown: MetodoBreakdown[]): string {
  if (breakdown.length === 0) return 'var(--color-surface-subtle)';
  let acc = 0;
  const stops = breakdown.map((m) => {
    const from = acc;
    acc += m.pct;
    return `var(--color-${m.tone === 'neutral' ? 'fg-faint' : m.tone}) ${from}% ${acc}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

export interface InfoField {
  label: string;
  value: string;
}

export function buildInfoFields(commerce: Commerce, categoryName: string): InfoField[] {
  const copy = aliadoDetailPage.informacion;
  return [
    { label: copy.legalName, value: commerce.legalName },
    { label: copy.taxId, value: commerce.taxId },
    { label: copy.category, value: categoryName },
    { label: copy.city, value: commerce.city },
    { label: copy.address, value: commerce.address },
    { label: copy.contactName, value: commerce.contactName },
    { label: copy.contactEmail, value: commerce.contactEmail },
    { label: copy.contactPhone, value: commerce.contactPhone },
    { label: copy.createdAt, value: formatDateEs(commerce.createdAt) },
  ];
}

export interface AliadoHeaderInfo {
  initials: string;
  estadoLabel: string;
  estadoTone: Tone;
  sinceLabel: string;
}

export function buildAliadoHeaderInfo(commerce: Commerce): AliadoHeaderInfo {
  return {
    initials: getInitials(commerce.tradeName),
    estadoLabel: commerce.status === 'ACTIVE' ? 'Activo' : 'Inactivo',
    estadoTone: commerce.status === 'ACTIVE' ? 'success' : 'danger',
    sinceLabel: formatDateEs(commerce.createdAt),
  };
}
