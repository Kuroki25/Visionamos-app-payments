# MODULE_MAP.md — Red Coopagos Backend Modules

**Phase:** FASE 3.0 — Arquitectura Objetivo  
**Date:** 2026-08-23  
**Status:** Mapeo de módulos (sin implementación)

---

## Estructura de Módulos NestJS

```
src/
├── modules/
│   ├── auth/                          [Authentication & Authorization]
│   ├── admin/                         [Portal, Commerce, Category, Service CRUD]
│   ├── forms/                         [Dynamic Forms]
│   ├── payments/                      [Transactions, Payments, Obligations]
│   ├── reporting/                     [Reports & Analytics]
│   ├── audit/                         [Audit Event Logging]
│   ├── integrations/                  [Webhooks & External APIs]
│   └── app.module.ts                 [Root module that imports all]
│
├── common/
│   ├── guards/
│   ├── decorators/
│   ├── pipes/
│   ├── filters/
│   ├── interceptors/
│   ├── middleware/
│   └── utils/
│
├── database/
│   ├── entities/
│   ├── migrations/
│   └── config/
│
├── config/
│   ├── env.validation.ts             [Zod validation de .env]
│   ├── database.config.ts
│   └── auth.config.ts
│
└── main.ts
```

---

## Módulo 1: auth (`modules/auth/`)

**Responsabilidad:** JWT authentication, user management, roles/scopes

**Archivo estructura:**
```
modules/auth/
├── auth.module.ts
├── auth.controller.ts                POST /api/admin/auth/login, POST /logout
├── auth.service.ts                   JWT generation, validation
├── jwt.strategy.ts                   Passport JWT strategy
├── jwt-auth.guard.ts                 @UseGuards(JwtAuthGuard)
├── roles.guard.ts                    @UseGuards(RolesGuard)
├── scope.guard.ts                    @UseGuards(ScopeGuard)
├── users/
│   ├── users.controller.ts           GET /api/admin/users, POST, PUT, PATCH
│   ├── users.service.ts              CRUD + role assignment
│   ├── role.service.ts               Manage roles
│   └── role-assignment.service.ts    Assign role+scope to user
├── entities/
│   ├── app-user.entity.ts            id, email, password, role, status, createdAt
│   ├── role.entity.ts                id, name (SUPERADMIN, ADMIN_PORTAL, etc.)
│   └── role-assignment.entity.ts     userId, roleId, scope (portalId, commerceId)
├── dto/
│   ├── login.dto.ts                  { email, password }
│   ├── login-response.dto.ts         { access_token, user }
│   ├── create-user.dto.ts            { email, password, role, scope }
│   ├── update-user.dto.ts            { email, status }
│   └── assign-role.dto.ts            { roleId, scope }
└── constants/
    └── roles.constant.ts             export const ROLES = { ... }
```

**Exports:**
```typescript
export { AuthService, UsersService, JwtAuthGuard, RolesGuard, ScopeGuard }
export { AppUser, Role, RoleAssignment }
```

**Key methods:**
- `AuthService.login(email, password)` → JWT token
- `UsersService.create(dto)` → New user
- `UsersService.assignRole(userId, roleId, scope)` → Role + scope assignment
- Guards validate on each request

---

## Módulo 2: admin (`modules/admin/`)

**Responsabilidad:** Portal, Commerce, Category, Service CRUD

**Subdivisión por dominio:**

### 2.1 Portals (`admin/portals/`)
```
modules/admin/portals/
├── portals.module.ts
├── portals.controller.ts             GET/POST/PUT /api/admin/portals
├── portals.service.ts                CRUD + publication
├── entities/portal.entity.ts          id, name, description, logo, status, published
├── dto/
│   ├── create-portal.dto.ts
│   ├── update-portal.dto.ts
│   └── publish-portal.dto.ts
└── guards/
    └── portal-scope.guard.ts          Valida que ADMIN_PORTAL sea dueño
```

### 2.2 Commerces (`admin/commerces/`)
```
modules/admin/commerces/
├── commerces.module.ts
├── commerces.controller.ts           GET/POST/PUT /api/admin/portals/:id/commerces
├── commerces.service.ts              CRUD + publication
├── entities/commerce.entity.ts        id, portalId, name, type, status, published
├── dto/
│   ├── create-commerce.dto.ts
│   ├── update-commerce.dto.ts
│   └── publish-commerce.dto.ts
└── guards/
    └── commerce-scope.guard.ts        ADMIN_PORTAL/ADMIN_COMMERCE validation
```

### 2.3 Categories (`admin/categories/`)
```
modules/admin/categories/
├── categories.module.ts
├── categories.controller.ts          GET/POST/PUT /api/admin/portals/:id/categories
├── categories.service.ts             CRUD (portal-specific)
├── entities/category.entity.ts       id, portalId, name, description
└── dto/*.dto.ts
```

