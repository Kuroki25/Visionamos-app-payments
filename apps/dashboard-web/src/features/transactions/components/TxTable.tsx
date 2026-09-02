import { txTable } from '../../../content/es/transactions';
import { toneBadgeClasses } from '../../../lib/tone';
import type { TxRow } from '../types';

const GRID_COLS = '100px 110px 90px 100px 110px 110px';

/**
 * Ports Claude Design's `TxTable.dc.html` sub-component — reused by Inicio
 * today and by the Transacciones/Aliado-detail pages once they're built
 * (the design imports this same component from all three).
 */
export function TxTable({ rows }: { rows: TxRow[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-[13.5px] text-(--color-fg-faint)">{txTable.empty}</p>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <div
        className="grid min-w-[600px] gap-3 border-b border-(--color-border) px-2 py-2 text-[11.5px] font-bold tracking-[.04em] text-(--color-fg-faint)"
        style={{ gridTemplateColumns: GRID_COLS }}
      >
        <div>{txTable.columns.id}</div>
        <div>{txTable.columns.fecha}</div>
        <div>{txTable.columns.metodo}</div>
        <div>{txTable.columns.tipo}</div>
        <div>{txTable.columns.monto}</div>
        <div>{txTable.columns.estado}</div>
      </div>
      {rows.map((row) => (
        <div
          key={row.id}
          className="grid min-w-[600px] items-center gap-3 rounded-md border-b border-(--color-border) px-2 py-3 transition-colors hover:bg-(--color-surface-subtle)"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          <div className="text-[13.5px] font-bold text-(--color-fg)">{row.id}</div>
          <div className="text-[13px] text-(--color-fg-soft)">{row.fecha}</div>
          <div className="text-[13px] text-(--color-fg-soft)">{row.metodo}</div>
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-(--color-success-soft) px-2.5 py-0.5 text-xs font-bold text-(--color-success)">
              ↗ {txTable.tipoLabel}
            </span>
          </div>
          <div className="text-[13.5px] font-bold text-(--color-fg)">{row.monto}</div>
          <div>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${toneBadgeClasses[row.estadoTone]}`}
            >
              {row.estadoLabel}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
