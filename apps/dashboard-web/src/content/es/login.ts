/**
 * Copy for `/login` — ports Claude Design's "RedCoop Login.dc.html". Built
 * now (outside the original Dashboard-only handoff scope) because real E2E
 * verification of Better Auth needs an actual login form to drive — there
 * was no other way to obtain a real session through the browser.
 */
export const loginPage = {
  brand: { name: 'RedCoop', sub: 'pagos' },
  hero: {
    title: 'Gestiona todos tus pagos desde un solo lugar',
    subtitle:
      'Monitorea transacciones, administra portales y controla el acceso de tu equipo con la plataforma de pagos de tu cooperativa.',
    copyright: '© 2026 RedCoop pagos. Todos los derechos reservados.',
  },
  login: {
    title: 'Inicia sesión',
    subtitle: 'Ingresa tus credenciales para acceder al panel',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'tucorreo@redcoop.com',
    emailInvalid: 'Ingresa un correo válido.',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Ingresa tu contraseña',
    passwordRequired: 'Ingresa tu contraseña.',
    forgotPassword: '¿Olvidaste tu contraseña?',
    remember: 'Recordarme',
    submit: 'Iniciar sesión',
    submitting: 'Iniciando sesión...',
    genericError: 'Correo o contraseña incorrectos. Intenta nuevamente.',
    noAccount: '¿No tienes una cuenta?',
    contactAdmin: 'Contacta a tu administrador',
  },
  forgot: {
    back: 'Volver',
    title: 'Recupera tu contraseña',
    subtitle: 'Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña, si el envío de correo está disponible.',
    emailLabel: 'Correo electrónico',
    submit: 'Enviar enlace de recuperación',
    submitting: 'Enviando...',
    // Real attempt via Better Auth's own forgetPassword — no email-sending
    // provider is confirmed configured in this backend yet, so this is
    // honest about the possible outcome instead of faking the mock's
    // always-succeeds animation.
    unavailable: 'No pudimos enviar el enlace en este momento. El envío de correos aún no está disponible — contacta a tu administrador.',
    sentTitle: 'Revisa tu correo',
    sentPrefix: 'Si existe una cuenta con ese correo, enviamos un enlace para restablecer tu contraseña a ',
    backToLogin: 'Volver a iniciar sesión',
  },
} as const;
