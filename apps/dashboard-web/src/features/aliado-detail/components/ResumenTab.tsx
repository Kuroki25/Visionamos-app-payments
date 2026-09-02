import { toneSolidBgClasses, toneTextClasses } from '../../../lib/tone';
import { aliadoDetailPage } from '../../../content/es/aliadoDetail';
import type { ResumenStat, PerformanceBar } from '../../../lib/aliado-detail';
import type { TxAlert } from '../../../lib/transactions';

export function ResumenTab({
  stats,
  bars,
  activity,
}: {
  stats: ResumenStat[];
  bars: PerformanceBar[];
  activity: TxAlert[];
}) {
  const copy = aliadoDetailPage.resumen;

  return (
    <>
      <div className="mb-4 grid grid-cols-3 gap-3.5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-card-sm border border-(--color-border) bg-(--color-surface) p-4 shadow-card">
            <div className="flex items-center gap-2 text-[12.5px] text-(--color-fg-faint)">
              <span className={`h-2 w-2 rounded-full ${toneSolidBgClasses[s.tone]}`} />
              {s.label}
            </div>
            <div className="mt-2 text-[21px] font-extrabold text-(--color-fg)">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1.5fr_1fr] gap-4">
        <div className="rounded-card border border-(--color-border) bg-(--color-surface) p-5 shadow-card">
          <div className="mb-3.5 text-[15px] font-bold text-(--color-fg)">{copy.performanceTitle}</div>
          <div className="flex h-[140px] items-end gap-2">
            {bars.map((b, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <div className="w-full rounded-t-[5px] bg-(--color-accent)" style={{ height: `${Math.max(b.pct, 2)}%`, opacity: 0.45 + b.pct / 220 }} />
                <div className="text-[10.5px] text-(--color-fg-faint)">{b.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-card border border-(--color-border) bg-(--color-surface) p-5 shadow-card">
          <div className="mb-3 text-[15px] font-bold text-(--color-fg)">{copy.activityTitle}</div>
          {activity.length === 0 ? (
            <p className="text-[13px] text-(--color-fg-faint)">{copy.noActivity}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {activity.map((a) => (
                <div key={a.id} className="flex gap-2.5">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${toneSolidBgClasses[a.tone]}`} />
                  <div>
                    <div className={`text-[13px] font-semibold text-(--color-fg)`}>
                      <span className={toneTextClasses[a.tone]}>{a.title}</span> — {a.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
