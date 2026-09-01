# ADR 010: Persistencia (TypeORM + PostgreSQL)

**Status:** Aceptado
**Fecha:** 2026-08-27

## Context

`apps/api` necesita una capa de persistencia real. No existía un requisito de
negocio que impusiera un motor de base de datos específico, así que se elige
la combinación más estándar y mejor soportada por el ecosistema NestJS.

## Decision

- **PostgreSQL 18** (`docker-compose.yml` para desarrollo local) como motor de
  base de datos.
- **TypeORM 1.1.0** + **`@nestjs/typeorm` 11.0.3** como ORM y su integración
  oficial con Nest. Peers verificados: `@nestjs/typeorm@11.0.3` acepta
  `@nestjs/core`/`@nestjs/common` `^10 || ^11` (compatible con nuestra rama 11
  — ver ADR 009); `typeorm@1.1.0` exige Node `^20.19.0 || ^22.13.0 ||
  > =24.11.0`, satisfecho por Node 24.20.0. **Nota:** `@nestjs/typeorm@12.0.0`(la última publicada) se descartó porque`@nestjs/terminus@11.1.1`declara`@nestjs/typeorm`como peer opcional solo hasta`^11.0.0` — el mismo patrón
  > de desviación que ADR 009, ahora dentro de una dependencia transitiva.
- **`pg` 8.23.0** como driver de PostgreSQL en desarrollo/producción.
- **`better-sqlite3` 12.11.1 (solo en `NODE_ENV=test`)**: la suite de tests de
  integración (`test/app.e2e-spec.ts`) arranca el `AppModule` completo vía
  Supertest; usar SQLite en memoria ahí evita depender de un Postgres real
  corriendo en CI/en esta máquina para poder ejecutar los tests. Es una
  decisión documentada, no un atajo oculto: `synchronize`/`dropSchema` solo se
  activan en ese modo (`apps/api/src/config/database.module.ts`).
  `better-sqlite3` se fija en la rama 12.x (no la 13.x, que es la última
  publicada) porque `typeorm@1.1.0` declara `peerDependencies: { "better-sqlite3":
"^12.0.0" }` — la 13.x rompería esa combinación.

## Alternatives considered

- **Prisma**: alternativa igualmente válida y muy usada con NestJS; se
  descarta por ahora a favor de TypeORM porque `@nestjs/typeorm` es el
  wrapper mantenido directamente bajo el paraguas de NestJS y evita añadir un
  paso de generación de cliente adicional al pipeline de build.
- **Testear siempre contra Postgres real (vía contenedor efímero en CI)**:
  es la opción más fiel a producción y debería adoptarse cuando el equipo
  tenga un pipeline de CI con Docker disponible; se documenta aquí como mejora
  futura. Mientras tanto, SQLite en memoria mantiene la suite de tests rápida
  y ejecutable en cualquier máquina de desarrollo sin dependencias externas.
- **Migraciones desde el día uno**: no implementadas todavía en esta fase.
  `synchronize: true` solo está activo en `development`/`test`; producción
  requiere configurar `typeorm migration:generate`/`migration:run` antes de un
  despliegue real — ver `docs/DEPENDENCY_POLICY.md` (pendiente).

## Actualización 2026-08-30: migraciones reales en Postgres

