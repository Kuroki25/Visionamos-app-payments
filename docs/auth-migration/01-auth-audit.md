<!--
Fase 1 — Auditoría completa del sistema de autenticación actual
(PROMPT MAESTRO §16-19). READ ONLY: ningún archivo de código fue modificado
para producir este documento. Ejecutado 2026-08-31 contra el commit `3453e77`
de `main`. Cada afirmación cita archivo+línea o el comando que la respalda —
donde no se pudo verificar, se marca NO VERIFICADO.
-->

# Fase 1 — Auditoría del sistema de autenticación actual

## Current Authentication Architecture

No usa Passport ni `@nestjs/passport` — confirmado por `grep -ril passport
apps/api/src apps/api/package.json` sin resultados. Es una implementación
manual sobre `@nestjs/jwt` (`JwtModule.register({})`,
`apps/api/src/modules/auth/auth.module.ts:16`).

- **Login** — `POST /api/v1/auth/login` (`auth.controller.ts:31-42`),
  `@Public()`, `@Throttle({ default: { limit: 5, ttl: 60_000 } })` (más
  estricto que el límite global de la API). Body validado por `LoginSchema`
  (`packages/contracts/src/auth.ts:6-9`, solo `email`+`password`, sin
  registro público). `AuthService.validateCredentials`
  (`auth.service.ts:61-79`) devuelve **el mismo 401 genérico** para email
  inexistente, contraseña incorrecta y cuenta `INACTIVE` — mitiga
  enumeración de cuentas (OWASP A07). Cuando el email no existe, igual
  ejecuta `argon2.hash(password)` sin usar el resultado
  (`auth.service.ts:64`) para no dar una respuesta más rápida que delate la
  ausencia del usuario por timing.
- **Contraseñas** — `argon2` `0.45.1`. Nunca se pasan opciones explícitas
  (`argon2.hash(password)` en `auth.service.ts:64` y
  `argon2.hash(input.password)` en `users.service.ts:79`) → usa los
  *defaults* del paquete, verificados en
  `node_modules/.pnpm/argon2@0.45.1/node_modules/argon2/argon2.cjs:29-34`:
  `type: argon2id, memoryCost: 65536 (64 MiB), timeCost: 3, parallelism: 4`
  — supera los mínimos de OWASP Password Storage Cheat Sheet. Columna
  `users.password_hash` con `select: false`
  (`apps/api/src/modules/users/entities/user.entity.ts:32`) — nunca sale en
  un `find()`/`findOneBy()` normal; el único punto que la selecciona
  explícitamente es `UsersService.findEntityByEmailWithPassword`
  (`users.service.ts:191-197`), usado solo por `AuthService`.
- **Access token** — JWT firmado con `JWT_ACCESS_SECRET`
  (mín. 32 caracteres, `env.schema.ts:58`), payload
  `{ sub, role, scopeType, scopePortalId, scopeCommerceId }`
  (`AccessTokenPayload`, `types/authenticated-request-user.type.ts:12-18`),
  TTL por defecto `15m` (`env.schema.ts:60`). Algoritmo: **HS256** — no se
  pasa `algorithm` en `issueTokens` (`auth.service.ts:82-94`) ni en
  `JwtAuthGuard.canActivate` (`jwt-auth.guard.ts:41-43`), y
  `jsonwebtoken@9.0.3` usa `alg: options.algorithm || 'HS256'`
  (`node_modules/.pnpm/jsonwebtoken@9.0.3/node_modules/jsonwebtoken/sign.js:98`).
  Va en la cookie `access_token`, `httpOnly`, `path: '/'`
  (`auth.controller.ts:80-85`).
