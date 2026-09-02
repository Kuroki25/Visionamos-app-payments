import { notFound } from 'next/navigation';

import type { Category, Commerce, Portal, Transaction } from '@repo/contracts';

import { Header } from '../../../../../../components/layout/Header';
import { ForbiddenNotice } from '../../../../../../components/ui/ForbiddenNotice';
import { aliadoDetailPage } from '../../../../../../content/es/aliadoDetail';
import { portalesPage } from '../../../../../../content/es/portales';
import { AliadoHeaderCard } from '../../../../../../features/aliado-detail/components/AliadoHeaderCard';
import { AliadoTabs } from '../../../../../../features/aliado-detail/components/AliadoTabs';
import { ApiError } from '../../../../../../lib/api/errors';
import { serverApiClient } from '../../../../../../lib/api/server';
import {
  buildAliadoHeaderInfo,
  buildInfoFields,
  buildMetodosBreakdown,
  buildPerformanceBars,
  buildResumenStats,
} from '../../../../../../lib/aliado-detail';
import { recentTxAlerts, recentTxRows } from '../../../../../../lib/transactions';

const RECENT_ACTIVITY_LIMIT = 4;

async function safeGet<T>(path: string, fallback: T): Promise<T> {
  try {
    return await serverApiClient.get<T>(path);
  } catch (error) {
    if (error instanceof ApiError && error.isForbidden) {
      return fallback;
    }
    throw error;
  }
}

export default async function AliadoDetailPage({
  params,
}: {
  params: Promise<{ portalId: string; aliadoId: string }>;
}) {
  const { portalId, aliadoId } = await params;

  let commerce: Commerce;
  try {
    commerce = await serverApiClient.get<Commerce>(`/commerces/${aliadoId}`);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      notFound();
    }
    // Same real gap found (and fixed) on Portal detail via cross-tenant
    // E2E testing: an actor outside this commerce's scope gets a real 403
    // here, which must render a handled state, not crash.
    if (error instanceof ApiError && error.isForbidden) {
      return <ForbiddenNotice />;
    }
    throw error;
  }
  if (commerce.portalId !== portalId) {
    notFound();
  }

  const [portal, categories, allTransactions] = await Promise.all([
    safeGet<Portal | null>(`/portals/${portalId}`, null),
    safeGet<Category[]>(`/portals/${portalId}/categories`, []),
    safeGet<Transaction[]>('/transactions', []),
  ]);

  const categoryName = categories.find((c) => c.id === commerce.categoryId)?.name ?? '—';
  const transactions = allTransactions.filter((t) => t.commerceId === aliadoId);

  return (
    <>
      <Header
        title={commerce.tradeName}
        subtitle={aliadoDetailPage.subtitle}
        breadcrumbs={[
          { label: portalesPage.title, href: '/portales' },
          { label: portal?.name ?? '—', href: `/portales/${portalId}` },
          { label: commerce.tradeName },
        ]}
      />
      <div className="px-9 pb-10 pt-1">
        <AliadoHeaderCard
          name={commerce.tradeName}
          categoryName={categoryName}
          taxId={commerce.taxId}
          info={buildAliadoHeaderInfo(commerce)}
        />
        <AliadoTabs
          resumenStats={buildResumenStats(transactions)}
          bars={buildPerformanceBars(transactions)}
          activity={recentTxAlerts(transactions, RECENT_ACTIVITY_LIMIT)}
          txRows={recentTxRows(transactions, transactions.length)}
          metodos={buildMetodosBreakdown(transactions)}
          infoFields={buildInfoFields(commerce, categoryName)}
        />
      </div>
    </>
  );
}