El schema inicial (`users`, `refresh_tokens`) se generó siempre por
`synchronize` — incluido, por error, en `NODE_ENV=development` además de
`test`. Al introducir el subdominio de Red Coopagos (`role_assignments`,
`audit_events`, `portals`, `categories`, `commerces`, `services`, las cuatro
tablas de formularios) con constraints reales (`CHECK` multi-columna,
`UNIQUE` compuestos, un índice único parcial para "una sola `FormVersion`
publicada por definición"), depender de `synchronize` deja de ser aceptable
para un dominio de pagos: no hay historial versionado del schema, no hay
forma de revisar un cambio de estructura en code review antes de aplicarlo, y
`synchronize` puede alterar una tabla con datos reales sin la deliberación de
una migración explícita.

**Decisión:** `synchronize` pasa a `false` en todo entorno que no sea
`NODE_ENV=test` — `development` y `production` requieren
`pnpm --filter api migration:run` contra un Postgres real. El `DataSource`
del CLI vive en `apps/api/src/config/data-source.ts` (mismas entidades que
`database.module.ts`, importadas desde `apps/api/src/config/entities.ts` para
no duplicar la lista). Las migraciones se generan agrupadas por concepto
(`AlterUsersDropRoleAddStatus`, `CreateRoleAssignments`,
`CreateAuditEvents`, `CreatePortalsCategoriesCommercesServices`,
`CreateForms`), no como un único archivo — permite revisar y revertir cada
pieza de forma independiente.

**El branch de test (`better-sqlite3` en memoria) no cambia** — sigue usando
`synchronize: true`. Verificado directamente contra el driver instalado
(`node_modules/typeorm/driver/sqlite-abstract/AbstractSqliteDriver.js`) que
`better-sqlite3` soporta nativamente `type: 'jsonb'` y emula `enum` vía
`CHECK IN (...)`, y que `@Check()`/`@Index({ where })` (índice único parcial)
son decoradores reales de TypeORM 1.1.0 — las mismas clases de entidad
generan un schema estructuralmente equivalente en ambos motores sin
ramificación por dialecto, así que no hay necesidad real de mantener
migraciones separadas "para SQLite". Ningún test de integración necesita
afirmar comportamiento físico específico de Postgres (nombre exacto de un
tipo `enum`, plan de un índice parcial) — solo el comportamiendo observable
por HTTP (200/403/409), idéntico en ambos motores porque la fuente de verdad
(los decoradores de entidad) es una sola.

Una consecuencia práctica de `synchronize: false` fuera de test: ya no existe
forma de crear el primer `AppUser` vía `POST /auth/register` (eliminado, ver
ADR 006/011) — el primer `SUPERADMIN` se crea con un script idempotente
(`apps/api/src/scripts/seed-superadmin.ts`, `pnpm --filter api
seed:superadmin`), deliberadamente **no** una migración de datos (credenciales
hasheadas no deben vivir para siempre en el historial de migraciones) ni
auto-creación en cada arranque de `main.ts` (podría recrear un SUPERADMIN que
alguien desactivó a propósito).

## Actualización 2026-09-01: se retira SQLite, todo entorno usa Postgres real

Esta ADR ya anticipaba esto ("Alternatives considered": *"Testear siempre
contra Postgres real... debería adoptarse cuando el equipo tenga un
pipeline de CI con Docker disponible"*; "Trade-offs": *"Si [las entidades
dejan de ser simples], migrar los tests de integración a un Postgres real
debe priorizarse"*). El disparador real fue
`docs/adr/013-better-auth-migration.md` (Fase 10): las tablas propias de
Better Auth (`user`/`session`/`account`/`verification`) no son entidades
TypeORM — nunca existieron en el SQLite en memoria, y
`BetterAuthSessionGuard` necesita que existan para funcionar en absoluto.
Mantener dos motores ya no era sostenible.

**Decisión:** se elimina por completo el branch `better-sqlite3` de
`database.module.ts` — **todo** `NODE_ENV` (`development`, `test`,
`production`) se conecta a PostgreSQL real. La dependencia `better-sqlite3`
se desinstaló (`pnpm remove better-sqlite3 --filter api`), junto con su
entrada en `pnpm-workspace.yaml` `allowBuilds` y los códigos de error
`SQLITE_CONSTRAINT_*` en `all-exceptions.filter.ts` (ya no alcanzables).

`test:integration` (`apps/api/test/*.e2e-spec.ts`) ahora apunta a una base
de datos **dedicada**, `visionamos_test` — nunca la base de desarrollo real
(`visionamos`), para no arriesgar los datos reales del usuario. La crea,
migra (TypeORM + Better Auth) y limpia
`apps/api/test/global-setup-postgres.ts` (`globalSetup` de Jest, corre una
vez antes de toda la suite) — ver ese archivo y
`docs/auth-migration/09-real-postgres-test-suite.md` para el detalle
completo. `synchronize`/`dropSchema` quedan en `false` también para test:
ya no hay un "modo rápido" que autogenere el schema — los tests corren
contra el mismo camino de migraciones reales que development/production,
lo cual además es más fiel a producción que el `synchronize:true` anterior.

**Consecuencia práctica:** `test:integration` ahora necesita Docker/Postgres
corriendo (igual que `test:auth-cutover-rehearsal` ya lo necesitaba desde
Fase 7) — deja de ser ejecutable "en cualquier máquina sin dependencias
externas", el trade-off que esta ADR aceptaba originalmente a favor de
SQLite. Se acepta conscientemente: el usuario de este proyecto ya trabaja
con Docker/Postgres real de forma rutinaria.

## Consequences

- El dominio (`UsersService`) depende de un `Repository<UserEntity>` inyectado
  (DIP pragmático, sección 14), no de un cliente de base de datos concreto.
- Cambiar de PostgreSQL a otro motor soportado por TypeORM en el futuro no
  requiere reescribir los servicios, solo la configuración de
  `database.module.ts`.
- Las entidades TypeORM (`UserEntity`) y los contratos Zod (`User` en
  `@repo/contracts`) son intencionalmente objetos distintos — un mapper
  explícito (`toUser`) los conecta. Esto evita acoplar el esquema de base de
  datos a la forma pública de la API (sección 3 — `contracts` no puede
  depender de infraestructura).

## Trade-offs

~~Tener dos "motores" de base de datos activos...~~ — **resuelto**, ver
"Actualización 2026-09-01" arriba: un solo motor (PostgreSQL) en todo
entorno, sin divergencia posible.
