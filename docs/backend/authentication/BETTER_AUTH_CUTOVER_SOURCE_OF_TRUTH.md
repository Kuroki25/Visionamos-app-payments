<!--
Fuente de verdad permanente para la migración de autenticación a Better
Auth. Creada 2026-09-01, después del cutover real (guard conectado en
app.module.ts, handler HTTP montado, vertical slice probado contra el
servidor real). Mantener actualizada tras cada gate — no reescribir la
historia, solo actualizar estado/evidencia.
-->

# Better Auth Cutover — Source of Truth

## Objetivo

Better Auth es el único mecanismo de autenticación de la aplicación.

La migración preserva:

- arquitectura existente (monorepo, NestJS modular, TypeORM, PostgreSQL)
- modelo de negocio y autorización (`role_assignments`, `ScopeAuthorizationService`)
- roles y scopes (`SUPERADMIN`/`ADMIN_PORTAL`/`ADMIN_COMMERCE`/`VIEWER`)
- seguridad (CSRF, cookies httpOnly, rate limiting, auditoría)
- testing, mantenibilidad

## Decisiones bloqueadas

1. Better Auth reemplaza JWT — **cutover real completado** (ver GATE 3/5 abajo).
2. No hay doble autenticación activa — `app.module.ts` usa
   `BetterAuthSessionGuard` únicamente; `JwtAuthGuard`/`AuthService`/
   `RefreshTokenEntity` fueron eliminados del repo, no solo desconectados
   (GAP-CUTOVER-1, RESUELTO).
3. Better Auth controla autenticación/sesiones (`/api/auth/*`, handler nativo).
4. NestJS controla autorización y negocio (`RolesGuard`, `ScopeAuthorizationService`,
   `role_assignments` — sin cambios de ninguno de estos).
5. TypeORM continúa siendo el ORM.
6. PostgreSQL continúa siendo la base de datos — además, desde
   `docs/adr/010-persistence.md` "Actualización 2026-09-01", **todo entorno**
   (incluidos los tests) usa PostgreSQL real, no solo development/production.
7. No se rehizo código que ya estaba correctamente implementado — ver la
   matriz KEEP/ADAPT/MISSING de la sección 5.
8. No se hicieron refactors masivos innecesarios.
9. El estado real del repositorio se inspeccionó con comandos reales antes
   de aplicar cada paso (ver evidencia en cada sección).
10. Estas decisiones no se cambian silenciosamente — cualquier cambio queda
    documentado aquí y en el ADR correspondiente.

## Frontera HTTP real (implementada, no solo planeada)

```text
Frontend (aún no existe — ver "Frontend" en la matriz)
   ↓
Better Auth Client
   ↓
/api/auth/*  (handler nativo, toNodeHandler, sin prefijo api/v1)
   ↓
Better Auth (better-auth@1.7.2)
   ↓
session / cookie httpOnly (better-auth.session_token)

/api/v1/*
   ↓
NestJS (global prefix, ZodValidationPipe, AllExceptionsFilter)
   ↓
ThrottlerGuard → BetterAuthSessionGuard → RolesGuard → CsrfGuard
   ↓
AppUser (role_assignments, resuelto en cada request — no embebido en la sesión)
   ↓
RBAC / Scope (ScopeAuthorizationService)
   ↓
Controllers → Services → TypeORM → PostgreSQL
```

Verificado real, no diagramado en abstracto — ver §6 "Vertical slice".

## Regla sobre AuthController

Se usa el handler HTTP **nativo** de Better Auth
(`apps/api/src/infra/better-auth/mount-better-auth-handler.ts`,
`toNodeHandler(auth)` montado en `/api/auth`) — no se creó un
`AuthController` propio que reimplemente el protocolo HTTP de Better Auth.

El `AuthController` **legacy** (login/refresh/logout JWT) fue retirado —
ver GAP-CUTOVER-1. Solo sobrevive `GET /auth/me`, que nunca fue JWT.

## Clasificación de piezas (auditoría real, 2026-09-01)