### 2.4 Services (`admin/services/`)
```
modules/admin/services/
├── services.module.ts
├── services.controller.ts            GET/POST/PUT /api/admin/commerces/:id/services
├── services.service.ts               CRUD (per commerce)
├── entities/service.entity.ts        id, commerceId, name, description
└── dto/*.dto.ts
```

**Module dependencies:**
```
admin.module.ts imports:
  ├── PortalsModule
  ├── CommercesModule
  ├── CategoriesModule
  └── ServicesModule
```

---

## Módulo 3: forms (`modules/forms/`)

**Responsabilidad:** Dynamic form definition, versioning, submission

**Archivo estructura:**
```
modules/forms/
├── forms.module.ts
├── forms/
│   ├── forms.controller.ts           GET/POST /api/admin/forms, /api/public/forms/:id
│   ├── forms.service.ts              CRUD + publish
│   ├── entities/
│   │   ├── form-definition.entity.ts  id, commerceId, name, description, serviceId
│   │   ├── form-version.entity.ts     id, formId, version, fields, published
│   │   └── form-field.entity.ts       id, formVersionId, name, type, required, order
│   └── dto/*.dto.ts
├── submissions/
│   ├── submissions.controller.ts     POST /api/public/form-submissions
│   ├── submissions.service.ts        Save submission
│   ├── entities/form-submission.entity.ts  id, formVersionId, values, timestamp
│   └── dto/submit-form.dto.ts
└── validators/
    └── form-validator.ts             Valida values vs FormVersion fields
```

**Key entities:**
- `FormDefinition`: Meta de formulario
- `FormVersion`: Snapshot temporal (para histórico)
- `FormField`: Campos configurables
- `FormSubmission`: Datos capturados del pagador

---

## Módulo 4: payments (`modules/payments/`)

**Responsabilidad:** CRÍTICO — Transacciones, pagos, obligaciones

**Subdivisión compleja:**

### 4.1 Transactions (`payments/transactions/`)
```
modules/payments/transactions/
├── transactions.controller.ts
├── transactions.service.ts
├── transaction-lifecycle.service.ts   [State machine: PENDING→PROCESSING→APPROVED/REJECTED]
├── entities/
│   ├── transaction.entity.ts          [id, portalId, commerceId, amount, status, ...]
│   └── transaction-event.entity.ts    [Append-only history]
└── dto/
    ├── create-transaction.dto.ts      [Admin & Public]
    └── update-transaction-status.dto.ts
```

### 4.2 Payment Intents (`payments/payment-intents/`)
```
modules/payments/payment-intents/
├── payment-intent.service.ts
├── entities/payment-intent.entity.ts  [id, transactionId, amount, intent data]
└── dto/create-payment-intent.dto.ts
```

**Purpose:** Validar transaction antes de ejecutar pago (prevent tampering)

### 4.3 PayerData (`payments/payer-data/`)
```
modules/payments/payer-data/
├── payer-data.service.ts
├── entities/payer-data.entity.ts      [id, documentType, documentNumber, email, ...]
└── dto/payer-data.dto.ts
```

**CRÍTICO:** NO es AppUser, es snapshot de cliente

### 4.4 Obligations (`payments/obligations/`)
```
modules/payments/obligations/
├── obligation.service.ts              [Consulta externa o interna]
├── entities/payment-obligation.entity.ts
└── providers/
    └── obligation.provider.interface.ts [Interface para múltiples proveedores]
```

### 4.5 Payment Gateway (`payments/payment-gateway/`)
```
modules/payments/payment-gateway/
├── payment-gateway.service.ts         [Orquesta integraciones]
├── providers/
│   ├── payment-provider.interface.ts
│   ├── pse-provider.ts
│   ├── card-provider.ts
│   ├── transfer-provider.ts
│   └── cash-provider.ts
└── dto/
    └── charge-request.dto.ts          [{ amount, method, obligationId, ... }]
```

### 4.6 Idempotency (`payments/idempotency/`)
```
modules/payments/idempotency/
├── idempotency.service.ts            [Deduplicación por Idempotency-Key]
├── idempotency.interceptor.ts
└── entities/idempotency-key.entity.ts [key, result, createdAt]
```

**Prevent:** Double-charging (crítico)

### 4.7 Financial Adjustments (`payments/adjustments/`)
```
modules/payments/adjustments/
├── adjustments.service.ts
├── entities/financial-adjustment.entity.ts  [type: REFUND, REVERSAL, SETTLEMENT, ...]
└── dto/create-adjustment.dto.ts
```

---

## Módulo 5: reporting (`modules/reporting/`)

**Responsabilidad:** Reports, KPIs, metrics

