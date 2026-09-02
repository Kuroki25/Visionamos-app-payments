import { dashboardHome } from '../../../content/es/dashboardHome';
import { getStaticGoal } from '../api/get-overview-metrics';

/**
 * "Meta mensual" gauge — a static semi-circle arc (`stroke-dasharray`)
 * ported from Claude Design's `goalArc`. No interactivity, so this stays a
 * Server Component.
 */
export function GoalCard() {
  const goal = getStaticGoal();
  const copy = dashboardHome.goalCard;

  return (
    <div className="flex flex-col rounded-card border border-(--color-border) bg-(--color-surface) p-[22px] shadow-card">
      <div className="text-[16.5px] font-bold text-(--color-fg)">{copy.title}</div>
      <div className="mt-0.5 text-[13px] text-(--color-fg-faint)">{copy.subtitle}</div>

      <div className="relative mt-[18px] mb-1.5 flex justify-center">
        <svg width="200" height="120" viewBox="0 0 200 120">
          <path
            d="M 20 110 A 80 80 0 0 1 180 110"
            fill="none"
            stroke="var(--color-grid-line)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M 20 110 A 80 80 0 0 1 180 110"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={goal.dashArray}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <div className="text-[30px] font-extrabold tracking-[-.02em] text-(--color-fg)">{goal.pct}%</div>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="rounded-full bg-(--color-success-soft) px-2.5 py-[3px] text-[12.5px] font-bold text-(--color-success)">
          {copy.changeVsLastMonth}
        </div>
      </div>

      <div className="flex-1" />

      <div className="mt-4 rounded-control-sm bg-(--color-surface-subtle) p-3.5 text-[13px] leading-relaxed text-(--color-fg-soft)">
        {copy.todayPrefix}
        <strong className="text-(--color-fg)">{goal.todayAmountLabel}</strong>
        {copy.todaySuffix}
      </div>
    </div>
  );
}
