import { aliadoDetailPage } from '../../../content/es/aliadoDetail';
import { buildDonutGradient, type MetodoBreakdown } from '../../../lib/aliado-detail';
import { toneSolidBgClasses, toneTextClasses } from '../../../lib/tone';

export function MetodosTab({ breakdown }: { breakdown: MetodoBreakdown[] }) {
  if (breakdown.length === 0) {
    return (
      <div className="rounded-card border border-(--color-border) bg-(--color-surface) p-10 text-center text-[13.5px] text-(--color-fg-faint) shadow-card">
        {aliadoDetailPage.metodos.empty}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-8 rounded-card border border-(--color-border) bg-(--color-surface) p-6 shadow-card">
      <div className="h-[140px] w-[140px] shrink-0 rounded-full" style={{ background: buildDonutGradient(breakdown) }} />
      <div className="flex min-w-[220px] flex-1 flex-col gap-3">
        {breakdown.map((m) => (
          <div key={m.method} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-[13.5px] font-semibold text-(--color-fg)">
              <span className={`h-2.5 w-2.5 rounded-full ${toneSolidBgClasses[m.tone]}`} />
              {m.label}
            </div>
            <div className="text-[13px] text-(--color-fg-faint)">
              {m.count} {aliadoDetailPage.metodos.opsSuffix} · <strong className={toneTextClasses[m.tone]}>{m.pct}%</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
