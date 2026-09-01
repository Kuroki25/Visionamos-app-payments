<!--
Ejecutado 2026-08-31/09-01, la misma sesión, después de que el usuario
levantó Docker. Cierra los pendientes reales heredados de las Fases 4-6
(docs/auth-migration/03-database-migration-strategy.md,
04-infrastructure-implementation.md, 05-authorization-adapter.md): schema
real generado y aplicado, migración de datos real corrida, login real
verificado de extremo a extremo. Sigue sin ser "Fase 7" formal (BOLA/BFLA
sistemático) — es la evidencia real que las Fases 4-6 habían dejado como
NO VERIFICADO por falta de Postgres, ahora cerrada con comandos reales.
-->

# Migración real contra Postgres de desarrollo

## 0. CLI: `@better-auth/cli` está deprecado, se usó `auth` en su lugar

Antes de instalar nada, `pnpm add -D @better-auth/cli` mostró
`[WARN] deprecated @better-auth/cli@1.4.21` y `pnpm view @better-auth/cli`
confirmó: *"Package no longer supported"*. Además esa versión depende
internamente de `better-auth@1.4.21` — **desalineada** con el
`better-auth@1.7.2` real instalado en Fase 5. Se desinstaló sin usarla.

El CLI real y vigente es el paquete `auth` (mismo repo, mismo equipo —
`pnpm view auth repository` → `github.com/better-auth/better-auth`,
`directory: packages/cli`), versionado en paralelo al paquete principal
(`auth@1.7.2`, coincide exactamente). Se instaló, se usó, y **se desinstaló
otra vez** al terminar — no quedó como dependencia persistida en
`package.json` (ver §5, "qué no quedó en el repo").

Un segundo problema real, también resuelto: `auth`/su dependencia `c12`
arrastra una versión **beta** (`c12@4.0.0-beta.5`) que pide
`chokidar@^5`, en conflicto con `strictPeerDependencies: true`
(`pnpm-workspace.yaml`). Se evitó instalarlo como dependencia persistida del
workspace — se invocó vía `pnpm dlx auth@1.7.2 ...` (ejecución aislada, sin
tocar el lockfile del proyecto) precisamente para no arrastrar ese conflicto
al repo real.

## 1. Schema real generado (reemplaza la lista "según fuente consultada" de Fase 4)

```bash
pnpm dlx auth@1.7.2 generate --config src/infra/better-auth/auth.cli.ts \
  --output /tmp/better-auth-schema.sql -y
```

DDL real, completo, tal como lo emitió el CLI contra la configuración real
del proyecto (`generateId: 'uuid'` ya en efecto — cada PK es
`uuid default pg_catalog.gen_random_uuid()`):

```sql
create table "user" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "session" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" uuid not null references "user" ("id") on delete cascade);

create table "account" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "issuer" text not null, "accountId" text not null, "providerId" text not null, "userId" uuid not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "verification" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create index "session_userId_idx" on "session" ("userId");
create index "account_userId_idx" on "account" ("userId");
create index "verification_identifier_idx" on "verification" ("identifier");
create unique index "account_issuer_accountId_uidx" on "account" ("issuer", "accountId");
```

**Corrección a Fase 4**: `account` tiene una columna que la lista original
(sacada de documentación/comunidad, no de una corrida real) no incluía:
**`issuer`** (`text not null`), parte de un índice único junto a
`accountId`. El script de migración de datos (§3) ya la usa correctamente
(`'local:credential'`, coincidiendo con la guía oficial de migración de
Better Auth verificada en Fase 3).

`apps/api/src/infra/better-auth/auth.cli.ts` — archivo nuevo, config real
para el CLI (el CLI necesita un archivo que exporte una instancia
`betterAuth()` de verdad, no la factory parametrizada que usa la app). Solo
lo usa el CLI, `app.module.ts` no lo importa.

## 2. Migración aplicada contra Postgres real

