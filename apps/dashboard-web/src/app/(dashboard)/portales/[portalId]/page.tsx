import { notFound } from 'next/navigation';

import type { Category, Commerce, Portal, Transaction } from '@repo/contracts';

import { Header } from '../../../../components/layout/Header';
import { PortalDetailView } from '../../../../features/portal-detail/components/PortalDetailView';
import { ApiError } from '../../../../lib/api/errors';
import { serverApiClient } from '../../../../lib/api/server';
import { buildCommerceRow, buildPortalSummary } from '../../../../lib/commerces';
import { portalesPage } from '../../../../content/es/portales';
import { portalDetailPage } from '../../../../content/es/portalDetail';

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

export default async function PortalDetailPage({ params }: { params: Promise<{ portalId: string }> }) {
  const { portalId } = await params;

  let portal: Portal;
  try {
    portal = await serverApiClient.get<Portal>(`/portals/${portalId}`);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      notFound();
    }
    throw error;
  }

  const [commerces, categories, transactions] = await Promise.all([
    safeGet<Commerce[]>(`/portals/${portalId}/commerces`, []),
    safeGet<Category[]>(`/portals/${portalId}/categories`, []),
    safeGet<Transaction[]>('/transactions', []),
  ]);

  const categoriesById = new Map(categories.map((c) => [c.id, c.name]));
  const transactionsForPortal = transactions.filter((t) => t.portalId === portalId);
  const summary = buildPortalSummary(commerces, transactionsForPortal);
  const rows = commerces.map((c) =>
    buildCommerceRow(
      c,
      categoriesById.get(c.categoryId) ?? '—',
      transactionsForPortal.filter((t) => t.commerceId === c.id),
    ),
  );

  return (
    <>
      <Header
        title={portal.name}
        subtitle={portalDetailPage.subtitle}
        breadcrumbs={[{ label: portalesPage.title, href: '/portales' }, { label: portal.name }]}
      />
      <div className="px-9 pb-10 pt-1">
        <PortalDetailView portalId={portalId} portalName={portal.name} summary={summary} rows={rows} categories={categories} />
      </div>
    </>
  );
}
