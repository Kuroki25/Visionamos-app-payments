# Visionamos-app-payments — Red Coopagos

Backend + frontends de **Red Coopagos**, una plataforma de pagos organizada por
**Portales** (cooperativas). Cada Portal administra una red de **Comercios
Aliados** (colegios, universidades, hoteles, clínicas...), clasificados por
**Categorías**. Cada Comercio ofrece **Servicios** cobrables, y cada Servicio
puede tener un **Formulario dinámico** (versionado) que el cliente diligencia
antes de pagar.

El modelo de negocio completo está documentado en `docs/business/` y
`docs/payments/`; las decisiones de arquitectura y sus porqués están en
`docs/adr/` (léelos si vas a tocar algo — cada decisión no obvia está
explicada ahí, no solo en el código).

## 1. Qué hay en este repo

Monorepo pnpm + Turborepo con 3 aplicaciones y 1 paquete compartido:

| App/paquete | Qué es | Puerto (dev) |
|---|---|---|
| `apps/api` | Backend NestJS + PostgreSQL (TypeORM) | `4100` |
| `apps/dashboard-web` | Backoffice administrativo (Next.js) | `3101` |
| `apps/portal-web` | Portal público de cara al cliente (Next.js) | `3100` |
| `packages/contracts` | Schemas Zod compartidos (fuente de verdad de los contratos API) | — |
| Postgres (Docker) | Base de datos | `5442` (host) → `5432` (contenedor) |

Los puertos son a propósito distintos de los típicos `3000/3001/4000/5432`,
para no chocar con otros proyectos corriendo en la misma máquina.

**Qué funciona hoy:** autenticación (login/logout/refresh con cookies
`httpOnly`), autorización por rol + alcance organizacional (`SUPERADMIN` /
`ADMIN_PORTAL` / `ADMIN_COMMERCE` / `VIEWER`), CRUD de Portales/Categorías/
Comercios/Servicios, formularios dinámicos versionados con publicación, y un
módulo de Transacciones de solo lectura (el flujo real de pago todavía
depende de decisiones de negocio pendientes — ver `docs/adr/012`).

## 2. Requisitos previos

- **Node.js** `24.20.0` (fijado en `.nvmrc`/`.node-version` — con `nvm use` alcanza)
- **pnpm** `11.24.0` (fijado en `package.json` → `packageManager`; con Corepack habilitado (`corepack enable`) se instala solo)
- **Docker** (Docker Desktop en Windows/Mac, o Docker Engine en Linux) — solo para la base de datos

## 3. Instalación

```bash
git clone https://github.com/Kuroki25/Visionamos-app-payments.git
cd Visionamos-app-payments
pnpm install
```

## 4. Base de datos

```bash
docker compose up -d postgres        # levanta Postgres en el puerto 5442
pnpm --filter api migration:run      # aplica el schema (tablas, constraints, índices)
pnpm --filter api seed:superadmin    # crea el primer usuario SUPERADMIN (lee SUPERADMIN_* del .env)
pnpm --filter api seed:demo          # opcional: datos de ejemplo (portales, comercios, formularios, transacciones)
```

- `migration:run` es idempotente — correrlo de nuevo no rompe nada si ya está al día.
- `seed:superadmin` y `seed:demo` también son idempotentes: si ya corriste, avisan y no hacen nada.
- No hay autoregistro público — la única forma de tener el primer usuario es `seed:superadmin`. De ahí en adelante, `POST /users` (autenticado) crea el resto.

## 5. Levantar todo en desarrollo

```bash
pnpm dev
```

Esto levanta las 3 apps en paralelo (Turborepo). También podés levantar solo una:

```bash
pnpm --filter api start:dev            # backend con recarga en caliente
pnpm --filter portal-web dev           # portal público
pnpm --filter dashboard-web dev        # backoffice
```

Con la API arriba, el explorador interactivo de la API está en
`http://localhost:4100/api/v1/docs` (Swagger, solo si `SWAGGER_ENABLED=true`).

## 6. Tests

```bash
pnpm test              # unit tests de todas las apps
pnpm test:integration  # e2e del backend (api) — no necesita Postgres real
pnpm typecheck          # TypeScript en todo el monorepo
pnpm lint                # ESLint en todo el monorepo
```

Por app, si querés correr solo una:

```bash
pnpm --filter api test              # unit
pnpm --filter api test:integration  # e2e (jest + supertest, sqlite en memoria)
pnpm --filter portal-web test:e2e   # Playwright
```

## 7. Estructura del proyecto

```text
apps/
  api/                 NestJS — módulos por dominio (auth, users, portals, categories,
                        commerces, services, forms, transactions, audit, role-assignments)
  portal-web/          Next.js — portal público
  dashboard-web/       Next.js — backoffice administrativo
packages/
  contracts/           Schemas Zod compartidos (fuente de verdad de los contratos API)
  ui/                  Componentes compartidos
docs/
  adr/                 Decisiones de arquitectura, con su porqué y alternativas descartadas
  business/            Modelo de negocio, glosario, reglas, matriz de roles
  payments/            Modelo del flujo de pago y ciclo de vida de transacciones
  SECURITY-CONTROLS.md Cada control de seguridad mapeado a su test
docker-compose.yml     Postgres para desarrollo local
```
