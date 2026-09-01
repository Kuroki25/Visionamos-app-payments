# ADR 013: Migración de autenticación a Better Auth

**Status:** Propuesto (Fase 3 del [[better-auth-migration-master-prompt]] — no implementado todavía)
**Fecha:** 2026-08-31

<!--
Ubicación: el prompt maestro que rige esta migración pide este documento en
`docs/architecture/ADR-auth-better-auth.md`. Se coloca aquí en su lugar,
numerado junto al resto de ADRs (`docs/adr/001-...` a `012-...`), porque es
la convención real y ya establecida del repo — `docs/architecture/` contiene
documentos de arquitectura de referencia (TARGET_ARCHITECTURE.md,
CURRENT_ARCHITECTURE.md, etc.), no ADRs numerados. Es una decisión de
convención de bajo riesgo, no una decisión de negocio — se documenta aquí en
vez de preguntarse, siguiendo el mismo principio que ya resolvió AUTH-06 en
`docs/auth-migration/01-auth-audit.md`.
-->

## Context

`docs/auth-migration/00-current-state.md` y `01-auth-audit.md` (Fases 0-1)
auditaron el sistema actual: Passport-less, JWT manual vía `@nestjs/jwt`
(access+refresh en cookies `httpOnly`, rotación de refresh token, Argon2id,
CSRF double-submit). `docs/auth-migration/02-business-access-model.md`
(Fase 2) confirmó que el modelo de **autorización** (role + scope,
`role_assignments`, `ScopeAuthorizationService`) ya implementa
`docs/business/ROLE_PERMISSION_MATRIX.md` casi exactamente, con un bug real
corregido en la misma sesión (GAP-01) y dos lagunas de negocio pendientes de
decisión (GAP-02, GAP-03) — ninguna es un problema del *mecanismo* de auth.

El [[better-auth-migration-master-prompt]] exige reemplazar exclusivamente el
mecanismo de autenticación/identidad/sesión por Better Auth, preservando
100% la capa de autorización ya construida (`role_assignments`,
`ScopeAuthorizationService`, `RolesGuard`, los cuatro roles fijos) sin
tocarla. Este ADR fija cómo.

**Fuente de verificación de Better Auth**: no está instalado en el repo
(confirmado en Fase 0). Todo lo que sigue sobre el comportamiento de Better
Auth fue verificado contra `https://better-auth.com/docs/*` y búsquedas web
el 2026-08-31 (no contra código propio, porque el paquete no existe todavía
en `node_modules`) — cada afirmación cita la página fuente. Donde la
documentación oficial no fue explícita, se marca **NO VERIFICADO** en vez de
asumir, y queda como pregunta abierta para Fase 4/5 cuando el paquete esté
realmente instalado y se pueda verificar contra su código/tipos reales.

## Decision

### Versión a fijar

`better-auth@1.7.2` — última versión estable en npm al 2026-08-31 según
`https://www.npmjs.com/package/better-auth` (publicada "hace 4 días" al
momento de esta auditoría). **Debe re-verificarse en Fase 5** (el momento
real de `pnpm add`), no asumirse como fija cuatro fases después — el
ecosistema se mueve rápido y esta ADR no es el lugar para congelar un
`package.json`.

### Frontera de responsabilidad (sin cambios respecto al prompt maestro, ahora concreta)

Better Auth resuelve exclusivamente: login (verificación de credenciales),
identidad (`user`), sesión (emisión/verificación/revocación). **Todo lo
demás sigue siendo NestJS, sin excepción**: `role_assignments`,
`ScopeAuthorizationService.assertScope`/`assertCanAssignRole`, `RolesGuard`,
`@Roles(...)`, la matriz completa de creación de usuarios (ADR 011 §4). Cero
líneas de `role`/`scopeType`/`scopePortalId`/`scopeCommerceId` viven dentro
de la configuración o los plugins de Better Auth.

### Propiedad del schema: Better Auth con tablas propias + tabla de perfil de negocio

