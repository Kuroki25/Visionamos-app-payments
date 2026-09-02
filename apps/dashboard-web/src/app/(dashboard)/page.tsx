import type { Transaction } from '@repo/contracts';

import { Header } from '../../components/layout/Header';
import { dashboardHome } from '../../content/es/dashboardHome';
import { ApiError } from '../../lib/api/errors';
import { serverApiClient } from '../../lib/api/server';
import { FlowChartCard } from '../../features/dashboard-overview/components/FlowChartCard';
import { GoalCard } from '../../features/dashboard-overview/components/GoalCard';
import { RecentTransactionsCard } from '../../features/dashboard-overview/components/RecentTransactionsCard';
import { StatCardsRow } from '../../features/dashboard-overview/components/StatCardsRow';
import { recentTxRows } from '../../features/transactions/api/map-transaction';

const RECENT_TX_LIMIT = 5;

/**
 * Real data: fetches the actor's transactions from `GET /transactions`
 * (scope-filtered server-side by NestJS) and keeps only the most recent 5.
 * A 403 (role/scope has no transaction visibility) is treated as "nothing
 * to show", not an error — §11 of the source of truth: 401 and 403 are
 * never handled the same, and this route is already behind the
 * `(dashboard)` layout's session check, so a 401 here would be
 * unexpected — it's allowed to propagate as a real error rather than
 * being silently swallowed.
 */
async function getRecentTransactions() {
  try {
    const transactions = await serverApiClient.get<Transaction[]>('/transactions');
    return recentTxRows(transactions, RECENT_TX_LIMIT);
  } catch (error) {
    if (error instanceof ApiError && error.isForbidden) {
      return [];
    }
    throw error;
  }
}

export default async function InicioPage() {
  const recentRows = await getRecentTransactions();

  return (
    <>
      <Header title={dashboardHome.title} subtitle={dashboardHome.subtitle} />
      <div className="px-9 pb-10 pt-1">
        <StatCardsRow />

        <div className="grid grid-cols-[1.6fr_1fr] gap-4">
          <FlowChartCard />
          <GoalCard />
        </div>

        <div className="mt-4">
          <RecentTransactionsCard rows={recentRows} />
        </div>
      </div>
    </>
  );
}
