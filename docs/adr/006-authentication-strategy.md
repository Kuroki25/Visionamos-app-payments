# ADR 006: Estrategia de autenticación y autorización

**Status:** Aceptado
**Fecha:** 2026-08-28

## Context

Antes de escribir código de autenticación, la sección 20 del prompt exige
responder: ¿usuarios internos o públicos? ¿SSO? ¿sesiones o tokens? ¿MFA?
¿roles? Se preguntó explícitamente al responsable del proyecto:

- **Población de usuarios:** solo usuarios públicos. `portal-web` permite
  auto-registro (email + contraseña). `dashboard-web` es para staff, pero se
  autentica contra el mismo sistema de usuarios de `apps/api` — no hay
  proveedor de identidad externo (SSO/OIDC) todavía.
- **Estrategia de sesión:** JWT de acceso + refresh en cookies `httpOnly`
  (no `localStorage`, no JWT solo en memoria).

No hay requisito de MFA ni de SSO en esta fase; ambos quedan como extensión
futura explícita (ver Consequences).

## Decision

### Tokens y cookies

- **Access token JWT**, vida corta (`JWT_ACCESS_TTL`, default 15 min), firmado
  con `JWT_ACCESS_SECRET`. Cookie `access_token`: `httpOnly`, `Secure`
  (`COOKIE_SECURE`, default `true`), `SameSite=Lax`, `path=/`.
- **Refresh token JWT**, vida larga (`JWT_REFRESH_TTL_DAYS`, default 7 días),
  firmado con `JWT_REFRESH_SECRET` (secreto **distinto** al de acceso — un
  access token filtrado no sirve para forjar refresh tokens). Cookie
  `refresh_token`: mismos flags, `path=/api/v1/auth` (solo viaja hacia
  `/auth/refresh` y `/auth/logout`, nunca hacia el resto de la API).
- **Nunca** en `localStorage`/`sessionStorage` ni devueltos en el cuerpo JSON
  — evita que un XSS pueda leerlos directamente vía `document.cookie`
  (`httpOnly`) ni que persistan fuera del control del navegador.
- **Revocación real**: cada refresh token emitido se registra en
  `refresh_tokens` (`apps/api/src/modules/auth/entities/refresh-token.entity.ts`)
  con el **hash** (SHA-256) del token, no el valor crudo — igual que una
  contraseña, una fuga de la base de datos no debe alcanzar para reproducir
  sesiones. `POST /auth/refresh` **rota**: el token presentado se marca
  revocado exista o no, y se emite uno nuevo — reutilizar un refresh token ya
  usado (señal de robo) falla inmediatamente. `POST /auth/logout` revoca
  explícitamente.

### CSRF (double-submit cookie)

Usar cookies para autenticación implica que el navegador las adjunta
automáticamente a cualquier request, incluida una petición disparada por un
sitio malicioso (CSRF). Mitigación: `CsrfCookieMiddleware` emite una cookie
`csrf_token` **no** `httpOnly` en cualquier respuesta que no la tenga aún;
`CsrfGuard` (global, exento en `GET/HEAD/OPTIONS`) exige que toda petición
mutante repita ese mismo valor en el header `X-CSRF-Token`. Un atacante
cross-site puede hacer que el navegador de la víctima *envíe* la cookie, pero
no puede *leerla* para copiarla al header (same-origin policy) — de ahí que
"doble envío" sea suficiente sin necesitar estado de sesión server-side
adicional.

### Contraseñas

**Argon2id** (paquete `argon2`, bindings nativos de la librería de referencia
`argon2` de P-H-C) — primera opción del OWASP Password Storage Cheat Sheet,
preferido sobre bcrypt. Longitud mínima 12 caracteres, máxima 128
(`packages/contracts/src/auth.ts`), sin reglas de composición forzada (NIST SP
800-63B desaconseja explícitamente exigir mayúsculas/símbolos: favorecen
patrones predecibles). `UserEntity.passwordHash` tiene `select: false` — un
`find()`/`findOneBy()` normal nunca lo trae; solo
`UsersService.findEntityByEmailWithPassword` (usado exclusivamente por
`AuthService.validateCredentials`) lo selecciona explícitamente.

### Autorización

- **Default deny** (sección 22): `JwtAuthGuard` está registrado como
  `APP_GUARD` global — toda ruta requiere un access token válido salvo que
  declare `@Public()` explícitamente (`/health`, `/auth/login`,
  `/auth/refresh`, `/auth/logout`).