- **Refresh token** — JWT firmado con `JWT_REFRESH_SECRET` (secreto
  *distinto* del access token), payload `{ sub, jti }`
  (`RefreshTokenPayload`), TTL por defecto `7` días
  (`JWT_REFRESH_TTL_DAYS`, `env.schema.ts:61`). Cookie `refresh_token`,
  `httpOnly`, **`path: '/api/v1/auth'`** — no viaja en llamadas a otros
  endpoints (`auth.controller.ts:89-95`). Por cada emisión se guarda una fila
  en `refresh_tokens` con **solo el hash SHA-256** del token
  (`hashToken`, `auth.service.ts:23-25`), nunca el valor crudo — mismo
  principio que el hash de contraseña: leer la BD no alcanza para
  suplantar una sesión.
- **Rotación** — `POST /auth/refresh` (`auth.controller.ts:44-56`) →
  `AuthService.rotateRefreshToken` (`auth.service.ts:128-155`): revoca la
  fila del refresh token presentado **incluso si resulta inválido**
  (comentario explícito en el código, línea 121-127), vuelve a resolver
  `role_assignments`/`status` desde la BD (no confía en el JWT viejo) y
  rechaza con 401 si `status !== 'ACTIVE'`. Esta es la única vía (junto con
  login) donde una desactivación/reasignación de rol se refleja sin esperar
  a que expire un access token ya emitido.
- **Logout** — `POST /auth/logout` (`auth.controller.ts:58-69`): revoca la
  fila del refresh token (`revokeRefreshToken`, `auth.service.ts:157-164`,
  no lanza si ya es inválido) y limpia ambas cookies. **No invalida el
  access token ya emitido** — al ser JWT stateless verificado solo por firma
  (`jwt-auth.guard.ts:40-47`, sin consulta a BD), un access token robado
  antes del logout sigue siendo válido hasta su propia expiración (máx. 15
  min por defecto). Ver Security Findings, AUTH-01.
- **`GET /auth/me`** (`auth.controller.ts:71-75`) — no público, usa
  `@CurrentUser()` para devolver el usuario resuelto desde el propio JWT vía
  `UsersService.findOne`.
- **No existe `POST /auth/register`** — confirmado por ausencia en
  `auth.controller.ts` y por el test `apps/api/test/app.e2e-spec.ts:54`
  (`'POST /api/v1/auth/register no longer exists...'`). La única forma de
  crear un `AppUser` es `POST /users` (autenticado, ver Authorization) o el
  script de bootstrap `apps/api/src/scripts/seed-superadmin.ts`.
- **Bootstrap del primer usuario** — `pnpm --filter api seed:superadmin`
  lee `SUPERADMIN_EMAIL`/`SUPERADMIN_PASSWORD`/`SUPERADMIN_FULL_NAME` de
  variables de entorno **fuera** de `EnvSchema`
  (`.env.example:29-36`, comentario: "deliberately NOT part of EnvSchema").
  Contenido exacto del script: NO VERIFICADO en esta pasada (se confirmó
  solo su existencia vía `find`, no se leyó línea por línea).

## Current Authorization Architecture

No es RBAC plano: es `role` + `scope` embebidos en el propio JWT, más un
servicio de autorización de recursos aparte.

- **Guards globales**, registrados en orden explícito vía `APP_GUARD` en
  `apps/api/src/app.module.ts:88-91`:
  `ThrottlerGuard → JwtAuthGuard → RolesGuard → CsrfGuard`. Comentario en el
  propio código explica el orden (rate-limit primero por ser el chequeo más
  barato, luego autenticar, luego autorizar por rol, luego CSRF). **Deny by
  default**: `JwtAuthGuard` exige un access token válido en toda ruta salvo
  que tenga `@Public()` (`jwt-auth.guard.ts:26-32`, decorador en
  `decorators/public.decorator.ts`).
