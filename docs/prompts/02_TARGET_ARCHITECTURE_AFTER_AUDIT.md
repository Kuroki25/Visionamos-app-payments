# Prompt 02 — Arquitectura objetivo (NO EJECUTAR TODAVÍA)

> Ejecutar únicamente después de completar y revisar `01_MONOREPO_AUDIT_PROMPT.md`.

Usa como fuentes:

- toda la documentación de `docs/backend/business/`;
- toda la documentación de `docs/backend/payments/`;
- `PROJECT_BACKEND_STATE.md`;
- los cinco entregables de auditoría en `docs/backend/architecture/`;
- el código real del monorepo.

Objetivo: proponer, sin implementar todavía módulos de negocio, la arquitectura objetivo del backend NestJS y su integración con los dos Next.js.

Debes justificar si corresponde un **Modular Monolith orientado a dominios** y hasta qué profundidad usar DDD/Hexagonal/Clean Architecture. Evita arquitectura ceremonial.

Producir:

```text
docs/backend/architecture/TARGET_ARCHITECTURE.md
docs/backend/architecture/MODULE_MAP.md
docs/backend/architecture/DEPENDENCY_RULES.md
docs/backend/architecture/API_BOUNDARIES.md
docs/backend/architecture/CONTRACT_STRATEGY.md
docs/backend/adr/ADR-001-backend-architecture.md
docs/backend/adr/ADR-002-domain-boundaries.md
docs/backend/adr/ADR-003-admin-public-integration-api.md
docs/backend/adr/ADR-004-authorization-scope-model.md
docs/backend/adr/ADR-005-contract-strategy.md
```

Debes separar conceptualmente:

```text
Admin API
Public API
Integration/Webhook API
```

sin duplicar dominio ni crear microservicios sin justificación.

No crear todavía el modelo físico de PostgreSQL ni migraciones. Actualiza `PROJECT_BACKEND_STATE.md` y detente.