| Pieza | Estado real | Clasificación | Evidencia |
|---|---|---|---|
| Better Auth config (`better-auth.factory.ts`) | Implementado, `generateId:'uuid'`, Argon2id reutilizado, `disableSignUp:true` | KEEP | Fases 3/5, verificado contra el paquete instalado |
| Better Auth DB (`user`/`session`/`account`/`verification`) | Creadas y migradas en `visionamos` (dev real) y `visionamos_test` | KEEP | `docs/auth-migration/06-real-migration-run.md`, `09-real-postgres-test-suite.md` |
| Better Auth HTTP handler | Montado en `/api/auth/*` vía `toNodeHandler`, `configureApp()` | KEEP (nuevo, cierra el gap encontrado en esta sesión) | `mount-better-auth-handler.ts`, vertical slice §6 |
| `BetterAuthModule` | Expone `BETTER_AUTH_INSTANCE`/`BetterAuthSessionGuard`, cierra su propio `pg.Pool` en `onModuleDestroy` | KEEP | `better-auth.module.ts` — el cierre del pool se agregó en esta sesión tras encontrar fugas de conexión reales (503 intermitente en `/health`) |
| `BetterAuthSessionGuard` | Conectado en `app.module.ts` como `APP_GUARD`, reemplaza a `JwtAuthGuard` | KEEP (ya en producción real) | `app.module.ts`, GATE 5 |
| `createBetterAuthIdentity` (helper) | Crea `user`+`account` de Better Auth junto con cada `AppUser` — usado por `UsersService.createWithRoleAssignment`, `seed-superadmin.ts`, `seed-demo.ts`, `test/helpers/seed-superadmin.ts`, `migrate-users-to-better-auth.ts` | MISSING → implementado en esta sesión (GAP-CUTOVER-2) | `create-better-auth-identity.ts` |
| `AuthController`/`AuthService` (JWT legacy: login/refresh/logout) | Eliminados — `AuthController` reducido a `GET /auth/me` | REMOVE_AFTER_CUTOVER → **retirado** | GAP-CUTOVER-1, `auth.controller.ts` actual |
| `JwtAuthGuard`/`JwtModule`/`@nestjs/jwt` | Archivo y dependencia eliminados | REMOVE_AFTER_CUTOVER → **retirado** | GAP-CUTOVER-1 |
| `refresh_tokens` (tabla) | `DROP TABLE` real, ambas bases | REMOVE_AFTER_CUTOVER → **retirado** | Migración `AlterUsersForBetterAuthCutover1788285369312` |
| `users.password_hash` (columna) | `DROP COLUMN` real, ambas bases; `UserEntity.id` ahora FK explícita a `"user"(id)` | REMOVE_AFTER_CUTOVER → **retirado** | misma migración |
| `AppUser`/`role_assignments`/`ScopeAuthorizationService`/`RolesGuard` | Sin cambios, funcionando | KEEP | Fase 7 rehearsal, 12/12; suite real 69/69 |
| RBAC / portal scope / commerce scope | Sin cambios, verificado real contra Postgres | KEEP | Fase 7 §"BOLA — cross-portal/cross-commerce" |
| Frontend auth client / API client / `auth_token` / Bearer / localStorage | No existe ningún frontend con lógica de auth todavía | UNRELATED (no aplica — nada que migrar) | Fase 1 audit: `apps/portal-web`, `apps/dashboard-web` sin cliente de auth |
| CORS / `trustedOrigins` | `better-auth.factory.ts` ahora configura `trustedOrigins` reutilizando `CORS_ALLOWED_ORIGINS` | MISSING → implementado en esta sesión (GAP-CUTOVER-4) | Ver GAP-CUTOVER-4 |
| CSRF | `CsrfGuard` (double-submit) sigue protegiendo `/api/v1/*`; Better Auth protege `/api/auth/*` con su propio chequeo de origen — dos mecanismos, cada uno en su territorio, sin solaparse | KEEP | ADR 013, verificado real arriba |
| Swagger/OpenAPI | Sin cambios — `/api/auth/*` no está documentado ahí (fuera del árbol de Nest), `/api/v1/*` sigue igual | KEEP (con hueco de documentación, no bloqueante) | `main.ts` |
| Rate limiting | `ThrottlerGuard` sigue primero en la cadena, sin cambios | KEEP | `app.module.ts` |
| Tests | 69/69 e2e reales (Postgres real, dedicado), 40/40 unit, 12/12 rehearsal Fase 7 | KEEP/ADAPT (varios reescritos esta sesión) | ver GATE 6 |

## GAP-CUTOVER-1 — JWT legacy retirado (RESUELTO)

