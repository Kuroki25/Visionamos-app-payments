<!--
Fase 5 — Implementar Better Auth como infraestructura (PROMPT MAESTRO §25).
Ejecutado 2026-08-31. A diferencia de las Fases 0-4 (solo lectura/diseño),
esta fase SÍ toca el repo: instala un paquete real y añade código nuevo —
pero todo aislado (docs/adr/013-better-auth-migration.md), sin tocar ni una
línea de `apps/api/src/modules/auth/` ni de `app.module.ts`. Ningún guard
existente cambia de comportamiento en esta fase.
-->

# Fase 5 — Better Auth como infraestructura aislada

## Qué se hizo

1. **`better-auth@1.7.2` instalado** en `apps/api`
   (`pnpm add better-auth --filter api`, luego fijado a versión exacta
   `"better-auth": "1.7.2"` en `package.json` sin `^`, para coincidir con la
   convención de pineo exacto que ya usa el resto de dependencias del repo —
   confirmado por versión real de npm el 2026-08-31, `pnpm view better-auth
   version` → `1.7.2`, mismo dato que Fase 3 había encontrado por búsqueda
   web, ahora reconfirmado en el momento real de instalar).
2. **`EnvSchema` extendido** (`apps/api/src/config/env.schema.ts`):
   `BETTER_AUTH_SECRET` (obligatorio, ≥32 caracteres, mismo patrón que
   `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` — falla el arranque si falta, sin
   default) y `BETTER_AUTH_URL` (default `http://localhost:4100`).
   Documentado en `.env.example`. Añadido también a `test/setup-env.ts`
   (valor fijo de prueba) para que la suite e2e siga arrancando — `EnvSchema`
   es un único schema compartido por toda la app, así que un campo nuevo sin
   default afecta el arranque de test aunque el módulo nuevo no se use
   todavía.
3. **Código nuevo, aislado, no importado por `app.module.ts`**
   (`apps/api/src/infra/better-auth/`):
   - `argon2-password.ts` — envuelve los mismos `argon2.hash`/`argon2.verify`
     que ya usan `AuthService`/`UsersService` (duplicado a propósito, no
     importado desde el módulo legacy — esta infraestructura no debe
     depender de lo que va a reemplazar).
   - `better-auth.factory.ts` — `createBetterAuthInstance(env)` construye la
     instancia real de Better Auth: `database` = `pg.Pool` con las mismas
     variables `DB_*` que `database.module.ts`; `advanced.database.generateId:
     'uuid'`; `emailAndPassword.disableSignUp: true` +
     `password.hash`/`verify` propios; `session.expiresIn` = 7 días
     (`JWT_REFRESH_TTL_DAYS`).
   - `better-auth.module.ts` — módulo NestJS que expone la instancia bajo el
     token `BETTER_AUTH_INSTANCE`, siguiendo el mismo patrón `useFactory` +
     `ConfigService` que `DatabaseModule`. **No está importado en
     `app.module.ts`** — existe para que la Fase 6 lo conecte, no arranca
     nada por sí solo todavía.

## Verificación real (no afirmada sin evidencia)

| Verificación | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | Limpio |
| `pnpm exec eslint` sobre los archivos nuevos/modificados | Limpio |
| `pnpm test` (unit) | 35/35 |
| `pnpm test:integration` (e2e) | 70/70 (sin cambios respecto a Fase 2 — este módulo no se usa todavía en ninguna ruta) |
| `pnpm build` (`nest build`, `tsc` real, no solo `--noEmit`) | Compila sin error |
| Interop ESM↔CJS | `better-auth` es un paquete `"type": "module"` (solo `.mjs`/`.d.mts`); este repo compila a CommonJS (`module: nodenext` sin `"type":"module"` en `package.json`). Verificado en tres niveles: `node -e "require('better-auth')"` directo, `pnpm exec ts-node` sobre un archivo real, y el `.js` compilado por `nest build` (`dist/infra/better-auth/better-auth.factory.js`) — los tres usan `require("better-auth")` y funcionan, gracias al soporte de Node 24 para `require()` síncrono de paquetes ESM |
| Smoke test en runtime de `createBetterAuthInstance` con la forma real de config | `auth.api.getSession`/`auth.api.signInEmail` existen como funciones tras construir la instancia — probado con `ts-node`, archivo temporal borrado inmediatamente después, no forma parte del repo |

Ningún paso anterior requirió una conexión real a Postgres — construir un
`pg.Pool` no conecta hasta la primera query, así que todo lo anterior se
verificó **sin Docker corriendo** (seguía sin poder conectarse en esta
sesión, `docker ps` → mismo error que en Fase 4).

## Hechos de Better Auth verificados contra el paquete real instalado