**Decisión:** Better Auth gestiona sus propias tablas (`user`, `session`,
`account`, `verification`) vía su adapter oficial de Postgres (Kysely
integrado — `database: new Pool({...})`,
`https://better-auth.com/docs/concepts/database`), migradas por su propio
CLI (`@better-auth/cli generate`/`migrate`). La tabla `AppUser` actual
(`apps/api/src/modules/users/entities/user.entity.ts`) se conserva como
**tabla de perfil de negocio**, con su PK igual al `user.id` de Better Auth
(`FOREIGN KEY ... REFERENCES "user"(id)`) — contiene solo lo que Better Auth
no modela: nada de auth, todo lo administrativo que ya tenía
(`role_assignments` sigue apuntando a este `user.id` compartido, sin cambiar
ningún valor de UUID existente si la migración de datos preserva el `id`
original — ver Fase 4).

**Alternativa considerada y descartada — adapter custom sobre la tabla
`users` existente**: Better Auth expone `createAdapter` para mapear su
modelo `user` a una tabla propia
(`https://better-auth.com/docs/guides/create-a-db-adapter`), pero (a) el
campo `id` **no se puede remapear** — limitación documentada explícitamente
en la guía —, (b) sería reimplementar a mano un contrato interno no
estabilizado entre versiones de una librería de terceros, exactamente el
tipo de indirección que ADR 011 ya rechazó para el guard genérico de scope
("no elimina código real, solo lo desplaza detrás de una capa"), y (c) el
adapter oficial de Postgres es la ruta soportada, documentada y con
migraciones automáticas — la ruta custom no aporta nada que la tabla de
perfil 1:1 no resuelva ya de forma más simple y más barata de mantener.

### Formato de ID

`advanced.database.generateId: "uuid"` — **verificado en Fase 5** contra el
paquete real instalado (`better-auth@1.7.2`), no solo contra documentación
web: `node_modules/@better-auth/core/dist/types/init-options.d.mts:374`
(`generateId?: GenerateIdFn | false | "serial" | "uuid"`, anidado bajo
`database` dentro de `advanced`). El comentario del propio tipo confirma que
para Postgres usa `gen_random_uuid()` — coincide con el UUID nativo de
Postgres, no un UUID generado en JS. Necesario para que `user.id` sea
compatible con el resto del schema (`@PrimaryGeneratedColumn('uuid')` en
cada entidad TypeORM del repo, sin excepción). Configurado en
`apps/api/src/infra/better-auth/better-auth.factory.ts`.

### Contraseñas — se reutiliza Argon2id, sin forzar un reset masivo

Better Auth permite reemplazar su hash por defecto (scrypt) por funciones
`hash`/`verify` propias
(`emailAndPassword: { password: { hash, verify } }`,
`https://better-auth.com/docs/authentication/email-password`). **Decisión**:
envolver ahí las mismas llamadas `argon2.hash`/`argon2.verify` que ya usa
`AuthService`/`UsersService` (Fase 1: defaults del paquete, `memoryCost
65536, timeCost 3, parallelism 4`, ya por encima de los mínimos OWASP) — no
hay razón de negocio para forzar un reset de contraseña a usuarios
existentes solo por cambiar de mecanismo de transporte.

Better Auth almacena la contraseña en su tabla `account`, no en `user`
(fila con `providerId: 'credential'`, `accountId` = el `user.id`, campo
`password` = el hash), según su propia guía oficial de migración
(`https://better-auth.com/docs/guides/next-auth-migration-guide`,
confirmado independientemente por una segunda fuente). La migración de datos
de Fase 4 debe, por cada `AppUser` existente: (1) insertar una fila `user`
con el mismo `id`, (2) insertar una fila `account` con
`providerId:'credential'` y el `password_hash` argon2id ya existente sin
recalcularlo. **No implica ninguna vulneración de PII/secreto** — es mover
un hash ya irreversible de una tabla a otra, nunca la contraseña en claro.

### Alta de usuarios — sigue siendo admin-only, sin auto-registro

