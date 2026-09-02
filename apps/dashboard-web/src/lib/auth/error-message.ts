/**
 * Better Auth's client returns real, English error messages
 * (`better-auth`'s own `APIError` strings — e.g. "Invalid email or
 * password" from a real failed `signIn.email` call, confirmed against the
 * live server, not assumed) — unlike the business API's `ApiError`, whose
 * `detail` is already Spanish (`AllExceptionsFilter`). This app is
 * Spanish-only (`DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md`, "Textos y
 * contenido"), so known, stable Better Auth messages are translated here.
 *
 * An unrecognized message is returned as-is rather than replaced with a
 * generic fallback — showing the real detail for a case we haven't seen
 * yet is more honest than hiding it (§11 of the source of truth), even
 * if it surfaces in English until this table is extended.
 */
const KNOWN_MESSAGES: Record<string, string> = {
  'invalid email or password': 'Correo o contraseña incorrectos.',
  'invalid password': 'La contraseña actual es incorrecta.',
  'user not found': 'No existe una cuenta con ese correo.',
};

export function translateAuthErrorMessage(message: string | undefined | null): string | undefined {
  if (!message) return message ?? undefined;
  return KNOWN_MESSAGES[message.trim().toLowerCase()] ?? message;
}
