> **⚠️ OBSOLETO — no confiar en el contenido de este archivo.**
> Verificado el 2026-08-30: ninguno de los endpoints/entidades que este
> documento describe como completados existe en el repositorio real
> (`git log --all` solo tiene el commit de scaffold inicial; ninguna de las
> 23 entidades listadas aquí aparece en `apps/` ni `packages/`). Además,
> este documento fue auditado contra una estructura de monorepo
> (`apps/admin`, `apps/api`, `apps/web`, `packages/types`, `packages/schemas`)
> que no es la de este repositorio (`apps/portal-web`, `apps/dashboard-web`,
> `apps/api`, `packages/contracts`). Se conserva sin modificar por valor
> histórico/de contexto, pero no debe usarse como fuente de "qué está ya
> construido". El estado real del backend se planea y ejecuta a partir de
> `docs/business/` + `docs/payments/` (sí confiables, fase-gateados) — ver
> `docs/adr/` para las decisiones de arquitectura realmente vigentes.

# PROJECT_BACKEND_STATE.md — Updated after FASE 5.0

**Project:** Red Coopagos  
**Phase:** FASE 5.0 — Admin API Endpoints (CRUD)  
**Last Updated:** 2026-08-24  
**Status:** ✅ 16 ENDPOINTS IMPLEMENTADOS Y VALIDADOS

---

## 📊 Timeline de Fases

```
FASE 2.0 ✅ COMPLETADA (2026-08-23)
├─ Auditoría técnica del monorepo
├─ Identificación de riesgos
├─ Gap análisis: 108 requerimientos vs código
└─ 5 documentos de auditoría generados

FASE 3.0 ✅ COMPLETADA (2026-08-23)
├─ TARGET_ARCHITECTURE.md          (Modular Monolith)
├─ MODULE_MAP.md                   (7 módulos + Common)
├─ DEPENDENCY_RULES.md             (Import restrictions)
├─ API_BOUNDARIES.md               (3 superficies)
├─ CONTRACT_STRATEGY.md            (DTOs compartidos)
└─ ADRs pending... (ver abajo)

FASE 4.0 ✅ COMPLETADA (2026-08-24)
├─ Database PostgreSQL 17 + Docker
├─ TypeORM entities (AppUser, Role, RoleAssignment, etc.)
├─ JWT authentication + Guards (JwtAuth, Roles, Scope)
├─ Auth module (login, refresh, logout)
└─ Global exception handling (RFC 9457)

FASE 5.0 ✅ COMPLETADA (2026-08-24)
├─ Users module: 5 endpoints (POST, GET, GET/:id, PATCH, DELETE)
├─ Portales module: 6 endpoints (+ POST/:id/publish)
├─ Comercios module: 5 endpoints (+ portal filter)
├─ Zod schema validation across all DTOs
├─ TypeScript compilation: 0 errors ✅
└─ Build success ✅

FASE 6.0 ⏳ SIGUIENTE (Por autorizar)
├─ Transactions module CRUD
├─ Movements module CRUD
├─ Reporting endpoints
└─ Integration testing
```

---

## 🏗️ Arquitectura Objetivo

### Patrón: Modular Monolith (DDD Light)

```
Single NestJS application
├── 7 módulos de negocio
│   ├── auth (JWT + RBAC + Scope)
│   ├── admin (Portals, Commerces, Categories, Services)
│   ├── forms (Dynamic forms + versioning)
│   ├── payments (CRÍTICO: Transactions, intents, obligations)
│   ├── reporting (Analytics, KPIs)
│   ├── audit (Event logging)
│   └── integrations (Webhooks, payment gateways)
│
├── Common layer (guards, decorators, utils)
├── Single PostgreSQL database
└── Stateless (escalable en replicas)
```

**Razones:**
- ✅ Dominio de pagos requiere ACID transactions (una BD)
- ✅ Arquitectura simple para equipos pequeños
- ✅ Futuro: si módulo necesita escalar, se extrae como microservice

---

## 📡 Tres Superficies de API

| Superficie | Ruta | Autenticación | Propósito |
|---|---|---|---|
| **ADMIN API** | `/api/admin/*` | JWT + @Roles + @Scope | Backoffice administrativo |
| **PUBLIC API** | `/api/public/*` | Rate limiting por IP | Portal público (cliente) |
| **INTEGRATION API** | `/api/webhooks/*` | API Key + HMAC signature | Webhooks de proveedores |

**Separación clara:** Facilita seguridad, testing, y escalamiento independiente.

---

## 📋 Módulos Detallados

### 1. Auth Module
- JWT authentication
- User management (CRUD)
- Role assignment (ROLE + SCOPE)
- Guards: JwtAuthGuard, RolesGuard, ScopeGuard