`emailAndPassword.disableSignUp: true`
(`https://better-auth.com/docs/authentication/email-password`,
confirmado por búsqueda adicional) — replica la ausencia actual de
`POST /auth/register` (ADR 006). La creación de usuarios sigue siendo
exclusivamente `POST /users`, gateado por `ScopeAuthorizationService
.assertCanAssignRole` (ADR 011 §4) sin cambios; internamente ese endpoint
pasa a invocar la API server-side de Better Auth para crear el usuario +
credencial, en vez de escribir directamente en `users`, pero la pregunta
"¿quién puede crear a quién con qué scope?" la sigue respondiendo el mismo
código de hoy, no Better Auth.

### Sesiones — sesión server-side por defecto, no el plugin JWT

**Decisión:** adoptar el modelo de sesión **server-side por defecto** de
Better Auth (tabla `session` + cookie, verificada contra la base de datos en
cada request —
`https://better-auth.com/docs/concepts/session-management`), no su plugin
JWT. Esto es un cambio de arquitectura deliberado, no solo un swap de
librería: **resuelve AUTH-01** (Fase 1) de raíz — hoy el logout no invalida
un access token JWT ya emitido porque `JwtAuthGuard` solo verifica firma sin
tocar la BD (ventana de exposición de hasta `JWT_ACCESS_TTL`, 15 min,
documentada como trade-off aceptado en ADR 011). Con sesión server-side,
revocar es borrar la fila de sesión — efectivo en la siguiente request, sin
ventana de staleness que documentar como aceptada.

El plugin JWT de Better Auth existe y queda **descartado para el flujo
navegador↔backend** (no hay hoy ningún consumidor que necesite un bearer
token stateless — ambos frontends son apps Next.js del mismo origen
administrativo, autenticadas por cookie). Se revisita solo si en el futuro
aparece un consumidor real (app móvil, servicio externo) que lo justifique
— no antes.

**Verificado en Fase 5** contra el código fuente real instalado
(`node_modules/better-auth/dist/cookies/index.mjs`,
`createCookieGetter`/`getCookies`) — no asumido: la cookie de sesión
(`session_token`) es `httpOnly: true`, `sameSite: "lax"`, `path: "/"`,
`secure` verdadero cuando `baseURL` es `https://` o `NODE_ENV=production`
(con prefijo `__Secure-` en el nombre de la cookie en ese caso), `maxAge`
igual a `session.expiresIn` (fijado a `JWT_REFRESH_TTL_DAYS` en
`better-auth.factory.ts`, hoy 7 días). Nombre real de la cookie:
`{prefix}.session_token` (prefijo por defecto `better-auth`). Coincide con
el comportamiento ya esperado del sistema actual (`httpOnly`, incluso más
amplio en `path` que el `refresh_token` de hoy —
`path: '/api/v1/auth'` — porque aquí la sesión completa viaja en una sola
cookie, no dos).

### CSRF — se conserva el mecanismo propio, no se adopta el de Better Auth

Better Auth trae su propia protección CSRF basada en validación de origen y
Fetch Metadata (`advanced.disableCSRFCheck`, `trustedOrigins`) — un
mecanismo distinto al double-submit cookie ya implementado
(`CsrfGuard`, header `X-CSRF-Token`, usado por toda la suite de tests e2e
actual vía `test/helpers/http.ts`). **Decisión: mantener `CsrfGuard` sin
cambios.** Es ortogonal a qué proveedor emite la sesión, ya está
implementado, probado, y quitarlo no reduce código real (lo reemplazaría por
otro mecanismo equivalente, no lo eliminaría) — no hay justificación para
tocarlo en esta migración. Si el usuario prefiere migrar también al
mecanismo de Better Auth más adelante, es una decisión separada y explícita,
no un efecto colateral de este ADR.

### Integración con NestJS — adapter propio, no un paquete de terceros

