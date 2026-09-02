import type { Commerce, Portal, Transaction } from '@repo/contracts';

import { Header } from '../../../components/layout/Header';
import { portalesPage } from '../../../content/es/portales';
import { PortalesExplorer } from '../../../features/portales/components/PortalesExplorer';
import { ApiError } from '../../../lib/api/errors';
import { serverApiClient } from '../../../lib/api/server';
import { buildPortalHeaderStats, buildPortalRows } from '../../../lib/portals';

async function getPortals(): Promise<Portal[]> {
  try {
    return await serverApiClient.get<Portal[]>('/portals');
  } catch (error) {
    // `GET /portals` is SUPERADMIN/ADMIN_PORTAL/VIEWER only — an
    // ADMIN_COMMERCE actor gets a real 403 here, treated as "nothing to
    // show" rather than an error page (§11 of the source of truth).
    if (error instanceof ApiError && error.isForbidden) {
      return [];
    }
    throw error;
  }
}

async function getCommerces(portalId: string): Promise<Commerce[]> {
  try {
    return await serverApiClient.get<Commerce[]>(`/portals/${portalId}/commerces`);
  } catch (error) {
    if (error instanceof ApiError && error.isForbidden) {
      return [];
    }
    throw error;
  }
}

async function getTransactions(): Promise<Transaction[]> {
  try {
    return await serverApiClient.get<Transaction[]>('/transactions');
  } catch (error) {
    if (error instanceof ApiError && error.isForbidden) {
      return [];
    }
    throw error;
  }
}

export default async function PortalesPage() {
  const portals = await getPortals();
  const [commercesByPortalEntries, transactions] = await Promise.all([
    Promise.all(portals.map(async (p) => [p.id, await getCommerces(p.id)] as const)),
    getTransactions(),
  ]);
  const commercesByPortal = new Map(commercesByPortalEntries);

  const headerStats = buildPortalHeaderStats(portals, commercesByPortal, transactions);
  const rows = buildPortalRows(portals, commercesByPortal, transactions);

  return (
    <>
      <Header title={portalesPage.title} subtitle={portalesPage.subtitle} />
      <div className="px-9 pb-10 pt-1">
        <PortalesExplorer headerStats={headerStats} rows={rows} />
      </div>
    </>
  );
}