`AuthService`, `JwtAuthGuard`, `RefreshTokenEntity`, el DTO de login, y
`LoginSchema` (`@repo/contracts`) fueron eliminados. `AuthController` quedó
reducido a `GET /auth/me` (nunca fue JWT — solo mapea `req.user` al perfil
`AppUser`, idéntico antes y después). `UserEntity` perdió `password_hash` y
su `id` dejó de autogenerarse (ahora es una FK explícita hacia `"user"` de
Better Auth). Migración real `AlterUsersForBetterAuthCutover1788285369312`
aplicada contra **ambas** bases (`visionamos` real y `visionamos_test`) —
`ALTER TABLE users DROP COLUMN password_hash`, nueva `FOREIGN KEY (id)
REFERENCES "user"(id)`, `DROP TABLE refresh_tokens`. `@nestjs/jwt` (paquete)
desinstalado. `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`/`JWT_ACCESS_TTL`
retirados de `EnvSchema`; `JWT_REFRESH_TTL_DAYS` renombrado a
`BETTER_AUTH_SESSION_TTL_DAYS` (mismo propósito, dueño distinto).

Verificado real, dos veces (contra `visionamos_test` y contra `visionamos`
real, con backup tomado antes de tocar la real): los 5 usuarios reales
siguen intactos, `pnpm test`/`test:integration`/`test:auth-cutover-rehearsal`/
`build` en verde, servidor real (`node dist/main.js`) responde
`POST /api/v1/auth/login` con **404** (ruta genuinamente inexistente, no
solo "guard la rechaza").

## GAP-CUTOVER-2 — creación de usuarios no llegaba a Better Auth (encontrado y corregido)

`UsersService.createWithRoleAssignment` (`POST /users`) escribía
`AppUser`/`role_assignments` pero nunca creaba la contraparte en Better
Auth — todo usuario creado por la API real (no por los scripts de seed) no
podía loguearse jamás. Encontrado por evidencia real (69 tests fallando al
conectar el guard) y corregido con `createBetterAuthIdentity`, ahora
reutilizado en los 5 puntos donde se crea un `AppUser`. Ver la lista
completa en la matriz de arriba.

## GAP-CUTOVER-3 — fuga de conexiones de Postgres (encontrada y corregida)

`better-auth.factory.ts` construía su propio `pg.Pool` sin que nada lo
cerrara — cada `Test.createTestingModule` (cada archivo de test) lo dejaba
abierto indefinidamente. Síntoma real observado: `GET /api/v1/health`
devolvía 503 intermitente (agotamiento de conexiones), y Jest reportaba
"did not exit one second after the test run" en cada corrida. Corregido:
`BetterAuthModule` ahora es dueño explícito del `Pool` y lo cierra en
`onModuleDestroy`. Verificado: el warning de Jest desapareció, `/health`
deja de fallar.

## GAP-CUTOVER-4 — Better Auth no confiaba en los orígenes reales del frontend (encontrado y corregido)

Better Auth tiene su **propio** allowlist de orígenes para `/api/auth/*`
(`node_modules/better-auth/dist/api/middlewares/origin-check.mjs`) —
completamente separado de `CORS_ALLOWED_ORIGINS`/`enableCors` de Nest
(`configure-app.ts`), que solo gobierna `/api/v1/*`. Sin `trustedOrigins`
configurado explícitamente, el único origen confiable era `baseURL`
(`http://localhost:4100`) — cualquier llamada real desde
`http://localhost:3100`/`3101` (los puertos reales de los futuros
frontends) que llevara la cookie de sesión (`sign-out`, o `sign-in` una vez
autenticado) habría fallado con `INVALID_ORIGIN`.

Encontrado durante la verificación final del vertical slice contra el
servidor real: un primer intento con `Origin: http://localhost:3101`
pareció funcionar, pero resultó ser un servidor **obsoleto** todavía vivo
de una corrida anterior (`taskkill //F //IM node.exe` no se limpia solo con
`pkill` en este entorno Windows/Git Bash — lección aprendida, verificar
`tasklist` antes de confiar en un resultado de servidor real). Con el
servidor realmente reconstruido, la falla era 100% reproducible.

**Corregido**: `better-auth.factory.ts` ahora configura
`trustedOrigins: env.CORS_ALLOWED_ORIGINS.split(',')...` — mismo parseo que
`configure-app.ts` ya usa para `enableCors`, una sola fuente de verdad.

## GATE 3 — Better Auth se autentica realmente por HTTP desde un cliente externo

**PASSED.** Verificado con `curl` real contra el servidor compilado
(`node dist/main.js`, reconstruido **y confirmado como único proceso vivo**
vía `tasklist`/`taskkill //F //IM node.exe` — ver GAP-CUTOVER-4), desde un
origen real de frontend, no solo `localhost:4100`:

```text
POST /api/auth/sign-in/email (Origin: http://localhost:3101, sin cookie previa) → 200, cookie better-auth.session_token
GET  /api/v1/auth/me (con cookie)                                              → 200, AppUser correcto
POST /api/auth/sign-out (Origin: http://localhost:3101, CON cookie)            → 200
GET  /api/v1/auth/me (después de sign-out)                                     → 401
POST /api/v1/auth/login (ruta legacy — ya no existe)                           → 404
```

