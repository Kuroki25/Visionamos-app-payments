# Controles de seguridad de `apps/api`

Cada control de [ADR 006](adr/006-authentication-strategy.md) tiene un test de
integración concreto que lo demuestra — no solo documentación (ver
[ADR 007](adr/007-testing-strategy.md)). Todos viven en
`apps/api/test/app.e2e-spec.ts`; la columna "Test" cita el título exacto de su
`it(...)` para que `grep`/`Ctrl+F` lo encuentre directo.

| Control | Mecanismo | Test |
| --- | --- | --- |
| Default deny (sección 22) | `JwtAuthGuard` global (`APP_GUARD`); toda ruta requiere `access_token` salvo `@Public()` | `a protected endpoint without an access token returns 401` |
| CSRF — double-submit cookie (sección 20/23) | `CsrfGuard` global exige que `X-CSRF-Token` (header) == `csrf_token` (cookie, no `httpOnly`) en todo método mutante | `a mutating request without a matching CSRF header/cookie returns 403` |
| Registro público + sesión por cookies `httpOnly` | `POST /auth/register` emite `access_token`/`refresh_token` como cookies `httpOnly`, nunca en el body JSON | `POST /auth/register with a valid payload returns 201, the user, and session cookies` |
| `passwordHash` nunca serializado (`select: false`) | `UserEntity.passwordHash` no viaja en ninguna respuesta | misma prueba — `expect(res.body).not.toHaveProperty('passwordHash')` |
| Email único (constraint de negocio) | `UsersService.create` traduce la violación de `UNIQUE(email)` a `409 Conflict` | `POST /auth/register with an already-registered email returns 409` |
| Sesión válida vía cookie | `GET /auth/me` resuelve el principal desde `access_token` sin credenciales explícitas | `GET /auth/me returns the authenticated user using the session cookie` |
| Autorización a nivel de objeto — API1 BOLA (sección 20) | `UsersController.findOne` compara `currentUser.id === params.id \|\| role === 'admin'` antes de delegar en el servicio | `GET /users/:id for the user's own id succeeds` + `GET /users/:id for a *different* id returns 403 (BOLA protection, API1)` |
| Autorización a nivel de función — API5 (sección 20) | `@Roles('admin')` + `RolesGuard` en `GET /users` (listado completo) | `GET /users (admin-only, API5) returns 403 for a non-admin member` |
| Revocación real de refresh tokens | `POST /auth/logout` marca el `refresh_tokens.revokedAt` correspondiente y limpia las cookies; la sesión deja de ser válida de inmediato | `POST /auth/logout clears the session and revokes the refresh token` |
| No enumeración de cuentas (OWASP A07) | `AuthService.validateCredentials` responde el mismo `401 Invalid email or password.` exista o no el email, y hashea igual en ambos casos (constante-time-ish) | `login with wrong credentials › returns a generic 401 that does not reveal whether the account exists` |
| Errores como `application/problem+json` (RFC 9457) | `AllExceptionsFilter` normaliza toda excepción, incluidas las de validación Zod | `POST /auth/register with a short password returns 400 as application/problem+json` |
| Longitud mínima de contraseña (`packages/contracts`) | `RegisterSchema`/`PasswordSchema` — 12 caracteres mínimo (sección "Contraseñas" de ADR 006) | misma prueba — payload con `password: 'short'` |
| El guard de auth corre antes que la validación del body | Con un `:id` malformado y sin sesión, la petición nunca llega al pipe de validación — se corta en `JwtAuthGuard` | `GET /users/:id with a malformed id returns 401 before reaching validation (no session)` |

## Qué NO cubre esta suite todavía

Documentado como pendiente explícito en ADR 006 (sección Consequences) — no
asumir cubierto solo porque el resto de la autenticación lo está:

- Verificación de email.
- Flujo de "olvidé mi contraseña".
- MFA.
- Bloqueo de cuenta tras intentos fallidos repetidos (más allá del rate limit
  de `POST /auth/login`, que sí existe pero no tiene un test de integración
  dedicado — está cubierto solo a nivel de configuración en
  `AuthController.login`'s `@Throttle`).
- Rotación/expiración forzada de contraseñas comprometidas.
- SSO/OIDC.

## Cómo mantener esta tabla honesta

Un control sin fila en esta tabla es un control sin test. Si se añade un
`@Public()`, un `@Roles(...)`, o cualquier chequeo de autorización nuevo en
`apps/api/src/modules/auth/` o que dependa de sus guards, la revisión de ese
PR debe exigir: (1) una fila nueva aquí, y (2) el `it(...)` que la respalda en
`app.e2e-spec.ts` — en ese orden, no al revés (sección 33: el test demuestra
el control, la fila solo lo indexa).
