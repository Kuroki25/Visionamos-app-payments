import type { InfoField } from '../../../lib/aliado-detail';

export function InformacionTab({ fields }: { fields: InfoField[] }) {
  return (
    <div className="grid grid-cols-2 gap-5 rounded-card border border-(--color-border) bg-(--color-surface) p-6 shadow-card">
      {fields.map((f) => (
        <div key={f.label}>
          <div className="text-xs text-(--color-fg-faint)">{f.label}</div>
          <div className="mt-0.5 text-[13.5px] font-semibold text-(--color-fg)">{f.value}</div>
        </div>
      ))}
    </div>
  );
}
