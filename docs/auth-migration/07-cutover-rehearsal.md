<!--
Fase 7 — Tests funcionales/seguridad (PROMPT MAESTRO §27, BOLA/BFLA
sistemático + "revisión final adversarial" §33: cross-portal/cross-commerce,
escalación de rol, sesiones revocadas, manipulación de portalId/commerceId).
Ejecutado 2026-09-01 contra el Postgres real de desarrollo del usuario,
después de que las Fases 4-6 quedaran cerradas con evidencia real
(docs/auth-migration/06-real-migration-run.md).
-->

# Fase 7 — Ensayo de cutover (rehearsal) contra la app real

## Qué se construyó

`apps/api/test/better-auth/` — una suite nueva, separada de
`test:integration` (que sigue usando SQLite en memoria y no se tocó):

- `cutover-rehearsal.pg-e2e.ts` — 12 tests, todos contra los **controladores
  y servicios reales de negocio** (`PortalsController`, `CommercesController`,
  `AuditController`, `AuthController`), sin ningún doble ni mock de la capa
  de negocio — solo cambia qué guard resuelve la identidad.
- `rehearsal-app.module.ts` — copia deliberada de `app.module.ts` con
  **una sola línea distinta**: `JwtAuthGuard` → `BetterAuthSessionGuard` en
  la cadena `APP_GUARD`. Ver "Por qué un módulo aparte" abajo.
- `session-helper.ts` — firma/cierra sesión real vía `auth.api.signInEmail`/
  `signOut`, usando `Headers.getSetCookie()` (no split ingenuo por comas).
- `setup-env.ts` + `jest-better-auth.json` — config de Jest dedicada,
  `NODE_ENV=development` (Postgres real, no SQLite), corrida con
  `pnpm test:auth-cutover-rehearsal` (necesita `node --env-file=.env` porque
  `setupFiles` de Jest no carga `.env` solo; ver el script en `package.json`).

## Por qué un módulo aparte, no `overrideProvider`

Primer intento: `Test.createTestingModule({imports:[AppModule, BetterAuthModule]})
.overrideProvider(JwtAuthGuard).useFactory(...)`. **No funcionó** — los 12
tests fallaron con 401 incluso con sesiones válidas. Causa real: `app.module.ts`
registra el guard como `{ provide: APP_GUARD, useClass: JwtAuthGuard }`, no
como un provider bajo el token `JwtAuthGuard` — `overrideProvider(JwtAuthGuard)`
no tenía nada real que reemplazar, así que el `JwtAuthGuard` original seguía
activo sin que nada lo tocara. `APP_GUARD` es un token multi-provider (cuatro
registros distintos comparten el mismo token) y `@nestjs/testing@11.2.3` no
expone un `overrideGuard()` capaz de apuntar a uno solo de ellos.

Solución real: `RehearsalAppModule`, una copia exacta de
`app.module.ts` con esa única línea cambiada. Mantenerlo sincronizado a mano
es el costo — documentado explícitamente en el docblock del archivo. Cuando
Fase 10 haga el cutover real, este archivo se vuelve innecesario (se borra).

Un segundo problema real, también resuelto: `BetterAuthSessionGuard`
registrado como `APP_GUARD` en `RehearsalAppModule` no podía resolver
`UserEntityRepository`/`RoleAssignmentEntityRepository` — `BetterAuthModule`
las mantiene privadas (no las exporta, solo exporta `BETTER_AUTH_INSTANCE` y
la clase del guard). Nest resuelve las dependencias de un provider contra el
módulo que lo *declara*, no contra el módulo "dueño" de la clase — hubo que
añadir `TypeOrmModule.forFeature([UserEntity, RoleAssignmentEntity])`
también en `RehearsalAppModule` directamente.

Un tercer problema, ya conocido de Fase 6 pero ahora con una superficie más
grande: Jest no transforma `node_modules` por defecto y esta suite sí
necesita el `better-auth/node` **real** (no un mock — se está probando el
camino real). Se resolvió en la config dedicada de esta suite
(`transformIgnorePatterns: []`, transformar todo) — aceptable aquí porque es
una suite manual y separada, no la que corre `pnpm test`.

## Los 12 tests — contra `seed-demo.ts`, datos reales

Portales/comercios reales usados (consultados en `beforeAll`, no hardcodeados
por nombre en el archivo salvo el lookup mismo — resiliente a un re-seed):
Avanza / Otrahuilca (portales, distinto `ADMIN_PORTAL` cada uno) y
Universidad Avanza / Hotel Avanza Plaza (dos comercios del **mismo** portal
Avanza, para probar BOLA cross-commerce dentro del mismo portal, no solo
cross-portal).