## GATE 4/GATE 5 — vertical slice de sesión + autorización RedCoop conectada

**PASSED.** El mismo flujo de arriba, más BOLA/BFLA/revocación/cuenta
desactivada probados contra Postgres real y contra la app real (no un
módulo de rehearsal aislado — `app.module.ts` tal como corre hoy):

- `test/app.e2e-spec.ts` — login → me → logout, con Better Auth real.
- `test/better-auth/cutover-rehearsal.pg-e2e.ts` — BOLA cross-portal/
  cross-commerce, BFLA, revocación de sesión, cuenta desactivada — 12/12.
- Los otros 3 archivos e2e (`catalog`, `forms`, `transactions`,
  `users-and-roles`) — autorización de negocio completa, sin cambios de
  comportamiento, corriendo ahora sobre el guard real.

## GATE 6 — Testing, build, documentación

**PASSED**, con evidencia real de comandos ejecutados (no afirmaciones):

| Comando | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | Limpio |
| `pnpm exec eslint "{src,test}/**/*.ts"` | Limpio |
| `pnpm test` (unit) | 40/40 |
| `pnpm test:integration` (e2e, Postgres real dedicado) | 69/69, dos corridas consecutivas |
| `pnpm test:auth-cutover-rehearsal` (Fase 7, Postgres real dev) | 12/12 |
| `pnpm build` | Limpio |
| Servidor real (`node dist/main.js`) + curl | Vertical slice completo, ver GATE 3 |
| Datos reales de `seed-demo.ts` | Verificados sin cambios después de toda la sesión |

## Definition of Done

- [x] Better Auth = única autenticación activa en `app.module.ts`
- [x] Login real funciona (HTTP real, servidor real)
- [x] Sesión funciona (server-side, revocación inmediata — Fase 7/AUTH-01)
- [x] NestJS reconoce identidad (`BetterAuthSessionGuard` → `AuthenticatedRequestUser`)
- [x] RBAC funciona (sin cambios, verificado real)
- [x] Scopes funcionan (BOLA cross-portal/cross-commerce, verificado real)
- [x] 401/403 correctos (verificado real, incluyendo el caso cuenta-desactivada-durante-sesión)
- [x] Logout invalida sesión (verificado real, servidor + tests)
- [ ] Frontend ya no usa JWT — **N/A, no existe frontend con auth todavía** (Fase 1)
- [x] JWT legacy eliminado (GAP-CUTOVER-1)
- [x] Tests pasan (69+40+12)
- [x] typecheck pasa
- [x] lint pasa
- [x] build pasa
- [x] Documentación actualizada (este documento + ADR 013 + `docs/auth-migration/`)

## Tabla de gates

| Gate | Estado | Evidencia | Pendiente |
|---|---|---|---|
| GATE 0 (auditoría del estado real) | PASSED | Esta sesión completa, Fases 0-9 de `docs/auth-migration/` | — |
| GATE 1 (Better Auth autentica por HTTP) | PASSED | §"GATE 3" arriba (curl real) | — |
| GATE 2 (vertical slice de sesión) | PASSED | §"GATE 4/5" arriba | — |
| GATE 3 (autorización RedCoop conectada) | PASSED | Fase 7 rehearsal + suite real 69/69 | — |
| GATE 4 (frontend migrado) | N/A | No existe frontend con auth | — |
| GATE 5 (retiro de JWT legacy) | PASSED | GAP-CUTOVER-1, migración `AlterUsersForBetterAuthCutover1788285369312` aplicada a ambas bases | — |
| GATE 6 (testing/build/docs) | PASSED | Tabla arriba, actualizada tras el retiro de JWT y GAP-CUTOVER-4 | — |

## Pendiente real, no bloqueante

- **GAP-CUTOVER-4 verificado con `curl` manual, no con un test automatizado
  permanente** — ningún archivo de `test/` fija `trustedOrigins`
  específicamente. Si se quiere blindar contra una regresión futura,
  añadir un caso a `test/better-auth/cutover-rehearsal.pg-e2e.ts` que firme
  con un `Origin` real y confirme 200 (hoy esa suite firma sin `Origin`, vía
  `auth.api.signInEmail` directo, que nunca pasa por `originCheckMiddleware`).
- CI real (pipeline) no existe en este repo — todo lo anterior se verificó
  en la máquina de desarrollo del usuario, la única que existe hoy.