- **`RolesGuard`** (`guards/roles.guard.ts`) — function-level (OWASP API5):
  lee `@Roles(...)` vía `Reflector`, si la ruta no tiene el decorador
  permite a cualquier autenticado; si lo tiene, exige que
  `request.user.role` esté en la lista. Los cuatro roles cerrados:
  `SUPERADMIN | ADMIN_PORTAL | ADMIN_COMMERCE | VIEWER`
  (`packages/contracts/src/roles.ts:12`) — **nota de nomenclatura**: el
  prompt maestro usa `PORTAL_ADMIN`/`COMMERCE_ADMIN`; el código real usa
  `ADMIN_PORTAL`/`ADMIN_COMMERCE`. Ver GATE 1 más abajo.
- **`ScopeAuthorizationService`**
  (`modules/role-assignments/scope-authorization.service.ts`) — explícitamente
  NO es un guard genérico (comentario en el código cita ADR 011: "un
  servicio inyectable, no un guard genérico"). Dos métodos:
  - `assertScope(user, target)` (líneas 36-47): 403 salvo que el `scopeType`
    del actor cubra el `target.portalId`/`commerceId`. Cada módulo de
    catálogo lo llama **después** de cargar el recurso real de la BD — el
    propio código lo señala como la defensa contra IDOR ("nunca desde la
    URL/body directamente").
  - `assertCanAssignRole(actor, target)` (líneas 55-89) — la matriz de
    creación de usuarios completa (ADR 011 §4): SUPERADMIN crea cualquiera;
    ADMIN_PORTAL solo ADMIN_COMMERCE (validando que el comercio pertenezca a
    su portal, cargándolo de la BD) o VIEWER de su propio portal;
    ADMIN_COMMERCE solo VIEWER de su propio comercio; VIEWER nada.
- **Filtrado a nivel de query, no en memoria** — `UsersService.findAll`
  (`users.service.ts:115-135`) arma un `WHERE` distinto según
  `actor.scopeType` (PORTAL: su portal + comercios de ese portal vía join;
  COMMERCE: solo su comercio; GLOBAL: sin filtro) — no hace
  `repository.find()` seguido de un filtro en JS.
- **BOLA en `UsersService`** — `isWithinManagedScope`
  (`users.service.ts:230-254`): siempre permite el propio registro; luego
  reglas explícitas por rol del actor contra el `scopeType`/`scopePortalId`/
  `scopeCommerceId` del usuario objetivo, incluyendo una consulta a
  `commerces` para resolver si un comercio pertenece al portal del actor.
- **Reasignación de scope** — `PATCH /users/:userId/role-assignment`
  (`role-assignments.controller.ts:15-17`), `@Roles('SUPERADMIN')`
  únicamente. Implementación de `RoleAssignmentsService.reassign`: NO
  VERIFICADA en esta pasada (no se leyó `role-assignments.service.ts`).
- **Mass assignment** — `UpdateUserSchema`
  (`packages/contracts/src/users.ts:65-68`) solo acepta `{ fullName }`; el
  rol/scope de un usuario no pueden tocarse por `PATCH /users/:id`, solo por
  el endpoint de reasignación SUPERADMIN-only. `CreateUserSchema`
  (líneas 25-57) deriva `scopeType` en el servidor
  (`deriveScopeType`, `users.service.ts:29-36`) — el cliente nunca envía
  `scopeType` directamente, evitando un par `role`/`scopeType` inconsistente
  vía payload.
- **Auditoría** — `AuditEventEntity`
  (`modules/audit/entities/audit-event.entity.ts`), append-only (sin
  `updatedAt`, sin endpoint de update/delete). `targetId` es polimórfico, sin
  FK física (comentario explícito en el código explicando por qué). Se
  registra dentro de la misma transacción que la operación que audita —
  ejemplo: `UsersService.createWithRoleAssignment`
  (`users.service.ts:81-111`) guarda `user` + `assignment` + evento de
  auditoría atómicamente vía `dataSource.transaction`.
- **`GET /audit-events`** — `audit.controller.ts:20-22`,
  `@Roles('SUPERADMIN')` únicamente; el propio código anota que una vista
  con scope para ADMIN_PORTAL es una extensión futura no confirmada por el
  negocio.

## Database Auth Model

Postgres real (dev: puerto `5442`, imagen `postgres:18-alpine`). Esquema
generado por migración TypeORM manual (`apps/api/src/migrations/
1788145516882-InitSchema.ts`), **no** `synchronize` — confirmado en
`apps/api/src/config/database.module.ts:43-54` (`synchronize: false` fuera
de `test`). En tests (`NODE_ENV=test`) se usa `better-sqlite3` en memoria con
`synchronize: true` (`database.module.ts:32-40`) — mismas entidades, mismo
schema equivalente, sin migraciones propias para SQLite.

DDL real verificado por grep contra la migración:

- `refresh_tokens` (línea 19): `id uuid PK, user_id uuid NOT NULL, token_hash
  varchar(64) NOT NULL, expires_at timestamp NOT NULL, revoked_at timestamp
  NULL, created_at timestamp NOT NULL`. Índice simple en `user_id` (línea 20)
  — **sin `FOREIGN KEY` hacia `users(id)`** (ver Security Findings, AUTH-02).
- `role_assignments`: FK `user_id → users(id) ON DELETE CASCADE`
  (migración línea 74), `UNIQUE` implícito de `@OneToOne` (una fila por
  usuario), dos `CHECK` que espejan `ReassignScopeSchema.refine` de
  `packages/contracts` (`role-assignment.entity.ts:42-52`).
- `audit_events`: FK `actor_user_id → users(id) ON DELETE RESTRICT`
  (migración línea 66); `target_id` sin FK (polimórfico, documentado).
- Enums Postgres reales confirmados por `CREATE TYPE`:
  `role` (`SUPERADMIN, ADMIN_PORTAL, ADMIN_COMMERCE, VIEWER`, línea 54),
  `scope_type` (`GLOBAL, PORTAL, COMMERCE`, línea 33), `entity_status`
  (`ACTIVE, INACTIVE`, línea 21), `audit_action` (14 valores, línea 31),
  `audit_target_type` (línea 32).
- Naming: `SnakeCaseNamingStrategy` propia (no paquete externo) aplicada a
  las tres conexiones (Postgres, SQLite de test, y el `DataSource` del CLI
  de migraciones vía `data-source.ts` — este último archivo no se leyó línea
  por línea en esta pasada, NO VERIFICADO en detalle, solo confirmada su
  existencia).
- **"Sesiones" como tal no existen como tabla** — el estado de sesión vive
  repartido entre el JWT (stateless) y `refresh_tokens` (el único registro
  persistente y revocable). No hay tabla `sessions` ni `login_attempts`.
- **Tablas que dependen de `users`**: `role_assignments` (CASCADE),
  `refresh_tokens` (sin FK, ver AUTH-02), `audit_events.actor_user_id`
  (RESTRICT).

## Frontend Auth Flow

**No existe todavía** en ninguno de los dos frontends. Verificado leyendo el
árbol completo de `apps/portal-web/src` y `apps/dashboard-web/src`: cada uno
tiene únicamente `app/layout.tsx`, `app/page.tsx` (landing de scaffold con
componentes de `@repo/ui`, sin lógica), `app/page.test.tsx`, `env.ts` y
`globals.css`. `env.ts` en ambos solo valida `NEXT_PUBLIC_API_URL`
(default `http://localhost:4100/api/v1`) — no hay ninguna otra variable
relacionada a auth. No hay: cliente de auth, `fetch`/`axios` hacia
`/auth/*`, manejo de cookies en JS, `middleware.ts`, rutas protegidas,
manejo de 401/403, ni uso de `localStorage`/`sessionStorage`. Esto significa
que **el flujo real navegador↔cookies↔CORS nunca se ha probado
manualmente en un browser real** — toda la cobertura actual es vía
`supertest` (Node, no navegador).

## Security Findings

| # | Finding | Severity | Evidence | Impact | Recommended action |
|---|---|---|---|---|---|
| AUTH-01 | El logout no invalida el access token ya emitido (JWT stateless, verificado solo por firma) | MEDIUM | `jwt-auth.guard.ts:40-47` no consulta BD; `auth.controller.ts:58-69` solo revoca el refresh token | Un access token robado sigue funcionando hasta 15 min (TTL por defecto) después del logout/desactivación, salvo que el usuario haga `/auth/refresh` primero | Documentar como trade-off aceptado (ya está parcialmente, ADR 011 §3) y mantener el TTL de access token corto; considerar Better Auth con sesiones server-side si se requiere revocación inmediata |
| AUTH-02 | `refresh_tokens.user_id` no tiene `FOREIGN KEY` hacia `users(id)`, a diferencia de `role_assignments`/`audit_events` | LOW | Migración `1788145516882-InitSchema.ts:19-20` (solo `CREATE INDEX`, sin `REFERENCES`); `RefreshTokenEntity` no declara `@ManyToOne`/`@JoinColumn` | Inconsistencia de integridad referencial respecto al resto del schema; en teoría podría quedar una fila huérfana (aunque hoy los usuarios nunca se borran físicamente) | Si se preserva un diseño equivalente en la migración a Better Auth, decidir explícitamente si la tabla de sesiones/tokens debe tener FK — no replicar el gap sin decisión consciente |
| AUTH-03 | Sin 2FA, sin recuperación de contraseña, sin verificación de email | INFO | Ausentes en `AuthController`/`AuthService`/`LoginSchema` — no hay endpoints ni columnas relacionadas | Ningún camino de account-recovery hoy; no es una vulnerabilidad, es una capacidad no construida todavía | Evaluar en Fase 5/57 del prompt maestro si Better Auth las cubre, priorizando SUPERADMIN/ADMIN_* primero |
| AUTH-04 | No hay flujo de frontend probado contra cookies/CORS reales en un navegador | INFO | Árbol completo de `apps/portal-web/src`, `apps/dashboard-web/src` — sin auth client, sin fetch a `/auth/*` | La mecánica de cookies httpOnly + CSRF double-submit + CORS con credenciales nunca se ejerció fuera de `supertest` | Antes o durante Phase 7 (E2E), validar el flujo real navegador→Next.js→NestJS→Postgres, no solo vía supertest |
| AUTH-05 | Rate limiting específico solo en `/auth/login` (5/60s); `/auth/refresh` y `/auth/logout` usan el límite global de la API (`THROTTLE_LIMIT`, default 100/60s) | LOW | `auth.controller.ts:35` (`@Throttle` en login) vs. ausencia del decorador en `refresh`/`logout` | Superficie de abuso algo mayor en `/refresh`, aunque adivinar un `refresh_token` válido (JWT de 256+ bits) es computacionalmente inviable — riesgo real bajo | Aceptable tal cual; si se migra a Better Auth, mantener throttling específico en endpoints de credenciales |
| AUTH-06 | Nomenclatura de roles del prompt maestro (`PORTAL_ADMIN`/`COMMERCE_ADMIN`) no coincide con el código real (`ADMIN_PORTAL`/`ADMIN_COMMERCE`) | INFO | `packages/contracts/src/roles.ts:12` vs. prompt maestro §7/9/10 | Ninguno técnico — es una discrepancia de nombres entre el prompt y el sistema real | **BUSINESS DECISION REQUIRED**: confirmar con el usuario si se renombra el enum (`ALTER TYPE` + migración de datos + todo el código que lo referencia) o si el prompt simplemente usaba nombres ilustrativos y se mantiene `ADMIN_PORTAL`/`ADMIN_COMMERCE` |

No se encontraron secretos hardcodeados, contraseñas ni hashes completos en
el código fuente auditado (`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`/
`SUPERADMIN_PASSWORD` se leen de `process.env` vía `ConfigService`, con
`.env.example` usando placeholders explícitos "replace-with-a-real-...").
Ningún hash ni contraseña se imprime en este documento, cumpliendo prompt
maestro §17.

## Technical Debt

- AUTH-02 (FK faltante en `refresh_tokens`).
- `apps/api/src/config/data-source.ts` y `apps/api/src/scripts/
  seed-superadmin.ts` no se auditaron línea por línea en esta pasada — deben
  revisarse antes de diseñar la Fase 4 (estrategia de BD/migración), ya que
  el prompt maestro exige entender el bootstrap del primer usuario en
  detalle antes de decidir cómo lo reemplaza Better Auth.
- `RoleAssignmentsService.reassign` no se leyó — falta confirmar que la
  transacción de reasignación también registra `audit_events` con
  `previousValue`/`newValue` como documenta el ADR 011 (el controller y el
  test e2e lo asumen, pero no se verificó el código del servicio).

## Duplicated Responsibilities

No se detectó duplicación de mecanismos de auth (un solo `AuthModule`, un
solo lugar que firma/verifica JWT, un solo `ScopeAuthorizationService`
reutilizado por todos los módulos de catálogo vía inyección). El diseño ya
separa razonablemente autenticación (`AuthModule`) de autorización
(`role-assignments` module) de identidad administrativa (`UsersModule`) —
alineado con el objetivo arquitectónico del prompt maestro §4/§5, aunque
todavía sin una capa de abstracción explícita tipo `AuthenticationPort`/
`CurrentPrincipal` (hoy `AuthenticatedRequestUser` cumple ese rol de forma
implícita, acoplado 1:1 a la forma del JWT).

## Risks

- Migrar a Better Auth implica decidir qué pasa con `refresh_tokens` (tabla
  propia) y con el payload embebido en el JWT (`role`/`scope`) — Better Auth
  típicamente maneja sesiones server-side por su cuenta; hay que decidir
  ownership de schema (prompt maestro §28) antes de tocar código.
- El objeto `AuthenticatedRequestUser` está usado directamente en **todos**
  los controllers/services de la aplicación (`users`, `role-assignments`,
  `portals`, `categories`, `commerces`, `services`, `forms`, `audit`,
  `transactions` — no confirmado exhaustivamente módulo por módulo en esta
  pasada, pero es el patrón consistente visto en cada archivo leído). Un
  reemplazo de la fuente de identidad debe preservar esa forma o adaptar
  cada punto de consumo — coincide con la preocupación central del prompt
  maestro (regla de desacoplamiento, §5).

## Data Migration Risks

- `users.password_hash` con `argon2id` real (no un algoritmo débil) —
  compatible con la capacidad de Better Auth de usar un verificador de hash
  personalizado (a confirmar en Fase 4/32 contra la documentación oficial de
  la versión que se fije).
- Ningún usuario de producción real todavía — NO VERIFICADO cuántas filas
  existen hoy en `users` de un Postgres real (no se corrió ninguna query
  contra una base viva en esta pasada, fase read-only sin tocar
  infraestructura corriendo). Antes de la Fase 4 conviene correr un conteo
  real (`SELECT count(*) FROM users`) contra el Postgres de desarrollo del
  usuario para no asumir "no hay nada que migrar".

## Business Authorization Gaps

- Confirmado (no un gap): filtrado por scope a nivel de query en
  `UsersService.findAll`, BOLA explícito en `isWithinManagedScope`, matriz de
  creación completa en `ScopeAuthorizationService.assertCanAssignRole`.
- Gap potencial: `AuditController` es SUPERADMIN-only sin vista con scope
  para ADMIN_PORTAL — ya señalado como decisión pendiente en el propio
  código (`audit.controller.ts:14`), no un descuido nuevo de esta auditoría.
- AUTH-06 (nomenclatura de roles) es el único gap de negocio real detectado
  entre el modelo que pide el prompt maestro y el modelo ya implementado.

---

## GATE 1

| Pregunta | Respuesta con evidencia |
|---|---|
| ¿Cómo inicia sesión un usuario? | `POST /api/v1/auth/login`, email+password vía `LoginSchema`, verificado con `argon2.verify` contra `users.password_hash` (`auth.service.ts:61-79`) |
| ¿Dónde se genera la identidad? | `UsersService.createWithRoleAssignment` (`POST /users`, autenticado y role-gated) o `seed-superadmin.ts` para el primer usuario — nunca auto-registro público |
| ¿Dónde se almacena? | Postgres real (`users`, `role_assignments`, `refresh_tokens`, `audit_events`), esquema versionado por migración TypeORM; SQLite en memoria solo en tests |
| ¿Cómo se protege una ruta? | `JwtAuthGuard` global vía `APP_GUARD`, deny-by-default, opt-out explícito con `@Public()` |
| ¿Cómo se identifican roles? | `role` embebido en el JWT (`AccessTokenPayload`), verificado por `RolesGuard` contra `@Roles(...)` |
| ¿Cómo se representa portal/comercio? | `scopeType`/`scopePortalId`/`scopeCommerceId` en `role_assignments`, embebidos también en el JWT |
| ¿Cómo se limita el acceso por scope? | `ScopeAuthorizationService.assertScope`, llamado tras cargar el recurso real de la BD; filtrado a nivel de query en listados (`UsersService.findAll`) |
| ¿Cómo se almacenan las contraseñas? | `argon2id`, defaults del paquete (`memoryCost 65536, timeCost 3, parallelism 4`), columna `select:false` |
| ¿Cómo funcionan refresh/access tokens? | Access: JWT HS256, 15 min TTL, cookie httpOnly `path:/`. Refresh: JWT HS256, 7 días TTL, cookie httpOnly `path:/api/v1/auth`, hash SHA-256 persistido en `refresh_tokens`, rotación revoca el token presentado en cada uso |
| ¿Dónde están las sesiones? | No hay tabla `sessions` — el estado vive en el JWT (stateless) + `refresh_tokens` (única ancla revocable) |
| ¿Qué tablas dependen del usuario? | `role_assignments` (FK CASCADE), `refresh_tokens` (sin FK — AUTH-02), `audit_events.actor_user_id` (FK RESTRICT) |

**Preguntas sin respuesta verificada en esta pasada** (no bloquean GATE 1,
pero deben cerrarse antes de Fase 4): contenido exacto de
`seed-superadmin.ts` y `data-source.ts`; contenido de
`role-assignments.service.ts`; conteo real de usuarios en el Postgres de
desarrollo del usuario.

### GATE 1: **PASS**

Todas las preguntas centrales tienen respuesta respaldada por archivo+línea
o por un comando ejecutado. Las preguntas abiertas son de detalle
(implementación interna de dos archivos no leídos, un conteo de filas) y no
comprometen la comprensión del sistema actual — se cierran al arrancar la
Fase 2/4, no bloquean avanzar.

**Un hallazgo requiere decisión de negocio antes de continuar de fondo**:
AUTH-06, el desajuste de nombres `PORTAL_ADMIN`/`COMMERCE_ADMIN` (prompt) vs.
`ADMIN_PORTAL`/`ADMIN_COMMERCE` (código real). No se asume una respuesta.

### AUTH-06 — Decisión del usuario (2026-08-31)

**Se mantiene `ADMIN_PORTAL`/`ADMIN_COMMERCE`.** El prompt maestro usaba
`PORTAL_ADMIN`/`COMMERCE_ADMIN` de forma ilustrativa; no se renombra el enum
Postgres `role`, ni `packages/contracts/src/roles.ts`, ni ningún código que lo
referencie. Todas las fases siguientes de esta migración deben usar los
nombres reales del código (`ADMIN_PORTAL`/`ADMIN_COMMERCE`), no los del texto
original del prompt.