**Archivo estructura:**
```
modules/reporting/
├── reporting.module.ts
├── reports/
│   ├── reports.controller.ts         GET /api/admin/reports
│   ├── reports.service.ts
│   └── dto/report-query.dto.ts
├── queries/
│   ├── transaction-stats.query.ts     [Aggregations]
│   ├── portal-metrics.query.ts        [volume, successRate, ...]
│   └── commerce-metrics.query.ts
└── exports/
    └── export.service.ts              [CSV, PDF]
```

**Key feature:** Scope filtering (ADMIN_PORTAL sees only own portal)

---

## Módulo 6: audit (`modules/audit/`)

**Responsabilidad:** Event logging for compliance

**Archivo estructura:**
```
modules/audit/
├── audit.module.ts
├── audit.service.ts                  [Event listener]
├── entities/audit-event.entity.ts    [id, actor, action, resource, scope, result]
├── listeners/
│   ├── transaction-audit.listener.ts
│   ├── user-audit.listener.ts
│   └── auth-audit.listener.ts
└── dto/audit-event.dto.ts
```

**Key feature:** Immutable, PII masking

---

## Módulo 7: integrations (`modules/integrations/`)

**Responsabilidad:** External webhooks, payment gateways, reconciliation

**Archivo estructura:**
```
modules/integrations/
├── integrations.module.ts
├── webhooks/
│   ├── webhooks.controller.ts        POST /api/webhooks/payment-gateway
│   ├── webhooks.service.ts
│   ├── signature-validator.ts        [HMAC validation]
│   └── retry.strategy.ts
├── reconciliation/
│   ├── reconciliation.service.ts
│   └── reconciliation.scheduler.ts   [Cron job]
└── dto/webhook-payload.dto.ts
```

---

## Common Layer (`src/common/`)

**Reutilizable en todos los módulos:**

```
common/
├── guards/
│   ├── jwt-auth.guard.ts            [Verifica JWT válido]
│   ├── roles.guard.ts               [Valida @Roles()]
│   ├── scope.guard.ts               [Valida @Scope() + ownership]
│   └── throttle.guard.ts            [Rate limiting]
├── decorators/
│   ├── roles.decorator.ts           [@Roles(SUPERADMIN, ...)]
│   ├── scope.decorator.ts           [@Scope(PORTAL, COMMERCE)]
│   ├── user.decorator.ts            [@User() → AppUser]
│   └── audit.decorator.ts           [@Audit() → log event]
├── pipes/
│   ├── validation.pipe.ts           [Zod validation]
│   └── parse-int.pipe.ts
├── filters/
│   └── all-exceptions.filter.ts     [RFC 9457 Problem Details]
├── interceptors/
│   ├── logging.interceptor.ts       [Request/response logging]
│   ├── transform.interceptor.ts     [Formato respuestas]
│   ├── idempotency.interceptor.ts   [Idempotency key]
│   └── timeout.interceptor.ts       [Request timeout]
├── middleware/
│   ├── request-id.middleware.ts     [Generate Request ID]
│   └── request-logging.middleware.ts
└── utils/
    ├── crypto.util.ts               [Hash, encrypt, etc.]
    ├── date.util.ts                 [Formatting, timezone]
    ├── formatting.util.ts           [COP amounts, percentages]
    └── pii-masking.util.ts          [Mask sensitive data in logs]
```

---

## Database Layer (`src/database/`)

```
database/
├── entities/                         [ORM models (Prisma schema)]
│   ├── app-user.entity.ts
│   ├── role.entity.ts
│   ├── portal.entity.ts
│   ├── commerce.entity.ts
│   ├── category.entity.ts
│   ├── service.entity.ts
│   ├── form-definition.entity.ts
│   ├── form-submission.entity.ts
│   ├── transaction.entity.ts
│   ├── payer-data.entity.ts
│   ├── payment-obligation.entity.ts
│   ├── audit-event.entity.ts
│   └── [más]
├── migrations/
│   ├── 001_init.sql
│   ├── 002_add_auth.sql
│   ├── 003_add_payments.sql
│   └── [...]
└── seeds/
    └── seed.ts                      [Initial data: SUPERADMIN, test portals]
```

---

## Dependency Graph (Simplificado)

```
auth (independent)
  ↓
admin (depends: auth)
  ├─ forms (depends: auth, admin)
  ├─ payments (depends: auth, admin, forms)
  ├─ reporting (depends: auth, admin, payments)
  ├─ audit (depends: all modules via event listeners)
  └─ integrations (depends: payments)
```

**Rule:** Lower modules no pueden importar upper modules (prevent cycles)

---

## Root AppModule

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ validate: envSchema }),
    TypeOrmModule.forRoot(databaseConfig),
    AuthModule,
    AdminModule,
    FormsModule,
    PaymentsModule,
    ReportingModule,
    AuditModule,
    IntegrationsModule,
  ],
})
export class AppModule {}
```

---

**Status:** Module map defined, ready for implementation in FASE 4.0
