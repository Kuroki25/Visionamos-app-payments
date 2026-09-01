<!--
Prerrequisito de Fase 10, decidido con el usuario en la sesión (no en el
prompt maestro original) al descubrir que BetterAuthSessionGuard rompía
test:integration si se conectaba en app.module.ts sin resolver esto primero.
Ejecutado 2026-09-01. Amplía docs/adr/010-persistence.md.
-->

# `test:integration` pasa a correr contra PostgreSQL real, no SQLite

## Por qué

Al preparar el cutover real (Fase 10 — conectar `BetterAuthSessionGuard` en
`app.module.ts` de verdad), apareció un problema de diseño: Better Auth
siempre se conecta a Postgres real (`pg.Pool`,
`apps/api/src/infra/better-auth/better-auth.factory.ts`); sus tablas
(`user`/`session`/`account`/`verification`) no son entidades TypeORM y por
lo tanto nunca existieron en el SQLite en memoria que usaba
`test:integration`. Conectar el guard nuevo en `app.module.ts` habría hecho
que esa suite de 70 tests necesitara Postgres real de todas formas, pero sin
haberlo decidido ni preparado explícitamente.

Se le presentó la disyuntiva al usuario (construir un camino SQLite
equivalente para Better Auth vs. eliminar SQLite de los tests y usar
Postgres real siempre) — eligió la segunda, más simple: un solo motor de
base de datos, en todo entorno, sin excepción.

## Qué cambió

- **`docs/adr/010-persistence.md`** — actualizada ("Actualización
  2026-09-01"): se retira el branch `better-sqlite3`/`NODE_ENV=test` de
  `database.module.ts`. Todo entorno usa PostgreSQL real.
- **`apps/api/src/config/database.module.ts`** — simplificado: una sola
  rama (antes había dos), sin condicional por `NODE_ENV`. `synchronize`
  queda en `false` siempre — test ya no tiene un "modo rápido" de
  autogenerar schema.
- **`apps/api/src/common/filters/all-exceptions.filter.ts`** — se quitan
  los códigos de error `SQLITE_CONSTRAINT_UNIQUE`/`SQLITE_CONSTRAINT_FOREIGNKEY`
  (inalcanzables ahora).
- **`better-sqlite3` desinstalado** (`pnpm remove better-sqlite3 --filter api`)
  y su entrada en `pnpm-workspace.yaml` `allowBuilds` actualizada a `false`
  (sigue apareciendo como dependencia transitiva opcional de `typeorm` y del
  adapter sqlite de `better-auth`, pero ninguno de los dos se usa realmente).
- **Base de datos de test dedicada, `visionamos_test`** — nueva, separada de
  `visionamos` (desarrollo real). Nunca se toca la base de datos real del
  usuario.
- **`apps/api/test/global-setup-postgres.ts`** (nuevo) — `globalSetup` de
  Jest para `jest-e2e.json`, corre una sola vez antes de toda la suite:
  1. Crea `visionamos_test` si no existe (conectándose a `visionamos` como
     ancla — Postgres exige una conexión a una base ya existente para poder
     ejecutar `CREATE DATABASE`).
  2. Aplica las migraciones TypeORM reales (`AppDataSource`-equivalente,
     mismas migraciones que development/production, no `synchronize`).
  3. Aplica el schema de Better Auth (`apps/api/test/better-auth-schema.sql`,
     nuevo — el DDL real capturado en Fase 5/6, con `IF NOT EXISTS`, para no
     depender de red/CLI en cada corrida de test).
  4. `TRUNCATE` todas las tablas **excepto** la tabla de tracking de
     migraciones de TypeORM (`migrations`) — un bug real apareció en la
     primera corrida repetida: truncar esa tabla hacía que TypeORM
     olvidara qué migraciones ya había aplicado e intentara re-crearlas
     ("relation already exists"). Corregido excluyéndola explícitamente.
- **`apps/api/test/jest-e2e.json`** — `globalSetup` apuntando al archivo de
  arriba, y `maxWorkers: 1` (los 5 archivos de test comparten esta única
  base de datos real de forma secuencial — antes cada archivo tenía su
  propio SQLite privado, ahora deben correr uno a la vez para no
  interferirse).
- **`apps/api/test/setup-env.ts`** — cada archivo de test (proceso de
  worker separado del de `globalSetup`) fuerza `DB_NAME=visionamos_test`
  también, para nunca apuntar por accidente a la base de datos real.

## Verificación real

| Verificación | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | Limpio |
| `pnpm exec eslint "{src,test}/**/*.ts"` | Limpio |
| `pnpm test:integration`, primera corrida (crea `visionamos_test` desde cero) | 70/70 |
| `pnpm test:integration`, segunda corrida inmediata (idempotencia) | 70/70 — encontró y corrigió el bug de la tabla `migrations` truncada |
| `pnpm test:integration`, tercera corrida | 70/70 |
| `pnpm test` (unit) | 40/40 |
| `pnpm test:auth-cutover-rehearsal` (Fase 7, contra `visionamos` real) | 12/12 — sin cambios, usa la base de desarrollo, no la de test |
| `pnpm build` | Limpio |
| Datos reales de `visionamos` (5 usuarios de `seed-demo.ts`) | Verificados sin cambios, dos veces, antes y después de toda esta secuencia |

## Qué queda pendiente, no bloqueante

- Este `globalSetup` no se corrió todavía en un pipeline de CI real (no
  existe uno en este repo) — funciona en esta máquina de desarrollo, que es
  el único entorno que existe hoy.
- El archivo `better-auth-schema.sql` se mantiene sincronizado a mano si la
  configuración de Better Auth cambia — documentado explícitamente en el
  propio archivo, mismo principio que `RehearsalAppModule` (Fase 7).
