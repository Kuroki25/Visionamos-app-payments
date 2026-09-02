/**
 * Copy for handled error states (403/empty/etc.) that aren't specific to
 * one feature — `content/es/auth.ts` already covers the 401 case.
 */
export const errorsContent = {
  forbiddenTitle: 'No tienes acceso',
  forbiddenMessage: 'No tienes permisos para ver este recurso. Si crees que esto es un error, contacta a tu administrador.',
} as const;