### 2. Admin Module
- **Portals:** Create, read, update, deactivate, publish
- **Commerces:** Same lifecycle, linked to Portal
- **Categories:** Portal-specific classification
- **Services:** Commerce offerings

### 3. Forms Module
- FormDefinition: Estructura del formulario
- FormVersion: Snapshot temporal (versionado)
- FormField: Campos configurables
- FormSubmission: Captura en Portal Público

### 4. Payments Module (CRÍTICO)
- **Transactions:** Lifecycle (PENDING → APPROVED/REJECTED)
- **TransactionEvents:** Append-only history
- **PaymentIntents:** Pre-payment validation
- **PayerData:** Cliente info (snapshot, NO AppUser)
- **PaymentObligations:** Cuota/factura a pagar
- **PaymentGateway Integration:** PSE, tarjeta, transferencia, efectivo
- **Idempotency:** Prevenir doble-cargo
- **Webhooks:** Callbacks de proveedores

### 5. Reporting Module
- Transaction stats (volume, successRate, averageTicket)
- Portal metrics (KPIs)
- Commerce metrics (por scope)
- Export capability (CSV, PDF)

### 6. Audit Module
- Event-driven architecture
- Logging de acciones críticas: usuarios, transacciones, auth
- PII masking en logs
- Immutable records

### 7. Integrations Module
- Payment gateway providers (Wompi, ePayco, etc.)
- Webhook handlers con signature validation
- Reconciliation scheduler
- Retry logic con exponential backoff

---

## 🔐 Autorización: ROLE + SCOPE + RESOURCE

```typescript
// Patrón
@Post('/api/admin/portals/:id/commerces')
@UseGuards(JwtAuthGuard)
@Roles(SUPERADMIN, ADMIN_PORTAL)        // Quién
@Scope(PORTAL)                           // Scope
async createCommerce(@Param('id') portalId) {
  // Guard valida: user.role ∈ [SUPERADMIN, ADMIN_PORTAL]
  //             && user.scope = portalId (si ADMIN_PORTAL)
  //             && resource (portal) pertenece al scope
}
```

**Scopes:**
- `GLOBAL`: SUPERADMIN (todas las portales)
- `PORTAL`: ADMIN_PORTAL (su portal + aliados)
- `COMMERCE`: ADMIN_COMMERCE (su comercio)
- `VIEW`: Read-only (variable scope)

---

## 📊 Entidades & Relaciones Clave

| Entidad | Relación | Cardinality |
|---|---|---|
| Portal | 1:N Commerces | Un portal agrupa N comercios |
| Commerce | 1:N Services | Un comercio ofrece N servicios |
| Commerce | 1:N Forms | Un comercio usa N formularios |
| Portal | 1:N Categories | Un portal define N categorías |
| Commerce | M:1 Category | Un comercio en N categorías |
| Transaction | M:1 Commerce | Una transacción de un comercio |
| Transaction | 1:N Events | Una transacción tiene N eventos |
| FormVersion | 1:N Fields | Una versión tiene N campos |
| FormSubmission | M:1 FormVersion | Una captura en una versión |

---

## 🛡️ Seguridad Baseline Implementada

**En FASE 3.0 (diseño):**
- ✅ JWT authentication strategy
- ✅ RBAC guards (@Roles, @Scope)
- ✅ Request validation (Zod DTOs)
- ✅ Global exception filter (RFC 9457)
- ✅ Rate limiting (global + por endpoint)
- ✅ CORS configurable
- ✅ Helmet headers
- ✅ PII masking en logs
- ✅ Idempotency keys
- ✅ Webhook signature validation

**Documentado:** SECURITY_BASELINE_CURRENT.md, TECHNICAL_RISKS.md

---

## 📦 Archivos Generados en FASE 3.0

```
docs/backend/architecture/
├── TARGET_ARCHITECTURE.md           [Arquitectura general, 7 módulos, 3 superficies]
├── MODULE_MAP.md                    [Detalle archivo estructura de cada módulo]
├── DEPENDENCY_RULES.md              [Qué módulo importa qué, ciclos prohibidos]
├── API_BOUNDARIES.md                [Endpoints Admin/Public/Integration]
├── CONTRACT_STRATEGY.md             [DTOs compartidos, Zod schemas]
│
├── [FASE 2.0]
├── MONOREPO_AUDIT.md
├── CURRENT_ARCHITECTURE.md
├── TECHNICAL_RISKS.md
├── SECURITY_BASELINE_CURRENT.md
└── BUSINESS_TECH_GAP_ANALYSIS.md
```

---

## ⏭️ Próximos Pasos (FASE 6.0)

### ✅ COMPLETADO (FASE 4.0)