(Actualiza directamente `docs/adr/013-better-auth-migration.md`, que ya
quedó editado con estos mismos hallazgos — no se repite aquí el detalle
completo.)

- `advanced.database.generateId: "uuid"` — confirmado en
  `node_modules/@better-auth/core/dist/types/init-options.d.mts:374`.
- `emailAndPassword.password.hash`/`.verify` — firma exacta confirmada:
  `hash?: (password: string) => Promise<string>`,
  `verify?: (data: { hash: string; password: string }) => Promise<boolean>`
  (mismo archivo, alrededor de la línea 728).
- `emailAndPassword.disableSignUp?: boolean` (default `false`) — confirmado,
  mismo archivo, línea 665.
- `database` de nivel superior acepta `PostgresPool | MysqlPool |
  SqliteDatabase | Dialect | DBAdapterInstance | ...` — confirmado, línea
  525 — un `pg.Pool` crudo es una entrada válida sin adapter intermedio.
- Cookie de sesión: `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`,
  `secure` condicional a `https`/producción, `maxAge` = `session.expiresIn`
  — confirmado leyendo `node_modules/better-auth/dist/cookies/index.mjs`
  (`createCookieGetter`/`getCookies`) directamente, no solo su tipo.
- Existe un paquete `@better-auth/cli` independiente (versión `1.4.21` al
  2026-08-31, versionado por separado del paquete principal) — **no
  instalado en esta fase**: generar/aplicar el schema real de `user`/
  `session`/`account`/`verification` contra Postgres necesita una conexión
  viva, que esta sesión no tuvo. Queda para cuando el usuario tenga Docker
  corriendo (ver "Pendiente" abajo) — no se fabricó ningún SQL de salida sin
  haberlo corrido de verdad.

## Explícitamente NO hecho en esta fase (a propósito)

- **No se generaron/aplicaron las migraciones reales** de `user`/`session`/
  `account`/`verification` contra Postgres — requiere Docker corriendo
  (`@better-auth/cli generate`/`migrate`), no disponible en esta sesión.
- **No se corrió el script de migración de datos** de la Fase 4 contra
  ningún `AppUser` real — mismo motivo.
- **No se tocó `app.module.ts`, `JwtAuthGuard`, `RolesGuard`, `CsrfGuard`,
  ni ningún controller/service existente** — la Fase 6 es la que construye
  el adapter/guard que traduce una sesión de Better Auth a
  `AuthenticatedRequestUser` y la conecta al `APP_GUARD` chain. Hoy la app
  sigue funcionando exactamente igual que antes de esta fase para cualquier
  usuario real.
- **No se creó la tabla de perfil ni su `FOREIGN KEY`** (Fase 4 §2) — eso
  requiere que las tablas de Better Auth existan primero (necesitan
  Postgres real).

## Pendiente antes de poder cerrar Fase 5 de verdad

**Todo lo de abajo se cerró en la misma sesión, después de que el usuario
levantó Docker — ver `docs/auth-migration/06-real-migration-run.md`.**

- ~~Levantar Docker y generar el DDL real~~ — hecho (nota: el paquete
  correcto resultó ser `auth`, no `@better-auth/cli` — ese está deprecado,
  ver 06 §0).
- ~~Correr el script de migración de datos contra Postgres real~~ — hecho,
  5 usuarios reales migrados sin huérfanos.
- ~~Fase 6 probando el adapter contra una sesión real~~ — hecho, ver 06 §4.

---

## GATE 5

| Pregunta | Respuesta con evidencia |
|---|---|
| ¿Better Auth está instalado y configurado? | Sí — `better-auth@1.7.2` real, `createBetterAuthInstance` construye una instancia funcional, verificado en runtime |
| ¿Se tocó algo de lo que ya funciona hoy? | No — cero cambios en `app.module.ts`, guards existentes, o cualquier controller/service. `pnpm test`/`test:integration` sin regresiones (35/35, 70/70) |
| ¿Se instaló/corrió algo contra una base de datos real? | No — Docker no disponible en esta sesión; todo lo verificado no requirió una conexión viva |
| ¿Se inventó algún resultado de un comando no ejecutado? | No — el schema de Postgres real y la migración de datos quedan explícitamente pendientes, no fabricados |

### GATE 5: **PASS parcial — infraestructura construida y verificada sin BD viva; migración de datos real, pendiente de Docker**

No bloquea seguir documentando/diseñando la Fase 6 (el adapter de
autorización no necesita una base de datos real para escribirse ni para
que su lógica se pruebe contra sesiones simuladas), pero si el usuario
quiere probar el flujo de login real de extremo a extremo contra Better
Auth, hace falta levantar Docker primero.
