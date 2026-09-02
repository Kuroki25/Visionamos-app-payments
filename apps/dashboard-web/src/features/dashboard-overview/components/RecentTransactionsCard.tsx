import Link from 'next/link';

import { dashboardHome } from '../../../content/es/dashboardHome';
import { TxTable } from '../../transactions/components/TxTable';
import type { TxRow } from '../../transactions/types';

// Matches `components/layout/nav-config.ts`'s "transacciones" entry — not
// imported from there directly, since `components/layout` isn't one of
// this feature's allowed imports (`DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md`,
// "Reglas de dependencias": features may import `lib/*`, `components/ui`,
// `content`, cross-cutting `types` — not `components/layout`).
const TRANSACCIONES_HREF = '/transacciones';

export function RecentTransactionsCard({ rows }: { rows: TxRow[] }) {
  const copy = dashboardHome.recentTx;

  return (
    <div className="rounded-card border border-(--color-border) bg-(--color-surface) p-[22px] shadow-card">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[16.5px] font-bold text-(--color-fg)">{copy.title}</div>
          <div className="mt-0.5 text-[13px] text-(--color-fg-faint)">{copy.subtitle}</div>
        </div>
        <Link
          href={TRANSACCIONES_HREF}
          className="rounded-control border border-(--color-border) px-4 py-2.5 text-[13px] font-semibold text-(--color-fg) transition-colors hover:border-(--color-accent) hover:bg-(--color-surface-subtle)"
        >
          {copy.viewAll}
        </Link>
      </div>
      <TxTable rows={rows} />
    </div>
  );
}
