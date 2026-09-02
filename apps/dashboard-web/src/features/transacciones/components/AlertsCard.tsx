import { BellIcon } from '../../../components/ui/icons';
import { transaccionesPage } from '../../../content/es/transacciones';
import type { TxAlert } from '../../../lib/transactions';
import { toneBorderClasses, toneSoftBgClasses, toneSolidBgClasses, toneTextClasses } from '../../../lib/tone';

/**
 * "Alertas de transacciones" — derived from the same real, most-recent
 * transactions as the table below (no separate alerts backend exists).
 * "Marcar todas como leídas" stays decorative, matching the mock: it has
 * no `onClick` there either (no read/unread state for a feed that's just
 * "the last 3 real transactions").
 */
export function AlertsCard({ alerts }: { alerts: TxAlert[] }) {
  const copy = transaccionesPage.alerts;

  return (
    <div className="mb-4 rounded-card border border-(--color-border) bg-(--color-surface) p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[15.5px] font-bold text-(--color-fg)">
          <BellIcon className="text-(--color-accent)" />
          {copy.title}
          <span className="rounded-full bg-(--color-accent) px-2.5 py-0.5 text-[11.5px] font-bold text-white">
            {alerts.length} {copy.newSuffix}
          </span>
        </div>
        <span className="text-[13px] font-semibold text-(--color-accent)">{copy.markAllRead}</span>
      </div>
      <div className="flex flex-col gap-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex gap-3 rounded-[10px] border-l-[3px] p-3.5 ${toneSoftBgClasses[alert.tone]} ${toneBorderClasses[alert.tone]}`}
          >
            <div
              className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white ${toneSolidBgClasses[alert.tone]}`}
            >
              {alert.mark}
            </div>
            <div>
              <div className="mb-0.5 flex flex-wrap items-center gap-2 text-[13.5px] font-bold text-(--color-fg)">
                {alert.title}
                <span
                  className={`rounded-full bg-(--color-surface) px-1.5 py-px text-[10.5px] font-bold ${toneTextClasses[alert.tone]}`}
                >
                  {copy.newBadge}
                </span>
              </div>
              <div className="text-[13px] text-(--color-fg-soft)">{alert.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
