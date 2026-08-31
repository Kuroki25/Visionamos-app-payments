# Red Coopagos — PHASE_2_ENTRY_CRITERIA

**Objetivo:** preparar el inicio de la arquitectura backend sin inventar estructura que no exista en el monorepo real.

## 1. Resultado de la verificación del ZIP actual

El archivo `portal-de-pagos-dashboard-2(1).zip` contiene una aplicación frontend Next.js y documentación de integración, pero no contiene una aplicación NestJS real.

Se observaron elementos como:

```text
app/
components/
lib/
public/
styles/
package.json
pnpm-lock.yaml
next.config.mjs
```

No se encontraron evidencias de:

```text
nest-cli.json
app.module.ts
main.ts de NestJS
apps/* backend/api
Prisma/TypeORM/Drizzle backend
estructura real del monorepo NestJS
```

Por tanto, este ZIP es útil para extraer requerimientos funcionales y UI, pero NO debe utilizarse para decidir la arquitectura física del backend.

## 2. Para iniciar FASE 2 se debe inspeccionar el monorepo real

Archivos/áreas mínimas:

```text
package.json
pnpm-workspace.yaml
turbo.json
tsconfig*.json
apps/
packages/
backend NestJS
nest-cli.json
main.ts
app.module.ts
módulos existentes
ORM
migraciones
.env.example
auth/guards/interceptors/filters/pipes
shared packages
scripts de lint/test/build
```

## 3. Entregables de FASE 2

```text
MONOREPO_BACKEND_AUDIT.md
TARGET_ARCHITECTURE.md
MODULE_MAP.md
DEPENDENCY_RULES.md
API_BOUNDARIES.md
CONTRACT_STRATEGY.md
SECURITY_ARCHITECTURE_BASELINE.md
```

ADRs iniciales:

```text
ADR-001-modular-monolith.md
ADR-002-domain-boundaries.md
ADR-003-admin-public-integration-api-separation.md
ADR-004-rbac-scope-authorization.md
ADR-005-contract-strategy.md
```

## 4. Arquitectura candidata, no aprobada todavía

```text
NestJS Modular Monolith
  ├── Identity & Access
  ├── Network / Portals
  ├── Commerce
  ├── Services
  ├── Dynamic Forms
  ├── Payments
  ├── Reporting
  ├── Audit
  └── Integrations
```

Con tres superficies HTTP diferenciadas conceptualmente:

```text
Admin API
Public API
Integration/Webhook API
```

Estas superficies pueden pertenecer a la misma aplicación NestJS y reutilizar casos de uso/dominio; no implican microservicios.

## 5. Regla de entrada

No crear módulos, carpetas, entidades ORM, migraciones ni endpoints definitivos hasta inspeccionar el backend real del monorepo y comprobar versiones/dependencias existentes.
