'use client';

import { useMemo, useState } from 'react';

import { TxTable } from '../../../components/ui/TxTable';
import { transaccionesPage } from '../../../content/es/transacciones';
import { transactionStatus } from '../../../content/es/transactions';
import type { TxRow } from '../../../lib/transactions';

const STATUS_FILTERS = Object.values(transactionStatus).map((s) => s.label);

/**
 * "Todas las transacciones" — the filter pills are the one genuinely
 * interactive piece of this page (client-side, over data already fetched
 * server-side), matching the mock's own `state.txFilter`. Real
 * `TransactionStatus` has 7 values, not the mock's 3 — see the handoff
 * analysis for Transacciones.
 */
export function TransaccionesTable({ rows }: { rows: TxRow[] }) {
  const [filter, setFilter] = useState<string>(transaccionesPage.table.filterAll);

  const filteredRows = useMemo(
    () => (filter === transaccionesPage.table.filterAll ? rows : rows.filter((r) => r.estadoLabel === filter)),
    [rows, filter],
  );

  return (
    <div className="rounded-card border border-(--color-border) bg-(--color-surface) p-5 shadow-card">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="text-[16.5px] font-bold text-(--color-fg)">{transaccionesPage.table.title}</div>
        <div className="flex flex-wrap gap-2">
          {[transaccionesPage.table.filterAll, ...STATUS_FILTERS].map((label) => {
            const active = filter === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setFilter(label)}
                className={`rounded-lg border px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap ${
                  active
                    ? 'border-(--color-accent) bg-(--color-accent-soft) text-(--color-accent)'
                    : 'border-(--color-border) text-(--color-fg-soft)'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <TxTable rows={filteredRows} />
    </div>
  );
}
