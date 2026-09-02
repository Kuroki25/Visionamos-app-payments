'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { Category } from '@repo/contracts';

import { PlusIcon } from '../../../components/ui/icons';
import { StatCardTile } from '../../../components/ui/StatCardTile';
import { ToastViewport } from '../../../components/ui/ToastViewport';
import { useToasts } from '../../../components/ui/use-toasts';
import { portalDetailPage } from '../../../content/es/portalDetail';
import type { CommerceRow, PortalSummaryStat } from '../../../lib/commerces';
import { toneBadgeClasses } from '../../../lib/tone';
import { CommerceForm } from './CommerceForm';

export function PortalDetailView({
  portalId,
  portalName,
  summary,
  rows,
  categories,
}: {
  portalId: string;
  portalName: string;
  summary: PortalSummaryStat[];
  rows: CommerceRow[];
  categories: Category[];
}) {
  const router = useRouter();
  const { toasts, push } = useToasts();
  const [formOpen, setFormOpen] = useState(false);
  const copy = portalDetailPage;

  function handleSaved(message: string) {
    setFormOpen(false);
    push(message, 'success');
    router.refresh();
  }

  return (
    <>
      <div className="mb-4.5 grid grid-cols-4 gap-4">
        {summary.map((s) => (
          <StatCardTile key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      <div className="overflow-hidden rounded-card border border-(--color-border) bg-(--color-surface) shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-(--color-border) px-5 py-4">
          <div>
            <div className="text-[16.5px] font-bold text-(--color-fg)">
              {copy.aliadosCard.titlePrefix}
              {portalName}
            </div>
            <div className="text-[13px] text-(--color-fg-faint)">
              {rows.length} {copy.aliadosCard.countSuffix}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-2 whitespace-nowrap rounded-control bg-(--color-accent) px-4 py-2.5 text-[13px] font-bold text-white"
          >
            <PlusIcon /> {copy.aliadosCard.newAliado}
          </button>
        </div>

        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_90px] gap-3 border-b border-(--color-border) px-5 py-3 text-[11px] font-bold tracking-[.04em] text-(--color-fg-faint)">
          <div>{copy.columns.aliado}</div>
          <div>{copy.columns.tipo}</div>
          <div>{copy.columns.estado}</div>
          <div>{copy.columns.transacciones}</div>
          <div>{copy.columns.totalProcesado}</div>
          <div>{copy.columns.ultimaActividad}</div>
          <div />
        </div>

        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_90px] items-center gap-3 border-b border-(--color-border) px-5 py-3.5 last:border-b-0 hover:bg-(--color-surface-subtle)"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--color-accent-soft) text-xs font-bold text-(--color-accent)">
                {row.initials}
              </div>
              <div className="text-[13.5px] font-bold text-(--color-fg)">{row.name}</div>
            </div>
            <div className="text-[12.5px] text-(--color-fg-soft)">{row.categoryName}</div>
            <div>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${toneBadgeClasses[row.estadoTone]}`}>
                {row.estadoLabel}
              </span>
            </div>
            <div className="text-[13px] font-semibold text-(--color-fg)">{row.tx}</div>
            <div className="text-[13px] font-semibold text-(--color-fg)">{row.totalLabel}</div>
            <div className="text-[12.5px] text-(--color-fg-faint)">{row.ultimaActividad}</div>
            <Link href={`/portales/${portalId}/aliados/${row.id}`} className="text-[12.5px] font-semibold text-(--color-accent)">
              {copy.open}
            </Link>
          </div>
        ))}
      </div>

      <CommerceForm open={formOpen} portalId={portalId} categories={categories} onClose={() => setFormOpen(false)} onSaved={handleSaved} />
      <ToastViewport toasts={toasts} />
    </>
  );
}