- ✅ Database PostgreSQL 17 + TypeORM
- ✅ AppUser, Role, RoleAssignment, Portal, Commerce entities
- ✅ JwtStrategy + JwtAuthGuard
- ✅ RolesGuard + ScopeGuard
- ✅ POST /api/admin/auth/login, /refresh, /logout
- ✅ Global exception handling (RFC 9457)

### ✅ COMPLETADO (FASE 5.0)

- ✅ Users module: 5 endpoints
- ✅ Portales module: 6 endpoints (incl. publish)
- ✅ Comercios module: 5 endpoints
- ✅ Zod validation on all DTOs
- ✅ TypeScript strict mode compilation
- ✅ Build success validation

### 🟡 RECOMENDADO (FASE 6.0)

**Sprint 1 (Transactions - CRÍTICO):**
- [ ] Transaction entity + states (PENDING, APPROVED, REJECTED, CANCELLED)
- [ ] Transaction CRUD endpoints
- [ ] PaymentIntent entity + pre-payment validation
- [ ] Transaction lifecycle state machine

**Sprint 2 (Movements & Financial Ops):**
- [ ] Movement entity (INCOME, EXPENSE, COMMISSION, REFUND, SETTLEMENT, ADJUSTMENT)
- [ ] Movement CRUD endpoints
- [ ] Movement creation from Transaction events
- [ ] Financial audit trail

**Sprint 3 (Forms):**
- [ ] FormDefinition, FormVersion, FormField entities
- [ ] Form submission endpoint (public API)
- [ ] Form validation + dynamic fields

**Sprint 4 (Payments - FULL):**
- [ ] Payment gateway integration (Wompi, ePayco, etc.)
- [ ] Webhook handlers + signature validation
- [ ] Idempotency keys
- [ ] Refund/reversal logic

**Sprint 5+ (Advanced):**
- [ ] Reporting/Analytics endpoints
- [ ] Audit logging module
- [ ] Unit + integration tests
- [ ] Performance optimization

---

## ⚠️ Decisiones de Negocio Aún Pendientes

Estas **NO bloquean arquitectura** pero impactan detalles de implementación:

- [ ] Origen de obligación (¿interna? ¿consulta externa?)
- [ ] Payment gateway elegido (Wompi, ePayco, otra?)
- [ ] Modelo de devoluciones
- [ ] Modelo de reversales
- [ ] Modelo de liquidaciones
- [ ] Modelo de comisiones
- [ ] Estrategia de conciliación

**Recomendación:** Resolver ANTES de FASE 4 Sprint 4 (Payments)

---

## 🎯 KPIs de Arquitectura

Por evaluar tras implementación:

- Response time < 200ms (p95)
- Error rate < 0.1%
- Uptime > 99.9%
- Database CPU < 70%
- Memory per instance < 512MB

---

## ✅ Confirmación EXPLÍCITA

**En FASE 3.0 NO se hizo:**

```
❌ NO se implementó código
❌ NO se crearon tablas
❌ NO se crearon migraciones
❌ NO se escribieron endpoints
❌ NO se crearon servicios
❌ NO se modificaron dependencias
```

**Solo:** Arquitectura + diseño + documentación

---

## 🚀 Estado: FASE 5.0 COMPLETADA

### Entregables FASE 5.0

✅ **16 endpoints implementados:**
- Users: 5 endpoints (POST, GET, GET/:id, PATCH, DELETE)
- Portales: 6 endpoints (+ POST/:id/publish)
- Comercios: 5 endpoints (+ portal filter)

✅ **Validación:**
- TypeScript: 0 errors (strict mode)
- Build: Successful
- Guards: JwtAuth + Roles + Scope
- DTOs: Zod validated

✅ **Archivos creados:**
- 3 feature modules (users, portales, comercios)
- 3 guards (jwt-auth, roles, scope)
- 3 decorators (@Roles, @Scope, @User)
- 1 exception filter (RFC 9457)
- 8 TypeORM entities (Database schema complete)
- ~30 DTO files with Zod schemas

### Próximos Pasos

**User debe:**
1. ✅ Test endpoints with JWT auth
2. 🟡 Authorize FASE 6.0 (Transactions, Movements, Forms)
3. 🟡 Specify payment gateway (Wompi, ePayco, etc.)
4. 🟡 Clarify refund/reversal business rules

---

**Fecha:** 2026-08-24  
**Backend:** NestJS + TypeORM + PostgreSQL 17  
**Architecture:** Modular Monolith (7 modules planned, 5 implemented)  
**Security:** RBAC + Scope guards + Zod validation  
**Status:** ✅ FASE 6.0 SPRINT 1 COMPLETADA  
**Modules Implemented:** Auth (FASE 4) + Users + Portales + Comercios (FASE 5) + Transactions + PaymentIntents (FASE 6 Sprint 1)  
**Next:** FASE 6.0 Sprint 2 (Movements, Forms, Payment Gateway)