| # | Caso | Resultado |
|---|---|---|
| 1 | Sin cookie de sesión → | 401 |
| 2 | Cookie de sesión basura/inventada → | 401 |
| 3 | Sesión real → `GET /auth/me` resuelve la identidad correcta | 200, email correcto |
| 4 | `ADMIN_PORTAL(Avanza)` lee su propio portal | 200 |
| 5 | `ADMIN_PORTAL(Avanza)` bloqueado en Otrahuilca (BOLA cross-portal) | 403 |
| 6 | `ADMIN_PORTAL(Otrahuilca)` lee el suyo, bloqueado en Avanza | 200 / 403 |
| 7 | `ADMIN_COMMERCE` lee su propio comercio | 200 |
| 8 | `ADMIN_COMMERCE` bloqueado en otro comercio del **mismo** portal (BOLA cross-commerce) | 403 |
| 9 | `VIEWER` con header `X-Role: SUPERADMIN`/`X-User-Role: SUPERADMIN` falsificado, contra una ruta SUPERADMIN-only (`/audit-events`) | 403 (el header no tiene ningún efecto) |
| 10 | Caso de control: `SUPERADMIN` real sí entra a esa misma ruta | 200 |
| 11 | **AUTH-01, la prueba central**: sesión válida funciona, se cierra sesión (`signOut`), la MISMA cookie se reintenta en la siguiente request | 200 → 401 inmediato |
| 12 | Cuenta desactivada a mitad de sesión (`UPDATE users SET status='INACTIVE'`, sin revocar la sesión de Better Auth) — la sesión sigue siendo válida para Better Auth, pero el guard la rechaza igual | 200 antes de desactivar → 401 después |

El test #12 restaura `status='ACTIVE'` en un `afterEach` — verificado tras la
corrida (`SELECT email, status FROM users`) que los 5 usuarios reales
quedaron exactamente como estaban antes de correr la suite.

Ningún test de esta lista es sintético o mockeado en la capa que importa:
las 403/401 las produce `ScopeAuthorizationService`/`RolesGuard`/
`BetterAuthSessionGuard` reales, contra datos reales, con las mismas rutas
que usa hoy el frontend cuando exista.

## Verificación completa de la sesión (todo en verde)

| Verificación | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | Limpio |
| `pnpm exec eslint "{src,test}/**/*.ts"` | Limpio |
| `pnpm test` (unit) | 40/40 |
| `pnpm test:integration` (e2e, SQLite, sin tocar) | 70/70 |
| `pnpm test:auth-cutover-rehearsal` (Postgres real) | **12/12** |
| `pnpm build` | Limpio |
| Datos reales de `seed-demo.ts` tras la corrida | Sin cambios (verificado) |

## Lo que Fase 7 NO cubrió (alcance restante, no bloqueante)

- **Property-based testing** (fuzzing sistemático de `portalId`/`commerceId`
  con IDs aleatorios/ajenos) — se cubrió con casos puntuales representativos
  (BOLA cross-portal, cross-commerce), no con un generador exhaustivo. La
  cobertura BOLA/BFLA *de negocio* ya la tenía este repo desde antes
  (`users-and-roles.e2e-spec.ts`, Fase 1) — Fase 7 aquí probó específicamente
  que **swap del mecanismo de auth no la rompe**, no la reconstruyó desde
  cero.
- **CSRF** con el nuevo guard — `CsrfGuard` sigue activo sin cambios en
  `RehearsalAppModule`, pero los 12 tests son todos `GET` (no mutan estado),
  así que no ejercitaron el header `X-CSRF-Token` contra una sesión de
  Better Auth. Pendiente si se quiere cerrar del todo antes de Fase 10.
- **Fase 8 (performance)** — la consulta extra por request que introduce
  `BetterAuthSessionGuard` (Fase 5/6, "Consecuencia a decidir") sigue sin
  medirse con un baseline real.

---

## GATE 7

| Pregunta | Respuesta con evidencia |
|---|---|
| ¿Se probó BOLA cross-portal y cross-commerce contra la app real? | Sí — casos 4-8, con datos reales, ambos con éxito y con bloqueo correcto |
| ¿Se probó BFLA (escalación de rol vía payload)? | Sí — caso 9, header falsificado sin efecto |
| ¿Se probó revocación de sesión? | Sí — caso 11, la prueba central del valor de esta migración (AUTH-01) |
| ¿Se probó desactivación de cuenta a mitad de sesión? | Sí — caso 12 |
| ¿Se dejaron datos reales del usuario modificados? | No — verificado después de la corrida |
| ¿Se tocó `app.module.ts` real? | No — `RehearsalAppModule` es un archivo de test aparte, se borra en Fase 10 |

### GATE 7: **PASS**

Los 12 casos cubren exactamente la lista de "revisión final adversarial"
que el prompt maestro exige en su fase de validación (§33) para el mecanismo
de autenticación específicamente — cross-portal, cross-commerce, escalación
de rol, sesión revocada — todos contra Postgres real, todos con el resultado
esperado. Queda pendiente, no bloqueante: fuzzing sistemático, CSRF contra
Better Auth, y el baseline de performance de Fase 8.
