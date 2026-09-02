/**
 * Copy for "Configuración". Adapted to what's real: the User entity only
 * has `fullName`/`email` (no phone/bio — `@repo/contracts`), `PATCH
 * /users/:id` only updates `fullName`, and password change goes through
 * Better Auth's own `changePassword` (not the business API) — see
 * `features/configuracion`'s components for where each is wired.
 *
 * "Notificaciones" joins the mock's own already-placeholder tabs
 * (Portales/Dashboard/Integraciones/Avanzado are "próximamente" even in
 * the mock) because there is no notification-preferences backend either —
 * see the handoff analysis.
 */
export const configuracionPage = {
  title: 'Configuración',
  subtitle: 'Administra tu perfil, seguridad y preferencias del sistema',
  tabs: {
    perfil: 'Perfil',
    seguridad: 'Seguridad',
    roles: 'Roles',
    notificaciones: 'Notificaciones',
    portales: 'Portales',
    dashboard: 'Dashboard',
    integraciones: 'Integraciones',
    avanzado: 'Avanzado',
  },
  comingSoon: {
    notificaciones: 'Preferencias de notificaciones — próximamente.',
    portales: 'Ajustes generales de portales — próximamente.',
    dashboard: 'Preferencias de widgets del dashboard — próximamente.',
    integraciones: 'Conecta servicios externos vía API — próximamente.',
    avanzado: 'Opciones técnicas avanzadas — próximamente.',
  },
  perfil: {
    title: 'Información de perfil',
    fullNameLabel: 'Nombre completo',
    emailLabel: 'Correo electrónico',
    emailHint: 'El correo no se puede modificar desde aquí.',
    save: 'Guardar cambios',
    saved: 'Perfil actualizado correctamente.',
    requiredError: 'El nombre no puede estar vacío.',
  },
  seguridad: {
    title: 'Cambiar contraseña',
    currentLabel: 'Contraseña actual',
    newLabel: 'Nueva contraseña',
    confirmLabel: 'Confirmar nueva contraseña',
    save: 'Actualizar contraseña',
    saved: 'Contraseña actualizada correctamente.',
    requiredError: 'Completa todos los campos.',
    mismatchError: 'Las contraseñas nuevas no coinciden.',
    tooShortError: 'La nueva contraseña debe tener al menos 12 caracteres.',
  },
  roles: {
    title: 'Catálogo de roles',
    subtitle: 'Los roles administrativos disponibles en el sistema.',
    descriptions: {
      SUPERADMIN: 'Acceso total a todas las funciones del sistema.',
      ADMIN_PORTAL: 'Gestiona un portal específico y sus aliados.',
      ADMIN_COMMERCE: 'Gestiona un comercio aliado específico.',
      VIEWER: 'Acceso de solo lectura, con alcance global, de portal o de comercio.',
    },
  },
} as const;
