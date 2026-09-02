import type { Transaction } from '@repo/contracts';

import { Header } from '../../../components/layout/Header';
import { StatCardsRow } from '../../../components/ui/StatCardsRow';
import { transaccionesPage } from '../../../content/es/transacciones';
import { AlertsCard } from '../../../features/transacciones/components/AlertsCard';
import { TransaccionesTable } from '../../../features/transacciones/components/TransaccionesTable';
import { ApiError } from '../../../lib/api/errors';
import { serverApiClient } from '../../../lib/api/server';
import { getStaticStatCards } from '../../../lib/metrics';
import { recentTxAlerts, recentTxRows } from '../../../lib/transactions';

const RECENT_ALERTS_LIMIT = 3;

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

export default async function TransaccionesPage() {
  const transactions = await getTransactions();
  const alerts = recentTxAlerts(transactions, RECENT_ALERTS_LIMIT);
  // All transactions, newest first — the filter pills below narrow this
  // client-side (`TransaccionesTable`), matching the mock's own in-memory
  // filter over `allTx`.
  const rows = recentTxRows(transactions, transactions.length);

  return (
    <>
      <Header title={transaccionesPage.title} subtitle={transaccionesPage.subtitle} />
      <div className="px-9 pb-10 pt-1">
        <StatCardsRow stats={getStaticStatCards()} />
        <AlertsCard alerts={alerts} />
        <TransaccionesTable rows={rows} />
      </div>
    </>
  );
}
