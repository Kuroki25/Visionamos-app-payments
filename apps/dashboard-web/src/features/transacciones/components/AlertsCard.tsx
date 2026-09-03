'use client';

import { useState } from 'react';

import { BellIcon } from '../../../components/ui/icons';
import { transaccionesPage } from '../../../content/es/transacciones';
import { apiClient } from '../../../lib/api/client';
import type { TransactionAlertView } from '../../../lib/transactions';
import { toneBorderClasses, toneSoftBgClasses, toneSolidBgClasses, toneTextClasses } from '../../../lib/tone';

/**
 * "Alertas de transacciones" — derived from the same real, most-recent
 * transactions as the table below, each annotated with a real, per-user
 * read/unread state (`GET /transactions/alerts`, `transaction_alert_reads`
 * — docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md §17.4). "Marcar todas como
 * leídas" is a real mutation now (`POST /transactions/alerts/read-all`),
 * not decorative — it used to have no `onClick` at all.
 */
export function AlertsCard({ alerts: initialAlerts }: { alerts: TransactionAlertView[] }) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [marking, setMarking] = useState(false);
  const copy = transaccionesPage.alerts;
  const unreadCount = alerts.filter((a) => !a.isRead).length;

  async function handleMarkAllRead() {
    if (unreadCount === 0 || marking) return;
    setMarking(true);
    try {
      await apiClient.post('/transactions/alerts/read-all', {
        transactionIds: alerts.map((a) => a.transactionId),
      });
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    } catch {
      // Best-effort — state stays as-is (still unread) so the user can
      // just click again; no error surface for a non-critical action.
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className="mb-4 rounded-card border border-(--color-border) bg-(--color-surface) p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[15.5px] font-bold text-(--color-fg)">
          <BellIcon className="text-(--color-accent)" />
          {copy.title}
          {unreadCount > 0 ? (
            <span className="rounded-full bg-(--color-accent) px-2.5 py-0.5 text-[11.5px] font-bold text-white">
              {unreadCount} {copy.newSuffix}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void handleMarkAllRead()}
          disabled={unreadCount === 0 || marking}
          className="text-[13px] font-semibold text-(--color-accent) outline-none hover:underline disabled:cursor-default disabled:opacity-50 disabled:hover:no-underline"
        >
          {copy.markAllRead}
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {alerts.map((alert) => (
          <div
            key={alert.transactionId}
            className={`flex gap-3 rounded-[10px] border-l-[3px] p-3.5 ${toneSoftBgClasses[alert.tone]} ${toneBorderClasses[alert.tone]} ${alert.isRead ? 'opacity-60' : ''}`}
          >
            <div
              className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white ${toneSolidBgClasses[alert.tone]}`}
            >
              {alert.mark}
            </div>
            <div>
              <div className="mb-0.5 flex flex-wrap items-center gap-2 text-[13.5px] font-bold text-(--color-fg)">
                {alert.title}
                {!alert.isRead ? (
                  <span
                    className={`rounded-full bg-(--color-surface) px-1.5 py-px text-[10.5px] font-bold ${toneTextClasses[alert.tone]}`}
                  >
                    {copy.newBadge}
                  </span>
                ) : null}
              </div>
              <div className="text-[13px] text-(--color-fg-soft)">{alert.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
