import type { Commerce, Portal, User } from '@repo/contracts';

import { roleLabels, roleTone } from '../content/es/roles';
import { usuariosPage } from '../content/es/usuarios';
import { formatDateEs, getInitials } from './format';
import type { Tone } from './tone';

/**
 * View model for a Usuarios table row. The real `User`
 * (`@repo/contracts`, `users.ts`) has no company/cédula/teléfono/ciudad/
 * dirección/username/lastAccess/updatedAt fields — Claude Design's mock
 * invents all of those. This only surfaces what's real: id, fullName,
 * email, role, scope (resolved to a portal/commerce name), status,
 * createdAt.
 */
export interface UserRow {
  id: string;
  fullName: string;
  email: string;
  initials: string;
  roleLabel: string;
  roleTone: Tone;
  scopeLabel: string;
  estadoLabel: string;
  estadoTone: Tone;
  createdAtLabel: string;
}

export function buildUserRow(user: User, portalsById: Map<string, Portal>, commercesById: Map<string, Commerce>): UserRow {
  let scopeLabel = usuariosPage.scopeGlobal;
  if (user.scopeType === 'PORTAL' && user.scopePortalId) {
    scopeLabel = usuariosPage.scopePortalPrefix + (portalsById.get(user.scopePortalId)?.name ?? user.scopePortalId);
  } else if (user.scopeType === 'COMMERCE' && user.scopeCommerceId) {
    scopeLabel =
      usuariosPage.scopeCommercePrefix + (commercesById.get(user.scopeCommerceId)?.tradeName ?? user.scopeCommerceId);
  }

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    initials: getInitials(user.fullName),
    roleLabel: roleLabels[user.role],
    roleTone: roleTone[user.role],
    scopeLabel,
    estadoLabel: user.status === 'ACTIVE' ? 'Activo' : 'Inactivo',
    estadoTone: user.status === 'ACTIVE' ? 'success' : 'danger',
    createdAtLabel: formatDateEs(user.createdAt),
  };
}

export interface RoleCount {
  role: User['role'];
  label: string;
  tone: Tone;
  count: number;
}

export function buildRoleCounts(users: User[]): RoleCount[] {
  return (Object.keys(roleLabels) as Array<User['role']>).map((role) => ({
    role,
    label: roleLabels[role],
    tone: roleTone[role],
    count: users.filter((u) => u.role === role).length,
  }));
}
