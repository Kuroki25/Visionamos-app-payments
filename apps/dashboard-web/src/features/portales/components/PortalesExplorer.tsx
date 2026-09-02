'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DotsVerticalIcon, PlusIcon, SearchIcon } from '../../../components/ui/icons';
import { StatCardTile } from '../../../components/ui/StatCardTile';
import { ToastViewport } from '../../../components/ui/ToastViewport';
import { useConfirm } from '../../../components/ui/use-confirm';
import { useToasts } from '../../../components/ui/use-toasts';
import { portalesPage } from '../../../content/es/portales';
import { apiClient } from '../../../lib/api/client';
import { pluralize } from '../../../lib/format';
import { toneBadgeClasses } from '../../../lib/tone';
import type { HeaderStat, PortalRow } from '../../../lib/portals';
import { PortalForm, type PortalFormTarget } from './PortalForm';

export function PortalesExplorer({ headerStats, rows }: { headerStats: HeaderStat[]; rows: PortalRow[] }) {
  const router = useRouter();
  const { toasts, push } = useToasts();
  const { confirm, ask, close: closeConfirm, confirmAction } = useConfirm();
  const [search, setSearch] = useState('');
  const [formTarget, setFormTarget] = useState<PortalFormTarget | 'create' | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filteredRows = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );

  function handleSaved(message: string) {
    setFormTarget(null);
    push(message, 'success');
    router.refresh();
  }

  async function doToggleActive(id: string, enabling: boolean) {
    try {
      await apiClient.patch(`/portals/${id}/status`, { status: enabling ? 'ACTIVE' : 'INACTIVE' });
      push(enabling ? portalesPage.toasts.enabled : portalesPage.toasts.disabled, 'success');
      router.refresh();
    } catch {
      push('No se pudo actualizar el portal.', 'danger');
    }
  }

  function toggleActive(row: PortalRow) {
    const enabling = row.estadoTone !== 'success';
    const copy = enabling ? portalesPage.confirmEnable : portalesPage.confirmDisable;
    ask(
      copy.title,
      `${copy.messagePrefix}${row.name}${copy.messageSuffix}`,
      enabling ? portalesPage.menu.enable : portalesPage.menu.disable,
      () => void doToggleActive(row.id, enabling),
    );
    setOpenMenuId(null);
  }

  return (
    <>
      <div className="mb-4.5 grid grid-cols-4 gap-4">
        {headerStats.map((stat) => (
          <StatCardTile key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      <div className="mb-4.5 flex gap-3">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-fg-faint)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={portalesPage.searchPlaceholder}
            className="w-full rounded-control border border-(--color-border) bg-(--color-surface) py-2.5 pl-[38px] pr-3.5 text-[13.5px] text-(--color-fg) outline-none transition-[border-color,box-shadow] focus:border-(--color-accent) focus:ring-[3px] focus:ring-(--color-accent-soft)"
          />
        </div>
        <button
          type="button"
          onClick={() => setFormTarget('create')}
          className="flex items-center gap-2 whitespace-nowrap rounded-control bg-(--color-accent) px-4.5 py-2.5 text-[13.5px] font-bold text-white"
        >
          <PlusIcon /> {portalesPage.newPortal}
        </button>
      </div>

      <div className="overflow-hidden rounded-card border border-(--color-border) bg-(--color-surface) shadow-card">
        <div className="grid grid-cols-[56px_2fr_1fr_1fr_1fr_90px] gap-3 border-b border-(--color-border) px-5 py-3 text-[11.5px] font-bold tracking-[.04em] text-(--color-fg-faint)">
          <div />
          <div>{portalesPage.columns.portal}</div>
          <div>{portalesPage.columns.aliados}</div>
          <div>{portalesPage.columns.transacciones}</div>
          <div>{portalesPage.columns.estado}</div>
          <div>{portalesPage.columns.acciones}</div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="px-5 py-12 text-center text-[13.5px] text-(--color-fg-faint)">{portalesPage.empty}</div>
        ) : (
          filteredRows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[56px_2fr_1fr_1fr_1fr_90px] items-center gap-3 border-b border-(--color-border) px-5 py-3.5 last:border-b-0 hover:bg-(--color-surface-subtle)"
            >
              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-control bg-(--color-accent-soft) text-[13px] font-extrabold text-(--color-accent)">
                {row.initials}
              </div>
              <Link href={`/portales/${row.id}`} className="cursor-pointer">
                <div className="text-sm font-bold text-(--color-fg)">{row.name}</div>
                <div className="text-[12.5px] text-(--color-fg-faint)">
                  {row.comercios} {pluralize(row.comercios, portalesPage.aliadosSuffix.singular, portalesPage.aliadosSuffix.plural)}
                </div>
              </Link>
              <div className="text-[13.5px] font-semibold text-(--color-fg)">{row.comercios}</div>
              <div className="text-[13.5px] font-semibold text-(--color-fg)">{row.tx}</div>
              <div>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${toneBadgeClasses[row.estadoTone]}`}>
                  {row.estadoLabel}
                </span>
              </div>
              <div className="relative">
                <button
                  type="button"
                  title={portalesPage.columns.acciones}
                  onClick={() => setOpenMenuId((id) => (id === row.id ? null : row.id))}
                  className="flex h-8 w-8 items-center justify-center rounded-control-sm border border-(--color-border) text-(--color-fg-soft) hover:bg-(--color-surface-subtle)"
                >
                  <DotsVerticalIcon />
                </button>
                {openMenuId === row.id ? (
                  <div className="absolute right-0 top-9 z-30 w-[150px] overflow-hidden rounded-control border border-(--color-border) bg-(--color-surface) shadow-dropdown">
                    <Link
                      href={`/portales/${row.id}`}
                      onClick={() => setOpenMenuId(null)}
                      className="block px-3.5 py-2.5 text-[13px] font-semibold text-(--color-fg) hover:bg-(--color-surface-subtle)"
                    >
                      {portalesPage.menu.view}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setFormTarget({ id: row.id, name: row.name });
                        setOpenMenuId(null);
                      }}
                      className="block w-full px-3.5 py-2.5 text-left text-[13px] font-semibold text-(--color-fg) hover:bg-(--color-surface-subtle)"
                    >
                      {portalesPage.menu.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(row)}
                      className="block w-full px-3.5 py-2.5 text-left text-[13px] font-semibold text-(--color-orange) hover:bg-(--color-surface-subtle)"
                    >
                      {row.estadoTone === 'success' ? portalesPage.menu.disable : portalesPage.menu.enable}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <PortalForm target={formTarget} onClose={() => setFormTarget(null)} onSaved={handleSaved} />
      <ConfirmDialog confirm={confirm} onClose={closeConfirm} onConfirm={confirmAction} />
      <ToastViewport toasts={toasts} />
    </>
  );
}
