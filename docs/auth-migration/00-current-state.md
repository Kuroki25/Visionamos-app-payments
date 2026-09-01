<!--
Fase 0 — Pre-flight (PROMPT MAESTRO §15). Solo lectura: ningún archivo de
código fue modificado para producir este documento. Ejecutado 2026-08-31.
Ver también: [[better-auth-migration-master-prompt]] en la memoria del
usuario para el prompt completo que rige esta migración.
-->

# Fase 0 — Pre-flight

## Estado de git

```text
$ git branch -vv
  dev  3453e77 [origin/dev] docs: simplificar README...
* main 3453e77 [origin/main] docs: simplificar README...
  test 3453e77 [origin/test] docs: simplificar README...

$ git status
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

- **Branch actual:** `main`, sincronizado con `origin/main` (commit `3453e77`).
- **Working tree:** limpio, sin cambios pendientes de commitear.
- **Ramas:** `main`/`dev`/`test`, las tres apuntan al mismo commit `3453e77`.

## Herramientas

```text
$ node --version
v24.20.0

$ pnpm --version
11.24.0
```

Coincide con lo fijado en `apps/api/package.json` → `engines.node` (`>=24.20.0 <25`)
y con `pnpm-workspace.yaml` (`packageManager`/catalog).

## Versiones reales del stack (verificadas, no asumidas)

| Paquete | Versión | Fuente |
|---|---|---|
| Node.js | `24.20.0` | `node --version` |
| pnpm | `11.24.0` | `pnpm --version` |
| TypeScript | `6.0.3` | `pnpm-workspace.yaml` → `catalog.typescript` |
| Zod | `4.4.3` | `pnpm-workspace.yaml` → `catalog.zod` |
| React | `19.2.8` | `pnpm-workspace.yaml` → `catalog.react` |
| Next.js | `16.3.3` | `apps/dashboard-web/package.json`, `apps/portal-web/package.json` |
| NestJS core | `11.2.3` | `apps/api/package.json` → `@nestjs/common` |
| `@nestjs/jwt` | `11.0.2` | `apps/api/package.json` |
| `jsonwebtoken` (transitivo de `@nestjs/jwt`) | `9.0.3` | `node_modules/.pnpm/jsonwebtoken@9.0.3/...` |
| `@nestjs/config` | `4.0.4` | `apps/api/package.json` |
| `@nestjs/throttler` | `6.5.0` | `apps/api/package.json` |
| `@nestjs/typeorm` | `11.0.3` | `apps/api/package.json` |
| `@nestjs/platform-express` | `11.2.3` | `apps/api/package.json` (confirma Express, no Fastify) |
| TypeORM | `1.1.0` | `apps/api/package.json` |
| PostgreSQL | `18-alpine` (imagen Docker) | `docker-compose.yml` → `image:` |
| `argon2` | `0.45.1` | `apps/api/package.json` |
| **Passport / `@nestjs/passport` / `passport-jwt` / `passport-local`** | **no instalado** | `grep -ril passport apps/api/src apps/api/package.json` → sin resultados |
| **Better Auth** | **no instalado** | no aparece en ningún `package.json` del monorepo |

No se ejecutó ninguna instalación ni actualización de dependencias en esta fase.

## Carpeta de trabajo

Creada `docs/auth-migration/` para los entregables de las fases 1+. No se
sobrescribió ningún archivo existente del desarrollador.

## Alcance de esta corrida

Se ejecuta exclusivamente **Fase 0 (Pre-flight)** y **Fase 1 (Auditoría del
sistema de autenticación actual)**, tal como exige el prompt maestro §94. No
se instala Better Auth, no se migra nada, no se borra código todavía.
