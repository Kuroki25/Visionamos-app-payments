import type { Commerce, Portal, Transaction } from '@repo/contracts';

import { portalesPage } from '../content/es/portales';
import { formatCOP } from './format';
import type { Tone } from './tone';

/**
 * View model for one row of the Portales table. The real `Portal`
 * (`@repo/contracts`) is just `{ id, name, status, isPublished,
 * createdAt, updatedAt }` — no "aliados"/"transacciones" counts, unlike
 * Claude Design's mock. Those are computed here from real, separately-
 * fetched data (`GET /portals/:id/commerces` per portal, `GET
 * /transactions` filtered by `portalId`) — see `app/(dashboard)/portales/
 * page.tsx` for where they're fetched.
 */
export interface PortalRow {
  id: string;
  name: string;
  displayName: string | null;
  serviceType: string | null;
  description: string | null;
  logoUrl: string | null;
  initials: string;
  comercios: number;
  tx: number;
  estadoLabel: string;
  estadoTone: Tone;
}

export function buildPortalRows(
  portals: Portal[],
  commercesByPortal: Map<string, Commerce[]>,
  transactions: Transaction[],
): PortalRow[] {
  return portals.map((portal) => {
    const comercios = commercesByPortal.get(portal.id)?.length ?? 0;
    const tx = transactions.filter((t) => t.portalId === portal.id).length;
    return {
      id: portal.id,
      name: portal.name,
      displayName: portal.displayName,
      serviceType: portal.serviceType,
      description: portal.description,
      logoUrl: portal.logoUrl,
      initials: portal.name.slice(0, 2).toUpperCase(),
      comercios,
      tx,
      estadoLabel: portal.status === 'ACTIVE' ? 'Activo' : 'Inactivo',
      estadoTone: portal.status === 'ACTIVE' ? 'success' : 'danger',
    };
  });
}

export interface HeaderStat {
  label: string;
  value: string;
}

export function buildPortalHeaderStats(
  portals: Portal[],
  commercesByPortal: Map<string, Commerce[]>,
  transactions: Transaction[],
): HeaderStat[] {
  const portalIds = new Set(portals.map((p) => p.id));
  const scopedTx = transactions.filter((t) => portalIds.has(t.portalId));
  const totalAliados = [...commercesByPortal.values()].reduce((sum, list) => sum + list.length, 0);
  const totalProcesado = scopedTx.reduce((sum, t) => sum + t.amount, 0);

  return [
    { label: portalesPage.stats.totalPortales, value: String(portals.length) },
    { label: portalesPage.stats.totalAliados, value: String(totalAliados) },
    { label: portalesPage.stats.transacciones, value: scopedTx.length.toLocaleString('es-CO') },
    { label: portalesPage.stats.totalProcesado, value: formatCOP(totalProcesado) },
  ];
}