La página oficial de integración con NestJS
(`https://better-auth.com/docs/integrations/nestjs`) es, según ella misma,
**mantenida por la comunidad** (issues redirigidos a `nestjs-better-auth`,
un repo de terceros), exige desactivar el body parser global de Nest
(`bodyParser: false` en `NestFactory.create()`, afectando *todas* las rutas)
e instala su propio `AuthGuard` global — que colisionaría con la cadena
`APP_GUARD` ya existente (`ThrottlerGuard → JwtAuthGuard → RolesGuard →
CsrfGuard`, `app.module.ts:88-91`) y con `RolesGuard`/`CsrfGuard`, que deben
seguir intactos.

**Decisión: no se adopta ningún paquete `nestjs-better-auth`/
`@mguay/nestjs-better-auth`/`@thallesp/nestjs-better-auth` de terceros.**
Ninguno es oficial, y el prompt maestro prohíbe explícitamente "dependencias
beta sin ADR" para algo tan crítico como la verificación de sesión. En su
lugar: un adapter propio y mínimo — reemplaza únicamente `JwtAuthGuard` (el
paso "¿quién es, según el token/cookie?") por un guard que llama a la API
server-side de Better Auth (`auth.api.getSession({ headers })`, agnóstica de
framework) y traduce el resultado al mismo `AuthenticatedRequestUser` que ya
consume el resto de la aplicación. `RolesGuard`, `CsrfGuard`,
`ScopeAuthorizationService`, y los nueve módulos de negocio **no cambian una
sola línea** — esto es literalmente la abstracción `AuthenticationPort`/
`CurrentPrincipal` que exige el prompt maestro §4/§5, aplicada de forma
concreta.

**Consecuencia a decidir en Fase 4/8, no aquí**: Better Auth no conoce
`role`/`scopeType`/`scopePortalId`/`scopeCommerceId` — son conceptos 100% de
este negocio. El adapter propio, tras resolver la sesión a un `userId`,
necesita todavía una consulta a `role_assignments` para completar
`AuthenticatedRequestUser`. Hoy ese dato viaja embebido en el JWT (cero
consultas extra por request, a cambio de la staleness que causó AUTH-01).
El nuevo diseño paga una consulta extra por request autenticado a cambio de
frescura total — probablemente un buen trade-off dado que además cierra
AUTH-01, pero se mide, no se asume: Fase 8 (performance) debe tomar un
baseline antes/después real antes de darlo por bueno.

### Plugins de Better Auth explícitamente rechazados

- **`admin`**: añade sus propios primitivos de rol/ban/impersonate
  (`https://better-auth.com/docs/plugins/admin`, confirmado por búsqueda) —
  adoptarlo crearía una segunda fuente de verdad de "quién puede hacer qué",
  compitiendo con `role_assignments`/`ScopeAuthorizationService` ya
  construidos y ya verificados contra el negocio en Fase 2. Rechazado sin
  ambigüedad — coincide con la prohibición explícita del prompt maestro.
- **`organization`**: modelo de membresía plana multi-org (`organization`,
  `member`, `invitation`, roles por-miembro como `owner`/`admin`/`member`,
  `https://better-auth.com/docs/plugins/organization`, confirmado por
  búsqueda). **Sin jerarquía ni mecanismo de scope-enforcement** — un
  `ADMIN_PORTAL` limitado a un portal, o un `ADMIN_COMMERCE` limitado a un
  comercio *dentro* de un portal, no tiene representación nativa en este
  plugin; se necesitaría exactamente la misma lógica de
  `ScopeAuthorizationService` encima igualmente. Confirma con evidencia
  concreta la prohibición ya explícita del prompt maestro de no usar
  Organizations como representación automática de Portales/Comercios — no
  aporta nada que no esté ya construido, y añadiría un segundo modelo de
  membresía compitiendo con `role_assignments`.

### `refresh_tokens` — se retira, no se migra su forma