```bash
pnpm dlx auth@1.7.2 migrate --config src/infra/better-auth/auth.cli.ts -y
```

`🚀 migration was completed successfully!` — confirmado además con
`docker exec ... psql -c '\dt'`: las 19 tablas ahora incluyen `user`,
`session`, `account`, `verification` **junto a**, no en lugar de, las 15
tablas ya existentes (`users`, `role_assignments`, `portals`, etc.) — cero
tablas existentes tocadas, exactamente el diseño de "dos dueños de schema"
del ADR 013/Fase 4.

## 3. Migración de datos real — 5 usuarios reales, no un ejemplo sintético

`apps/api/src/scripts/migrate-users-to-better-auth.ts` (nuevo,
`pnpm --filter api migrate:better-auth-users`) — implementa exactamente el
script de Fase 4 §4. Contra el Postgres de desarrollo del usuario había
**5 filas reales en `users`** (`SELECT count(*) FROM users` → `5` — cierra
el pendiente NO VERIFICADO de Fase 1/4), todas de `seed-demo.ts`
(`superadmin@example.com`, `admin.avanza@example.com`,
`admin.universidad-avanza@example.com`, `viewer.avanza@example.com`,
`admin.otrahuilca@example.com`), todas `ACTIVE`, todas con
`role_assignments`.

**Un bug real encontrado y corregido durante la corrida** (no en el diseño
de Fase 4, en la implementación): el primer intento falló con
`error: text versus uuid (42P08)` — el `INSERT` de `account` reutilizaba el
mismo parámetro `$1` para `"accountId"` (columna `text`) y `"userId"`
(columna `uuid`); Postgres infiere un solo tipo por número de parámetro en
todo el statement y no puede reconciliar `text` con `uuid` para el mismo
`$1`. Corregido usando dos placeholders separados (`$1`/`$2`) con el mismo
valor JS. La transacción de la fila que falló hizo rollback limpio (`SELECT
count(*) FROM "user"` → `0` antes de reintentar) — ninguna fila a medio
migrar quedó en la base.

Resultado tras la corrección: `Migrated 5 user(s) into Better Auth's
user/account tables; 0 already present.` Verificado con la consulta de
integridad exacta que ya proponía Fase 4 §5 paso 3 — **0 filas huérfanas**:

```sql
SELECT u.id FROM users u
LEFT JOIN "user" bu ON bu.id = u.id
LEFT JOIN account a ON a."userId" = u.id AND a."providerId" = 'credential'
WHERE bu.id IS NULL OR a.id IS NULL;
-- 0 rows
```

Y confirmado que los 5 emails, `emailVerified=true`, `providerId='credential'`,
`issuer='local:credential'` quedaron correctos — sin imprimir ningún hash
ni contraseña (prompt maestro §17).

## 4. Login real verificado de extremo a extremo — sin resetear ninguna contraseña

`seed-demo.ts` usa una contraseña de demo fija y ya impresa por el propio
script (`DEMO_PASSWORD = 'a-strong-password-123'`, no es un secreto real).
Con eso, tres verificaciones reales corridas vía `ts-node` (scripts
temporales, borrados inmediatamente después — no forman parte del repo):

1. **`auth.api.signInEmail`** con la contraseña Argon2id **original, nunca
   recalculada** → `SIGN-IN OK. user.id: 3dbd461e-dd40-4cfc-8ca4-0f6704c5f21d
   session present: true` — el mismo `id` que tenía `superadmin@example.com`
   en `users` antes de migrar nada. Prueba que
   `emailAndPassword.password.verify` (el wrapper de `argon2-password.ts`,
   Fase 5) funciona contra un hash real migrado sin tocar, no solo contra
   una instancia en memoria.
2. **Contraseña incorrecta** → rechazada (`Invalid email or password`, con
   un `WARN [Better Auth]: Invalid password` en el log) — no es un login
   que siempre pasa.
