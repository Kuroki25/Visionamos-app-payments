import { toneSoftBgClasses, toneTextClasses } from '../../../lib/tone';
import type { RoleCount } from '../../../lib/users';

export function RoleCountTiles({ counts }: { counts: RoleCount[] }) {
  return (
    <div className="mb-4.5 grid grid-cols-4 gap-3.5">
      {counts.map((rc) => (
        <div key={rc.role} className={`rounded-card-sm p-4 ${toneSoftBgClasses[rc.tone]}`}>
          <div className={`text-[13px] font-semibold ${toneTextClasses[rc.tone]}`}>{rc.label}</div>
          <div className={`mt-1 text-[26px] font-extrabold ${toneTextClasses[rc.tone]}`}>{rc.count}</div>
        </div>
      ))}
    </div>
  );
}
