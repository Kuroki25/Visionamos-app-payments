import type { Role } from '@repo/contracts';

import { configuracionPage } from '../../../content/es/configuracion';
import { roleLabels, roleTone } from '../../../content/es/roles';
import { toneSolidBgClasses } from '../../../lib/tone';

const ROLES: Role[] = ['SUPERADMIN', 'ADMIN_PORTAL', 'ADMIN_COMMERCE', 'VIEWER'];

/** The 4 real roles — not the mock's 5-role catalog (no "Comercio"/generic "Administrador" role exists — see `content/es/roles.ts`). */
export function RolesTab() {
  return (
    <div className="overflow-hidden rounded-card border border-(--color-border) bg-(--color-surface) shadow-card">
      {ROLES.map((role) => (
        <div key={role} className="flex items-center gap-3.5 border-b border-(--color-border) px-5 py-4 last:border-b-0">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${toneSolidBgClasses[roleTone[role]]}`} />
          <div>
            <div className="text-sm font-bold text-(--color-fg)">{roleLabels[role]}</div>
            <div className="mt-0.5 text-[12.5px] text-(--color-fg-faint)">{configuracionPage.roles.descriptions[role]}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
