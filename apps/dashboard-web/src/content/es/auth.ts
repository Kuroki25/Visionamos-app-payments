/**
 * See `content/es/common.ts` for the centralization rule. Kept minimal on
 * purpose — only the strings the current error/session infrastructure
 * actually references. Login-form/UI copy is added when that screen is
 * built (Claude Design handoff), not invented ahead of it.
 */
export const auth = {
  unauthenticatedMessage: 'Tu sesión expiró o no has iniciado sesión. Inicia sesión de nuevo.',
  forbiddenMessage: 'No tienes permisos para realizar esta acción.',
} as const;
