import { aliadoDetailPage } from '../../../content/es/aliadoDetail';
import type { AliadoHeaderInfo } from '../../../lib/aliado-detail';
import { toneBadgeClasses } from '../../../lib/tone';

export function AliadoHeaderCard({
  name,
  categoryName,
  taxId,
  info,
}: {
  name: string;
  categoryName: string;
  taxId: string;
  info: AliadoHeaderInfo;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3.5 rounded-card border border-(--color-border) bg-(--color-surface) p-5 shadow-card">
      <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-(--color-accent-soft) text-lg font-extrabold text-(--color-accent)">
        {info.initials}
      </div>
      <div className="min-w-[200px] flex-1">
        <div className="text-[19px] font-extrabold text-(--color-fg)">{name}</div>
        <div className="mt-0.5 text-[13px] text-(--color-fg-faint)">
          {categoryName} · NIT {taxId} · {aliadoDetailPage.sinceLabel} {info.sinceLabel}
        </div>
      </div>
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${toneBadgeClasses[info.estadoTone]}`}>
        {info.estadoLabel}
      </span>
    </div>
  );
}