- **RBAC + Scope** (ver ADR 011 para el detalle completo): el modelo de roles
  plano `'admin' | 'member'` de la versión inicial se reemplazó por
  `SUPERADMIN | ADMIN_PORTAL | ADMIN_COMMERCE | VIEWER` + un alcance
  organizacional (`role_assignments`), exigido por
  `docs/business/ROLE_PERMISSION_MATRIX.md`. `@Roles(...)` + `RolesGuard`
  siguen cubriendo autorización a **nivel de función** (API5) sin cambios de
  mecánica; lo que cambia es el catálogo de roles válidos y que ya no basta
  con el rol solo — la mayoría de operaciones también validan el scope
  (ADR 011).
- **Sin autoregistro público**: `POST /auth/register` se **eliminó**. En Red
  Coopagos `AppUser` representa exclusivamente cuentas administrativas del
  Backoffice — no existe un flujo de autoregistro público equivalente al
  original genérico. La creación de usuarios ahora es
  `POST /users` (autenticado, sujeto a la matriz de creación de ADR 011):
  solo `SUPERADMIN`, `ADMIN_PORTAL` o `ADMIN_COMMERCE` pueden crear un nuevo
  `AppUser`, y únicamente dentro de los roles/alcances que su propio scope
  autoriza. El primer `SUPERADMIN` del sistema se crea mediante un script de
  seed idempotente (`pnpm --filter api seed:superadmin`), no vía API — ver
  ADR 010.
- **Autorización a nivel de objeto** (API1 — BOLA): no se resuelve con un
  guard genérico — `UsersController.findOne` compara explícitamente
  `currentUser.id === params.id || currentUser.role === 'admin'` antes de
  delegar en el servicio. Ver `docs/SECURITY-CONTROLS.md` para el test que lo
  demuestra.
- Ni email de bienvenida, ni verificación de email, ni "olvidé mi
  contraseña" están implementados todavía — quedan fuera de esta fase (no
  bloquean el resto de la arquitectura) y se listan en Consequences.

## Alternatives considered

- **Authorization Code Flow + PKCE contra un IdP externo (Auth0, Keycloak,
  Entra ID)**: es la recomendación del prompt (sección 20) para
  aplicaciones modernas, pero requiere un proveedor real que hoy no existe
  para este proyecto. Se documenta como la ruta a seguir el día que aparezca
  el requisito de SSO — la separación actual (`AuthModule` autocontenido,
  `packages/contracts` sin acoplar a NestJS) no bloquea esa migración.
- **Implicit Grant**: explícitamente prohibido por el prompt: no se considera.
- **`passport` + `passport-jwt` + `@nestjs/passport`**: es el camino "de
  manual" de NestJS para JWT, pero su extractor está pensado para el header
  `Authorization: Bearer`. Nuestra única fuente de token es una cookie
  `httpOnly`; adaptar la abstracción de estrategias de Passport para un único
  flujo cookie-only añade una capa de indirección sin beneficio real
  (sobreingeniería, sección 14/38) — un `CanActivate` propio sobre
  `@nestjs/jwt`'s `JwtService` es más corto y más fácil de auditar.
- **JWT en `localStorage`**: descartado explícitamente por el prompt
  (sección 20) salvo justificación excepcional; no aplica aquí.
- **`@nestjs/jwt@12.0.1` (la última publicada)**: ESM-only, rompe Jest/CJS —
  mismo patrón que ADR 009. Se usa `11.0.2`.

## Consequences

- `apps/api` no expone ningún flujo de creación de cuenta sin autenticación —
  ni `POST /auth/register` (eliminado) ni un `POST /users` público. La
  creación de usuarios ocurre exclusivamente vía `POST /users` autenticado,
  sujeto a la matriz de creación de roles de ADR 011.
- Toda ruta nueva es privada por defecto; un desarrollador debe añadir
  `@Public()` conscientemente, lo cual queda visible en code review.
- **Pendiente explícito** (no implementado en esta fase, no debe asumirse
  cubierto): verificación de email, flujo de "olvidé mi contraseña", MFA,
  bloqueo de cuenta tras intentos fallidos repetidos (más allá del rate limit
  de `POST /auth/login`), rotación/expiración forzada de contraseñas
  comprometidas (ej. contra HaveIBeenPwned), soporte SSO/OIDC. Cada uno debe
  entrar como su propia tarea con su propio ADR/actualización de este
  documento si el negocio lo requiere.
- `docs/SECURITY-CONTROLS.md` mapea cada control aquí descrito a un test de
  integración concreto en `apps/api/test/app.e2e-spec.ts`.

## Trade-offs

El double-submit CSRF cookie requiere que el frontend lea `document.cookie`
para reenviar `X-CSRF-Token` — un detalle de integración que `portal-web`/
`dashboard-web` deben implementar en su cliente HTTP compartido cuando
empiecen a consumir estos endpoints (no implementado todavía en los
frontends; API1/CSRF están verificados desde el lado del backend).