La tabla `refresh_tokens` (Fase 1: hash SHA-256, sin FK — AUTH-02) queda
reemplazada por la tabla `session` de Better Auth. **No se recrea su forma
en el nuevo modelo** — el problema que resolvía (revocación) lo resuelve
mejor la sesión server-side. Se retira en la Fase 10 (cutover), solo después
de que el nuevo mecanismo esté probado end-to-end (prompt maestro: "no
borrar legacy sin migración probada"). AUTH-02 queda sin objeto una vez
retirada — no se corrige por separado.

### Migraciones de base de datos — resuelto en Fase 4

**Decisión final** (`docs/auth-migration/03-database-migration-strategy.md`,
Fase 4): **dos historiales de migración**, no uno. El CLI de Better Auth
gestiona sus propias migraciones para `user`/`session`/`account`/
`verification`; TypeORM sigue gestionando todo lo demás
(`apps/api/src/migrations/`), incluida la única pieza de conexión entre
ambos mundos (la `FOREIGN KEY (id) REFERENCES "user"(id)` que se añade a
`users`). Se revierte la preferencia tentativa que este ADR expresaba
originalmente por un solo historial plegado a mano: Fase 4 encontró que
Better Auth y TypeORM nunca necesitan tocar la misma tabla en la misma
migración (son dueños de conjuntos de tablas disjuntos), así que plegar el
schema de Better Auth a mano solo significaría mantener a mano una copia de
algo que su propio CLI ya versiona y regenera mejor — sin ganar la
consistencia operativa que se buscaba, porque nunca hay una migración
verdaderamente compartida que un solo historial estuviera evitando duplicar.

## Alternatives considered

- **No migrar, mantener el sistema JWT actual**: descartado — es la premisa
  misma de esta migración, ya pedida explícitamente por el usuario.
- **Adoptar otro proveedor (Keycloak/Auth0/Entra ID) en vez de Better
  Auth**: fuera de alcance — el usuario pidió Better Auth específicamente;
  el prompt maestro ya diseña la capa de abstracción (`AuthenticationPort`)
  precisamente para que un cambio de proveedor futuro sea posible sin tocar
  el dominio, sin que eso signifique evaluarlos ahora.
- **Plugin JWT de Better Auth como mecanismo principal** (en vez de sesión
  server-side): descartado — renunciaría a la corrección de AUTH-01, que es
  la mejora de mecanismo más concreta que ofrece esta migración, sin ningún
  consumidor real hoy que necesite un token stateless.
- **Adapter custom de Better Auth sobre la tabla `users` existente** (en vez
  de tabla de perfil 1:1): descartado — ver sección "Propiedad del schema"
  arriba.
- **Paquete `nestjs-better-auth` de terceros** (en vez de un adapter
  propio): descartado — ver sección "Integración con NestJS" arriba.

## Consequences

- `role_assignments.user_id` y `audit_events.actor_user_id` deben repuntar
  su `FOREIGN KEY` de la tabla `users` actual a la nueva tabla `user` que
  gestiona Better Auth — un cambio de esquema real que Fase 4 debe
  planificar con un script de migración de datos concreto (no solo el DDL),
  preservando el `id` de cada usuario existente para no romper ninguna fila
  ya referenciada.
- El logout y la desactivación de un usuario pasan a ser efectivos de
  inmediato (corrige AUTH-01), a cambio de una consulta adicional a
  `role_assignments` por request autenticado — medir antes de dar por bueno
  el trade-off (Fase 8).
- `CsrfGuard`, `RolesGuard`, `ScopeAuthorizationService`, y los nueve
  módulos de negocio (`portals`, `categories`, `commerces`, `services`,
  `forms/*`, `users`, `role-assignments`, `audit`, `transactions`) no
  requieren ningún cambio de código más allá de lo que ya exige GAP-01/
  GAP-03 si el usuario decide corregirlos — la migración de auth es, por
  diseño, invisible para ellos.
- `refresh_tokens` y AUTH-02 quedan obsoletos, no arreglados.

## Trade-offs

Ver "Consecuencia a decidir en Fase 4/8" (sesión server-side = consulta
extra por request, sin medir todavía) y "Migraciones de base de datos"
(un historial de migraciones vs. dos, sin decidir todavía). Ninguno de los
dos se resuelve en este ADR — ambos quedan explícitamente abiertos para las
fases que el propio prompt maestro asigna para resolverlos con evidencia,
no por conveniencia de diseño.

---

## GATE 3

| Pregunta | Respuesta con evidencia |
|---|---|
| ¿Qué reemplaza Better Auth exactamente? | Login, identidad (`user`), sesión — nada de autorización |
| ¿Qué NO cambia? | `role_assignments`, `ScopeAuthorizationService`, `RolesGuard`, `CsrfGuard`, los cuatro roles fijos, la matriz de creación de usuarios (ADR 011 §4) |
| ¿Quién es dueño del schema de auth? | Better Auth, tablas propias (`user`/`session`/`account`/`verification`), migradas por su propio CLI; `AppUser` pasa a ser tabla de perfil de negocio 1:1 |
| ¿Se pierden las contraseñas existentes? | No — Argon2id se reutiliza vía `password.hash`/`password.verify` propios, sin reset forzado |
| ¿Se resuelve AUTH-01? | Sí, por diseño — sesión server-side revocable, ya no JWT stateless |
| ¿Qué plugins de Better Auth se rechazan y por qué? | `admin` (compite con autorización propia) y `organization` (sin jerarquía, no resuelve scope real) |
| ¿Se depende de algún paquete de terceros no oficial para NestJS? | No — adapter propio sobre la API server-side oficial de Better Auth |
| ¿Qué queda explícitamente sin decidir? | Solo la consulta extra por request (medir en Fase 8, ver "Consecuencia a decidir" arriba). El historial de migraciones se resolvió en Fase 4 (dos), y la cookie de sesión / `generateId` se verificaron en Fase 5 contra el paquete real instalado — ver ambas secciones arriba |

### GATE 3: **PASS (arquitectura propuesta, no implementada)**

El diseño está completo y justificado con evidencia externa citada
(`better-auth.com/docs/*`, npm) para cada decisión, y cada punto no
verificable sin el paquete instalado queda marcado explícitamente en vez de
asumido. No se instaló Better Auth, no se tocó ninguna tabla real, no se
escribió código de producción en esta fase — coincide con el alcance de
Fase 3 ("diseñar", no "implementar"). Antes de Fase 4 (estrategia de BD)
conviene que el usuario confirme que está de acuerdo con las decisiones
tomadas aquí, en particular: sesión server-side (no JWT plugin), tabla de
perfil 1:1 (no adapter custom), y adapter propio para NestJS (no paquete de
terceros) — son las tres decisiones con más superficie de cambio futuro.

## Actualización 2026-09-01: handler HTTP nativo + cutover real completado

Este ADR nunca definió cómo un cliente HTTP real inicia sesión —
`BetterAuthSessionGuard` (Fase 6/7) solo resuelve una sesión *ya existente*;
"Integración con NestJS" arriba cubre exclusivamente el lado de
verificación (guard), no el lado de emisión (login). El gap se hizo
evidente al preparar el cutover real: conectar el guard sin resolver esto
dejaba la API sin ninguna forma de autenticarse.

**Decisión:** se monta el **handler HTTP nativo** de Better Auth
(`toNodeHandler`, `better-auth/node`) en `/api/auth/*` — su `basePath` por
defecto, verificado en `node_modules/@better-auth/core/dist/types/init-options.d.mts:481`
(`@default "/api/auth"`) — en vez de escribir un controller propio de
NestJS que reimplemente `signInEmail`/`signOut`/etc. sobre HTTP.
`/api/auth/*` queda deliberadamente fuera del prefijo `api/v1` (Nest) —
dos namespaces HTTP distintos, cada uno dueño del suyo, tal como ya separa
este ADR "Better Auth autentica" de "NestJS autoriza".

Requiere `NestFactory.create(AppModule, { bodyParser: false })` — Better
Auth necesita leer el cuerpo crudo del request antes que cualquier parser;
`configureApp()` (compartida por `main.ts` y todos los `*.e2e-spec.ts`)
vuelve a registrar `json()`/`urlencoded()` inmediatamente después de montar
el handler, así que `/api/v1/*` no cambia de comportamiento —
implementado en `apps/api/src/infra/better-auth/mount-better-auth-handler.ts`.

**Se descarta** la alternativa considerada originalmente en este mismo ADR
("Integración con NestJS", más arriba) de escribir un `AuthController`
propio que envuelva `auth.api.signInEmail`: hubiera significado reimplementar
a mano el protocolo HTTP que Better Auth ya expone de forma oficial y
mantenida — exactamente el tipo de indirección que ADR 011 ya rechazó para
el guard genérico de scope ("no elimina código real, solo lo desplaza").

**Verificado real, no solo diseñado** — contra el servidor compilado
(`node dist/main.js`), reconstruido y confirmado como único proceso vivo
(`tasklist`/`taskkill //F //IM node.exe` — un servidor obsoleto de una
corrida anterior dio un primer falso positivo, ver punto 3 abajo), desde un
origen real de frontend:

```text
POST /api/auth/sign-in/email (Origin: http://localhost:3101, sin cookie previa) → 200
GET  /api/v1/auth/me (con cookie)                                              → 200, AppUser correcto (role/scope)
GET  /api/v1/auth/me (sin cookie)                                              → 401
POST /api/auth/sign-out (Origin: http://localhost:3101, CON cookie)            → 200
GET  /api/v1/auth/me (después)                                                 → 401
POST /api/v1/auth/login (ruta legacy — ya retirada)                            → 404
```

Tres bugs reales encontrados y corregidos durante esta implementación,
ninguno anticipado por el diseño original de este ADR:

1. **Creación de usuarios nunca llegaba a Better Auth** —
   `UsersService.createWithRoleAssignment` (`POST /users`) escribía
   `AppUser`/`role_assignments` pero nunca la contraparte `user`/`account`
   de Better Auth — todo usuario creado por la API real quedaba con una
   sesión de autorización perfecta pero sin ninguna forma de loguearse.
   Corregido con un helper compartido, `create-better-auth-identity.ts`,
   ahora usado en los cinco puntos donde se crea un `AppUser` (el servicio
   real + cuatro scripts/fixtures de seed).
2. **Fuga de conexiones Postgres** — `better-auth.factory.ts` construía su
   propio `pg.Pool` sin que nada lo cerrara; cada instancia de test dejaba
   uno abierto indefinidamente. Síntoma real: `GET /api/v1/health` 503
   intermitente. Corregido: `BetterAuthModule` es dueño explícito del
   `Pool` y lo cierra en `onModuleDestroy`.
3. **Better Auth no confiaba en los orígenes reales del frontend** — tiene
   su propio allowlist de orígenes para `/api/auth/*`, separado por completo
   de `CORS_ALLOWED_ORIGINS`/`enableCors` de Nest; sin `trustedOrigins`
   configurado, solo `baseURL` (`http://localhost:4100`) era confiable —
   cualquier llamada real desde `http://localhost:3100`/`3101` que llevara
   la cookie de sesión habría fallado con `INVALID_ORIGIN`. Corregido:
   `trustedOrigins` reutiliza `CORS_ALLOWED_ORIGINS` (mismo parseo que ya
   usa `configure-app.ts`, una sola fuente de verdad).

Detalle completo, matriz de piezas, y estado de gates:
`docs/backend/authentication/BETTER_AUTH_CUTOVER_SOURCE_OF_TRUTH.md`.

**El cutover real está completado, incluido el retiro de JWT legacy**:
`app.module.ts` usa `BetterAuthSessionGuard` en producción, no
`RehearsalAppModule` (Fase 7, sigue existiendo como suite de tests, ya no
como preview). `AuthController`/`AuthService`/`JwtAuthGuard`/
`RefreshTokenEntity`/`@nestjs/jwt` fueron eliminados; `users.password_hash`
y `refresh_tokens` fueron retirados de la base de datos real vía la
migración `AlterUsersForBetterAuthCutover1788285369312` (aplicada contra
`visionamos` real y `visionamos_test`, con backup tomado antes de tocar la
real) — solo después de que el vertical slice y la suite completa quedaron
probados, tal como exigía el propio prompt maestro de esta migración.
