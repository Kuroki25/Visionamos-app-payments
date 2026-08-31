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

## 4. Variables de entorno

Cada app tiene su propio `.env.example` — copialo a `.env` en la misma
carpeta y ajustá lo que necesites. **Nunca se commitean los `.env` reales**
(están en `.gitignore`); solo los `.env.example` viven en el repo.

### 4.1 `apps/api/.env`

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable | Para qué sirve | Desarrollo local | Producción |
|---|---|---|---|
| `NODE_ENV` | Selecciona el modo de la app | `development` | `production` |
| `PORT` | Puerto HTTP del backend | `4100` | el que asigne tu hosting |
| `CORS_ALLOWED_ORIGINS` | Orígenes permitidos (coma-separado) | `http://localhost:3100,http://localhost:3101` | las URLs reales de tus frontends desplegados |
| `SWAGGER_ENABLED` | Expone `/api/v1/docs` | `true` | `false` (no exponer el explorador de API en producción) |
| `THROTTLE_TTL_MS` / `THROTTLE_LIMIT` | Rate limiting global | `60000` / `100` | ajustar según tráfico esperado |
| `LOG_LEVEL` | Verbosidad de logs (pino) | `info` o `debug` | `info` o `warn` |
| `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME` | Conexión a PostgreSQL | `localhost` / `5442` / `visionamos` / `visionamos` / `visionamos` | las de tu Postgres administrado |
| `DB_SSL` | TLS contra Postgres | `false` | `true` (casi todo hosting administrado lo exige) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Firman los tokens de sesión — **deben ser distintos entre sí** | generar uno de prueba (ver abajo) | generar uno real por variable, **nunca reutilizar el de otro entorno** |
| `JWT_ACCESS_TTL` | Vigencia del access token | `15m` | `15m` (no alargar sin razón) |
| `JWT_REFRESH_TTL_DAYS` | Vigencia del refresh token | `7` | según tu política de sesión |
| `COOKIE_SECURE` | Cookies solo por HTTPS | `false` (estás en `http://localhost`) | `true` (**obligatorio** — nunca `false` en producción) |
| `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` / `SUPERADMIN_FULL_NAME` | Solo los lee `pnpm seed:superadmin`, nunca la app en caliente | los que quieras para tu ambiente local | credenciales reales, usadas una sola vez y luego se pueden borrar del `.env` |

Generar un secreto real:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

**Para correr los tests (`pnpm test`, `pnpm test:integration`) no hace falta
crear `.env` ni Postgres real** — usan una base SQLite en memoria y secretos
de prueba que se autocompletan (`apps/api/test/setup-env.ts`). `NODE_ENV=test`
lo pone Jest automáticamente.

### 4.2 `apps/portal-web/.env` y `apps/dashboard-web/.env`

Mismo contenido en ambos:

```bash
cp apps/portal-web/.env.example apps/portal-web/.env
cp apps/dashboard-web/.env.example apps/dashboard-web/.env
```

| Variable | Para qué sirve | Desarrollo local | Producción |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL base del backend (va al bundle del navegador, por eso el prefijo `NEXT_PUBLIC_`) | `http://localhost:4100/api/v1` | la URL pública real del backend, con `https://` |

## 5. Base de datos

```bash
docker compose up -d postgres        # levanta Postgres en el puerto 5442
pnpm --filter api migration:run      # aplica el schema (tablas, constraints, índices)
pnpm --filter api seed:superadmin    # crea el primer usuario SUPERADMIN (lee SUPERADMIN_* del .env)
pnpm --filter api seed:demo          # opcional: datos de ejemplo (portales, comercios, formularios, transacciones)
```

- `migration:run` es idempotente — correrlo de nuevo no rompe nada si ya está al día.
- `seed:superadmin` y `seed:demo` también son idempotentes: si ya corriste, avisan y no hacen nada.
- No hay autoregistro público — la única forma de tener el primer usuario es `seed:superadmin`. De ahí en adelante, `POST /users` (autenticado) crea el resto.

## 6. Levantar todo en desarrollo

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

## 7. Tests

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

## 8. Producción

```bash
pnpm build                       # compila las 3 apps
pnpm --filter api migration:run  # aplica migraciones pendientes contra la BD real, ANTES de arrancar
pnpm --filter api start:prod     # corre el backend compilado (dist/main.js)
pnpm --filter portal-web start   # corre el frontend compilado
pnpm --filter dashboard-web start
```

Checklist mínimo antes de desplegar:

- [ ] `.env` de `apps/api` con `NODE_ENV=production`, `COOKIE_SECURE=true`, `DB_SSL=true`, `SWAGGER_ENABLED=false`, y `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` generados de nuevo (no los de desarrollo).
- [ ] `CORS_ALLOWED_ORIGINS` apuntando exactamente a los dominios reales de `portal-web`/`dashboard-web` (nunca `*`).
- [ ] `NEXT_PUBLIC_API_URL` de ambos frontends apuntando al dominio real del backend, con `https://`.
- [ ] Migraciones aplicadas (`migration:run`) contra la base real antes de recibir tráfico.
- [ ] Un solo `SUPERADMIN` inicial sembrado (`seed:superadmin`), credenciales rotadas después del primer login.

## 9. Estructura del proyecto

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

## 10. Si vas a tocar la app

- Antes de cambiar autenticación/autorización, leé `docs/adr/006` y `docs/adr/011`.
- Antes de tocar el modelo de datos, leé `docs/adr/010` (persistencia/migraciones) y `docs/adr/012` (por qué Transacciones es de solo lectura por ahora).
- Las migraciones se generan con `pnpm --filter api migration:generate src/migrations/NombreDescriptivo` contra un Postgres real — **revisá siempre el archivo generado a mano** antes de commitear (TypeORM no deduplica `CREATE TYPE` cuando un enum se comparte entre tablas; ver los comentarios en las migraciones ya existentes).
- No hay `DELETE` para Portal/Categoría/Comercio/Servicio/Transacción — es una regla de negocio confirmada (`docs/business/ROLE_PERMISSION_MATRIX.md`), no un endpoint faltante.
