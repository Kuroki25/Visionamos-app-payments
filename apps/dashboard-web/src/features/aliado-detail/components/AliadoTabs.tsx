'use client';

import { useState } from 'react';

import { ComingSoonCard } from '../../../components/ui/ComingSoonCard';
import { TxTable } from '../../../components/ui/TxTable';
import { aliadoDetailPage } from '../../../content/es/aliadoDetail';
import type { InfoField, MetodoBreakdown, PerformanceBar, ResumenStat } from '../../../lib/aliado-detail';
import type { TxAlert, TxRow } from '../../../lib/transactions';
import { InformacionTab } from './InformacionTab';
import { MetodosTab } from './MetodosTab';
import { ResumenTab } from './ResumenTab';

type TabId = 'resumen' | 'transacciones' | 'movimientos' | 'metodos' | 'informes' | 'informacion';
const TAB_ORDER: TabId[] = ['resumen', 'transacciones', 'movimientos', 'metodos', 'informes', 'informacion'];

export function AliadoTabs({
  resumenStats,
  bars,
  activity,
  txRows,
  metodos,
  infoFields,
}: {
  resumenStats: ResumenStat[];
  bars: PerformanceBar[];
  activity: TxAlert[];
  txRows: TxRow[];
  metodos: MetodoBreakdown[];
  infoFields: InfoField[];
}) {
  const [tab, setTab] = useState<TabId>('resumen');

  return (
    <div>
      <div className="mb-5 flex gap-1.5 overflow-x-auto border-b border-(--color-border)">
        {TAB_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13.5px] ${
              tab === id
                ? 'border-(--color-accent) font-bold text-(--color-accent)'
                : 'border-transparent font-medium text-(--color-fg-faint)'
            }`}
          >
            {aliadoDetailPage.tabs[id]}
          </button>
        ))}
      </div>

      {tab === 'resumen' ? <ResumenTab stats={resumenStats} bars={bars} activity={activity} /> : null}
      {tab === 'transacciones' ? (
        <div className="rounded-card border border-(--color-border) bg-(--color-surface) p-5 shadow-card">
          <TxTable rows={txRows} />
        </div>
      ) : null}
      {tab === 'movimientos' ? <ComingSoonCard message={aliadoDetailPage.comingSoon.movimientos} /> : null}
      {tab === 'metodos' ? <MetodosTab breakdown={metodos} /> : null}
      {tab === 'informes' ? <ComingSoonCard message={aliadoDetailPage.comingSoon.informes} /> : null}
      {tab === 'informacion' ? <InformacionTab fields={infoFields} /> : null}
    </div>
  );
}
