/**
 * Copy for "Gestión de Usuarios" and its forms. Adapted to the real `User`
 * shape (`@repo/contracts`, `users.ts`) — no company/cédula/teléfono/
 * ciudad/dirección/username fields exist on the real entity, unlike Claude
 * Design's mock, so the create/edit forms below don't have them either.
 * See `lib/users.ts`'s docblock.
 */
export const usuariosPage = {
  title: 'Gestión de Usuarios',
  subtitle: 'Administra usuarios, roles y permisos del sistema',
  searchPlaceholder: 'Buscar por nombre o correo...',
  filterAll: 'Todos',
  newUser: 'Nuevo usuario',
  empty: 'No se encontraron usuarios que coincidan con la búsqueda.',
  columns: { usuario: 'USUARIO', contacto: 'CONTACTO', rol: 'ROL', acciones: 'ACCIONES' },
  menu: { view: 'Ver usuario', edit: 'Editar', enable: 'Habilitar', disable: 'Deshabilitar' },
  scopeGlobal: 'Alcance global',
  scopePortalPrefix: 'Portal: ',
  scopeCommercePrefix: 'Comercio: ',

  createModal: {
    title: 'Crear nuevo usuario',
    subtitle: 'Completa la información para crear un nuevo usuario en el sistema. Se generarán credenciales provisionales automáticamente.',
    personalInfoHeading: 'INFORMACIÓN PERSONAL',
    fullNameLabel: 'Nombre completo',
    fullNamePlaceholder: 'Nombre completo del usuario',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'usuario@empresa.com',
    roleLabel: 'Rol',
    scopeTypeLabel: 'Alcance',
    scopeTypeOptions: { GLOBAL: 'Global', PORTAL: 'Un portal', COMMERCE: 'Un comercio' },
    portalLabel: 'Portal',
    portalPlaceholder: 'Selecciona un portal',
    commerceLabel: 'Comercio',
    commercePlaceholder: 'Selecciona un comercio',
    credentialsHeading: 'CREDENCIALES DE ACCESO',
    credentialsNotice: 'Se generarán credenciales provisionales. El usuario podrá cambiar su contraseña luego de iniciar sesión.',
    requiredError: 'Completa todos los campos obligatorios.',
    scopeRequiredError: 'Selecciona el portal o comercio correspondiente al rol.',
  },
  credentialModal: {
    title: 'Usuario creado correctamente',
    subtitle: 'Guarda esta contraseña provisional ahora — no se volverá a mostrar. El usuario podrá cambiarla luego de iniciar sesión.',
    emailLabel: 'Correo electrónico',
    passwordLabel: 'Contraseña provisional',
    copy: 'Copiar',
    copied: 'Copiada',
    done: 'Listo',
  },
  editModal: {
    title: 'Editar usuario',
    subtitle:
      'El backend solo permite actualizar el nombre completo desde aquí — correo, rol y alcance no son editables por esta vía.',
    fullNameLabel: 'Nombre completo',
  },
  viewModal: {
    title: 'Detalles del usuario',
    subtitle: 'Información del usuario en el sistema',
    email: 'Correo electrónico',
    role: 'Rol',
    scope: 'Alcance',
    status: 'Estado',
    createdAt: 'Creado',
    userId: 'ID de usuario',
  },
  toasts: {
    created: 'Usuario creado correctamente.',
    updated: 'Usuario actualizado correctamente.',
    enabled: 'Usuario habilitado.',
    disabled: 'Usuario deshabilitado.',
  },
  confirmDisable: { title: 'Deshabilitar usuario', messagePrefix: '¿Seguro que deseas deshabilitar a "', messageSuffix: '"? Perderá el acceso al sistema de inmediato.' },
  confirmEnable: { title: 'Habilitar usuario', messagePrefix: '¿Confirmas que quieres volver a habilitar a "', messageSuffix: '"?' },
  roleTilesSuffix: 'usuarios',
} as const;
