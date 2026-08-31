# Prompt 01 — Auditoría técnica del monorepo real

Actúa como **Principal Software Architect**, **Staff Backend Engineer especializado en NestJS/TypeScript**, **Database Architect** y **Application Security Engineer**.

Estamos iniciando formalmente la arquitectura e implementación del backend de **Red Coopagos**.

## Antes de comenzar

Lee completamente y en el orden establecido:

```text
CLAUDE.md
00_README_START_HERE.md
docs/backend/state/PROJECT_BACKEND_STATE.md
docs/backend/state/PHASE_2_ENTRY_CRITERIA.md
docs/backend/business/BUSINESS_MODEL_RED_COOPAGOS.md
docs/backend/business/DOMAIN_GLOSSARY_RED_COOPAGOS.md
docs/backend/business/BUSINESS_RULES_RED_COOPAGOS.md
docs/backend/business/ROLE_PERMISSION_MATRIX.md
docs/backend/business/AUTHORIZATION_DECISIONS_UPDATE.md
docs/backend/business/USE_CASES.md
docs/backend/business/DOMAIN_MODEL.md
docs/backend/business/DOMAIN_RELATIONSHIPS.md
docs/backend/payments/PAYMENT_FLOW_MODEL.md
docs/backend/payments/TRANSACTION_LIFECYCLE.md
docs/backend/payments/PAYMENT_DOMAIN_DECISIONS.md
docs/backend/payments/PUBLIC_PAYMENT_SECURITY_BASELINE.md
```

Estos documentos representan la fuente funcional actual.

No reinterpretar arbitrariamente el negocio.

Distinguir siempre:

```text
CONFIRMADO
RECOMENDADO / PROPUESTA
PENDIENTE
```

Un concepto pendiente o recomendado no debe convertirse automáticamente en tabla, enum, endpoint o regla definitiva.

---

# FASE ACTUAL — AUDITORÍA TÉCNICA

No implementes todavía el backend objetivo.

Inspecciona completamente el monorepo real.

## A. Workspace y toolchain

Identifica:

1. estructura del repositorio;
2. `package.json` raíz;
3. package manager y versión;
4. `pnpm-workspace.yaml`;
5. `turbo.json`;
6. Node.js requerido;
7. TypeScript y configuración;
8. ESLint/Prettier;
9. scripts de build/test/typecheck/dev;
10. CI/CD disponible.

## B. Aplicaciones

Identifica todas las aplicaciones bajo `apps/` o equivalentes:

- backend NestJS;
- Backoffice Next.js;
- Portal Público Next.js;
- workers u otras apps.

Para cada una documenta versión, propósito y dependencias relevantes.

## C. Backend NestJS actual

Inspecciona:

- `main.ts`;
- root module;
- módulos;
- controllers;
- services;
- providers;
- guards;
- decorators;
- pipes;
- interceptors;
- filters;
- middleware;
- configuración;
- validation;
- manejo de errores;
- Swagger/OpenAPI;
- health checks;
- logging;
- jobs/queues si existen.

## D. Persistencia

Identifica:

- motor de base de datos;
- ORM/query builder;
- schema/models;
- migrations;
- seeds;
- connection/config;
- transacciones;
- conventions;
- índices/constraints visibles;
- estrategia de IDs;
- timestamps;
- soft delete si existe.

No cambiar ORM ni crear schema nuevo en esta fase.

## E. Identity & Access

Identifica:

- autenticación;
- sesiones/JWT/OIDC/OAuth si existe;
- passwords;
- refresh tokens;
- guards;
- roles;
- permissions;
- scopes;
- recuperación de acceso;
- almacenamiento de secretos;
- cookies/localStorage relevantes entre frontend/backend.

Comparar con `ROLE_PERMISSION_MATRIX.md`.

## F. Contratos y Zod

Revisa:

- uso actual de Zod;
- DTOs;
- schemas;
- packages compartidos;
- tipos compartidos;
- duplicación entre frontend/backend;
- posibilidad de contracts sin acoplar entidades internas al frontend.

No crear todavía `packages/contracts` si no se ha decidido.

## G. Frontend vs backend

Analiza cómo el Backoffice y el Portal Público esperan comunicarse con el backend.

Verifica si actualmente existe una separación equivalente a:

```text
Admin API
Public API
Integration/Webhook API
```

No implementarla todavía; solo documentar el estado actual.

## H. Testing

Identifica:

- unit tests;
- integration tests;
- e2e;
- fixtures;
- test database;
- coverage;
- scripts existentes.

## I. Seguridad

Identifica el baseline actual y riesgos evidentes relacionados con:

- OWASP Top 10:2025;
- OWASP API Security Top 10:2023;
- ASVS 5.x;
- Broken Access Control;
- BOLA/BFLA;
- authentication;
- validation;
- injection;
- SSRF;
- CORS;
- rate limiting;
- secrets;
- logging de PII/tokens;
- error leakage;
- supply chain;
- webhooks;
- idempotencia;
- manejo de condiciones excepcionales.

En esta fase **solo detectar y documentar**. No ejecutar un refactor masivo de seguridad.

---

# PROHIBICIONES DE ESTA FASE

No:

- agregar/cambiar ORM;
- crear tablas;
- crear migraciones;
- implementar Portals/Commerce/Payments;
- cambiar autenticación;
- actualizar dependencias;
- reorganizar masivamente carpetas;
- crear microservicios;
- introducir CQRS/Event Sourcing por defecto;
- crear endpoints nuevos;
- eliminar código existente;
- cambiar versiones.

---

# ENTREGABLES OBLIGATORIOS

Crear:

```text
docs/backend/architecture/MONOREPO_AUDIT.md
docs/backend/architecture/CURRENT_ARCHITECTURE.md
docs/backend/architecture/TECHNICAL_RISKS.md
docs/backend/architecture/SECURITY_BASELINE_CURRENT.md
docs/backend/architecture/BUSINESS_TECH_GAP_ANALYSIS.md
```

## BUSINESS_TECH_GAP_ANALYSIS

Debe comparar explícitamente negocio vs implementación.

Formato sugerido:

| Requerimiento | Fuente | Implementación actual | Estado | Gap | Riesgo/impacto |
|---|---|---|---|---|---|
| Portal 1:N Commerce | DOMAIN_RELATIONSHIPS | ... | IMPLEMENTED/PARTIAL/MISSING/CONFLICT | ... | ... |

Analizar como mínimo:

- usuarios administrativos;
- roles/scopes;
- Portales;
- Categorías por Portal;
- Comercios;
- Servicios;
- Formularios dinámicos;
- Portal Público;
- PayerData;
- obligaciones/cuotas;
- transacciones;
- lifecycle;
- métodos de pago;
- reportes;
- auditoría;
- integración/webhooks.

---

# CIERRE

Al finalizar:

1. resume cómo está construido el monorepo;
2. indica qué debe conservarse;
3. indica qué necesita refactor;
4. indica qué falta;
5. identifica conflictos con el modelo de negocio;
6. propone candidatos de arquitectura, sin implementarlos;
7. actualiza `docs/backend/state/PROJECT_BACKEND_STATE.md`;
8. detente.

**No avances automáticamente a la arquitectura objetivo.**
