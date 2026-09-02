import type { Role } from '@repo/contracts';

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