3. **El camino exacto que usa `BetterAuthSessionGuard`**: se tomó la cookie
   `session_token` real de la respuesta del login y se llamó
   `auth.api.getSession({ headers: fromNodeHeaders({ cookie }) })` — la
   misma función y el mismo helper oficial que el guard de Fase 6 usa
   internamente → resolvió el mismo `user.id` correcto. Cierra el pendiente
   que Fase 6 había dejado explícito ("ningún test contra una sesión real").

## 5. Qué quedó y qué no en el repo

**Quedó** (commiteable, revisado más abajo con `tsc`/`eslint`/tests):
`auth.cli.ts`, `migrate-users-to-better-auth.ts`, el script npm
`migrate:better-auth-users`, la entrada `@prisma/client: false` en
`pnpm-workspace.yaml` (ver §6), y las cuatro tablas nuevas + 5 filas
migradas **en el Postgres de desarrollo del usuario** (no en ningún archivo
del repo — es estado de base de datos, no código).

**No quedó**: el paquete `auth` (CLI) — instalado temporalmente, desinstalado
al terminar, no aparece en `package.json`. Los tres scripts de verificación
de login (`verify-login.ts`, `verify-login-negative.ts`,
`verify-guard-e2e.ts`) — creados, ejecutados, borrados; no son parte de la
suite de tests automatizada porque dependen de Postgres real con datos ya
sembrados (`seed-demo.ts`), no del SQLite en memoria que usa
`test:integration` hoy — añadirlos como tests permanentes rompería esa
suite en cualquier entorno sin Docker, así que quedan como evidencia
documentada aquí, no como test repetible.

## 6. Un hallazgo de higiene de dependencias, ya corregido

Instalar `better-auth`/el CLI arrastró `@prisma/client@5.22.0` como
dependencia transitiva (`@better-auth/prisma-adapter`, un adapter de Better
Auth que este proyecto no usa — la decisión del ADR 013 es `pg.Pool`/Kysely
directo). `pnpm-workspace.yaml` exige allow-listar explícitamente cualquier
paquete con script de instalación (`docs/DEPENDENCY_POLICY.md`); pnpm 11
auto-generó una línea placeholder (`'@prisma/client': set this to true or
false`) que **bloqueaba `pnpm install`** (`[ERR_PNPM_IGNORED_BUILDS]`,
exit code 1) hasta decidirla. Resuelto: `false`, con comentario explicando
por qué (no se usa Prisma, su postinstall no tiene ningún archivo
`schema.prisma` contra el cual correr).

## Verificación completa, todo en verde

| Verificación | Resultado |
|---|---|
| `pnpm install` (con la política de builds resuelta) | Limpio |
| `pnpm exec tsc --noEmit` | Limpio |
| `pnpm exec eslint` sobre todos los archivos nuevos/modificados | Limpio |
| `pnpm test` (unit) | 40/40 |
| `pnpm test:integration` (e2e, SQLite en memoria, sin cambios) | 70/70 |
| Schema real generado y aplicado contra Postgres | ✅ (`\dt` → 19 tablas) |
| Migración de datos real (5 usuarios reales) | ✅ (0 huérfanos) |
| Login real con contraseña original | ✅ |
| Login real con contraseña incorrecta | ✅ rechazado |
| Camino real del guard (`getSession` + `fromNodeHeaders`) contra sesión real | ✅ |

## Lo que sigue explícitamente sin hacer (a propósito)

- **`app.module.ts` sigue sin tocarse** — nada de esto sirve tráfico real
  todavía. `BetterAuthSessionGuard` no está en el `APP_GUARD` chain.
- **No se tocó `users`** (sin `ALTER`, sin `FOREIGN KEY`, sin `DROP
  password_hash`) — sigue siendo Fase 10, no antes, tal como decidió Fase 4.
- **No se corrió BOLA/BFLA sistemático** (Fase 7 propiamente dicha) — esto
  fue cerrar los pendientes de las Fases 4-6, no adelantar la Fase 7
  completa.
