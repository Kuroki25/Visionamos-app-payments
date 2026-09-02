import type { Role } from '@repo/contracts';

import type { Tone } from '../../lib/tone';

/**
 * Spanish display labels for the real, closed `Role` enum
 * (`@repo/contracts`, `roles.ts`) — SUPERADMIN/ADMIN_PORTAL/ADMIN_COMMERCE/
 * VIEWER. Claude Design's mock ("RedCoop Dashboard.dc.html") shows a
 * 5-role catalog (Superadministrador/Administrador/Portal/Comercio/Visor)
 * that doesn't exist in the backend's role model — this map uses the 4
 * roles that actually exist, not the mock's set. See "Correspondencia
 * diseño → arquitectura" in the handoff analysis, item ROLES.
 */
export const roleLabels: Record<Role, string> = {
  SUPERADMIN: 'Superadministrador',
  ADMIN_PORTAL: 'Administrador de portal',
  ADMIN_COMMERCE: 'Administrador de comercio',
  VIEWER: 'Visor',
};

/**
 * Claude Design's role chips use a one-off purple for Superadministrador
 * that isn't part of the shared theme (see `lib/tone.ts`'s docblock) — this
 * maps the 4 real roles onto the 5 shared tones instead of introducing a
 * token used by exactly one role.
 */
export const roleTone: Record<Role, Tone> = {
  SUPERADMIN: 'accent',
  ADMIN_PORTAL: 'success',
  ADMIN_COMMERCE: 'orange',
  VIEWER: 'neutral',
};
