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

Tener dos "motores" de base de datos activos (Postgres real, SQLite en tests)
es una fuente conocida de divergencia (tipos de columna, comportamiento SQL
específico de cada motor); se acepta porque las entidades de este proyecto son
deliberadamente simples y no usan features específicas de Postgres todavía. Si
eso deja de ser cierto, migrar los tests de integración a un Postgres real
(vía contenedor) debe priorizarse.
