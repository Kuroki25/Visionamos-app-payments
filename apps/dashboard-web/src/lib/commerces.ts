import type { Commerce, Transaction } from '@repo/contracts';

import { portalDetailPage } from '../content/es/portalDetail';
import { formatCOP, formatDateEs, getInitials } from './format';
import type { Tone } from './tone';

/** View model for one row of a portal's Aliados table. */
export interface CommerceRow {
  id: string;
  name: string;
  initials: string;
  categoryName: string;
  estadoLabel: string;
  estadoTone: Tone;
  tx: number;
  totalLabel: string;
  ultimaActividad: string;
}

export function buildCommerceRow(
  commerce: Commerce,
  categoryName: string,
  transactionsForCommerce: Transaction[],
): CommerceRow {
  const total = transactionsForCommerce.reduce((sum, t) => sum + t.amount, 0);
  const mostRecent = transactionsForCommerce.reduce<Transaction | null>(
    (latest, t) => (!latest || new Date(t.createdAt) > new Date(latest.createdAt) ? t : latest),
    null,
  );

  return {
    id: commerce.id,
    name: commerce.tradeName,
    initials: getInitials(commerce.tradeName),
    categoryName,
    estadoLabel: commerce.status === 'ACTIVE' ? 'Activo' : 'Inactivo',
    estadoTone: commerce.status === 'ACTIVE' ? 'success' : 'danger',
    tx: transactionsForCommerce.length,
    totalLabel: formatCOP(total),
    ultimaActividad: mostRecent ? formatDateEs(mostRecent.createdAt) : portalDetailPage.sinActividad,
  };
}

export interface PortalSummaryStat {
  label: string;
  value: string;
}

export function buildPortalSummary(commerces: Commerce[], transactionsForPortal: Transaction[]): PortalSummaryStat[] {
  const activeCount = commerces.filter((c) => c.status === 'ACTIVE').length;
  const total = transactionsForPortal.reduce((sum, t) => sum + t.amount, 0);

  return [
    { label: portalDetailPage.summary.totalAliados, value: String(commerces.length) },
    { label: portalDetailPage.summary.activeAliados, value: String(activeCount) },
    { label: portalDetailPage.summary.transacciones, value: transactionsForPortal.length.toLocaleString('es-CO') },
    { label: portalDetailPage.summary.totalProcesado, value: formatCOP(total) },
  ];
}
