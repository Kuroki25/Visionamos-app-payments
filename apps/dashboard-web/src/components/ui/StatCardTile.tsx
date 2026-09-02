/**
 * Simple label/value tile — Claude Design reuses this exact shape for
 * `portalHeaderStats` (Portales, Portal detail summary) and
 * `activeAliado.resumenStats` (Aliado detail): a card with just a small
 * faint label and a large bold value, no icon/sparkline (unlike the
 * richer `StatCard`).
 */
export function StatCardTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-(--color-border) bg-(--color-surface) p-4.5 shadow-card">
      <div className="text-[13px] text-(--color-fg-faint)">{label}</div>
      <div className="mt-1.5 text-[22px] font-extrabold text-(--color-fg)">{value}</div>
    </div>
  );
}
