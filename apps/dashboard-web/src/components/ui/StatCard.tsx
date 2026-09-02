import type { StatCardDef } from '../../lib/metrics';
import { toneSoftBgClasses, toneTextClasses } from '../../lib/tone';
import { TrendDownIcon, TrendRightIcon, TrendUpIcon } from './stat-icons';

const TREND_ICON = { ingresos: TrendUpIcon, egresos: TrendDownIcon, transacciones: TrendRightIcon } as const;

/** Reused as-is on Inicio and Transacciones (same 3 cards in the design) — see `lib/metrics.ts`. */
export function StatCard({ stat }: { stat: StatCardDef }) {
  const TrendIcon = TREND_ICON[stat.id as keyof typeof TREND_ICON] ?? TrendRightIcon;

  return (
    <div className="rounded-card border border-(--color-border) bg-(--color-surface) p-5 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between">
        <div
          className={`flex h-[38px] w-[38px] items-center justify-center rounded-control ${toneSoftBgClasses[stat.tone]} ${toneTextClasses[stat.tone]}`}
        >
          <TrendIcon />
        </div>
        <svg width="70" height="28" viewBox="0 0 70 28" className={toneTextClasses[stat.tone]}>
          <polyline points={stat.sparkline} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.55" />
        </svg>
      </div>
      <div className="mt-3.5 text-[13.5px] text-(--color-fg-faint)">{stat.label}</div>
      <div className="mt-1 flex items-baseline gap-2.5">
        <div className="text-[25px] font-extrabold tracking-[-.01em] text-(--color-fg)">{stat.value}</div>
        <div
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${toneSoftBgClasses[stat.tone]} ${toneTextClasses[stat.tone]}`}
        >
          {stat.change}
        </div>
      </div>
    </div>
  );
}
