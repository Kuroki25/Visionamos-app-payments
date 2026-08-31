# TARGET_ARCHITECTURE.md — Red Coopagos Backend

**Phase:** FASE 3.0 — Arquitectura Objetivo  
**Date:** 2026-08-23  
**Status:** ARQUITECTURA PROPUESTA (sin implementación)  
**Architecture Pattern:** Modular Monolith orientado a dominios (DDD light)

---

## 1. PRINCIPIOS ARQUITECTÓNICOS

### 1.1 Filosofía

Red Coopagos requiere:
- ✅ **Separación clara** de dominios (Identidad, Portales, Pagos, Reportes)
- ✅ **Seguridad en capas** (Autenticación + Autorización en cada módulo)
- ✅ **Escalabilidad horizontal** (Sin estado en memoria, escalable en contenedores)
- ✅ **Mantenibilidad** (Módulos desacoplados, fácil testing)
- ✅ **Sin over-engineering** (Monolith modular, no microservicios innecesarios)

### 1.2 Decisión: Monolith Modular vs Microservicios

**Elegimos: MODULAR MONOLITH**

**Razones:**
- Dominio de pagos requiere transacciones ACID (una BD)
- Equipos pequeños en inicio
- Operación más simple
- Escalamiento se hace con replicas de la app, no microservicios
- Futuro: Si algún módulo necesita escalar independientemente, migramos a servicio

**Futuro (FASE 5+):**
Si PaymentGateway u otra integración crece, puede extraerse como servicio independiente sin romper el monolith.

### 1.3 Arquitectura interna: DDD Light

**No completo DDD,** pero sí:
- ✅ Bounded Contexts claros (módulos con límites definidos)
- ✅ Ubiquitous Language (Glosario de dominio respetado)
- ✅ Aggregate roots (Transaction, Portal, Commerce, etc.)
- ✅ Value Objects (Amount, PaymentMethod, DocumentNumber, etc.)
- ✅ Domain Events (TransactionApproved, UserCreated) para auditoría

**Evitamos ceremonial:** Sin Entities separadas de Repositories si es innecesario.

---

## 2. ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────────────────┐
│                        RED COOPAGOS NestJS                       │
│                         (Modular Monolith)                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┬──────────────────────┬──────────────────┐
│   PRESENTACIÓN        │   BUSINESS LOGIC     │  PERSISTENCIA    │
│   (Controllers)       │   (Services)         │  (Database)      │
├──────────────────────┼──────────────────────┼──────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │         MÓDULO 1: Identity & Access Control            │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ Controllers: AuthController, UsersController           │   │
│  │ Services: AuthService, UsersService, RoleService       │   │
│  │ Guards: JwtAuthGuard, RolesGuard, ScopeGuard          │   │
│  │ Entities: AppUser, Role, RoleAssignment               │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  MÓDULO 2: Administration (Network)                    │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ Controllers: PortalsController, CommercesController    │   │
│  │ Services: PortalService, CommerceService, Category..   │   │
│  │ Entities: Portal, Commerce, Category, Service          │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  MÓDULO 3: Dynamic Forms                              │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ Controllers: FormsController, SubmissionsController    │   │
│  │ Services: FormService, SubmissionService              │   │
│  │ Entities: FormDef, FormVersion, FormField, Submission │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  MÓDULO 4: Payments (CRÍTICO)                          │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ Controllers: TransactionsController, ObligationCtrl    │   │
│  │ Services: TransactionService, PaymentIntentService     │   │
│  │ Entities: Transaction, TransactionEvent, PayerData     │   │
│  │ Domain Events: TransactionCreated, Approved, Rejected  │   │
│  │ Value Objects: Amount, PaymentMethod                   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  MÓDULO 5: Reporting & Analytics                       │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ Controllers: ReportsController                         │   │
│  │ Services: ReportService (queries de analytics)        │   │
│  │ Queries: TransactionStats, PortalMetrics              │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  MÓDULO 6: Audit & Compliance                          │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ Services: AuditService (event logging)                │   │
│  │ Listeners: Event listeners que capturan eventos       │   │
│  │ Entities: AuditEvent                                   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  MÓDULO 7: Integrations & Webhooks                     │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ Controllers: WebhooksController                        │   │
│  │ Services: WebhookService, PaymentGatewayService       │   │
│  │ Providers: External APIs (payment providers)           │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              COMMON / CROSS-CUTTING                    │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ Guards: JwtAuthGuard, RolesGuard, ScopeGuard          │   │
│  │ Decorators: @Roles, @Scope, @User, @Audit            │   │
│  │ Pipes: ValidationPipe (Zod)                            │   │
│  │ Filters: AllExceptionsFilter (RFC 9457)               │   │
│  │ Interceptors: LoggingInterceptor, TransformInterceptor│   │
│  │ Middleware: RequestIdMiddleware, RequestLoggingMiddle │   │
│  │ Utilities: CryptUtils, DateUtils, FormattingUtils    │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER (PostgreSQL)                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Tables: users, roles, portals, commerces, transactions,   │ │
│  │         forms, submissions, audit_events, etc.            │ │
│  │ Relationships: One-to-Many, Many-to-One, Many-to-Many    │ │
│  │ Indexes: Performance optimization                         │ │
│  │ Constraints: Referential integrity, unique constraints   │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. MÓDULOS DETALLADOS

### 3.1 Identity & Access Control

**Responsabilidad:** Autenticación y autorización

**Exports público:**
```typescript
export { AuthService }
export { UsersService }
export { JwtAuthGuard }
export { RolesGuard }
export { ScopeGuard }
export { AppUser, Role, RoleAssignment } // Entidades
```

**Subdivisión interna:**
```
modules/auth/
├── auth.controller.ts         // POST /api/admin/auth/login, /logout
├── auth.service.ts            // JWT generation, validation
├── jwt.strategy.ts            // Passport JWT strategy
├── jwt-auth.guard.ts          // Global guard
├── roles.guard.ts             // @Roles decorator validation
├── scope.guard.ts             // @Scope decorator validation
├── users.controller.ts        // User CRUD
├── users.service.ts           // User management
├── entities/
│   ├── app-user.entity.ts
│   ├── role.entity.ts
│   └── role-assignment.entity.ts
└── dto/
    ├── login.dto.ts
    ├── create-user.dto.ts
    └── update-user.dto.ts
```

**Características clave:**
- JwtStrategy con TypeORM/Prisma
- Guards que validan: autenticación + roles + scope
- Password hashing (bcrypt)
- Refresh token support
- User activation/deactivation (soft delete)

---

### 3.2 Administration (Portals, Commerces, Categories, Services)

**Responsabilidad:** CRUD de entidades administrativas

**Exports público:**
```typescript
export { PortalService }
export { CommerceService }
export { CategoryService }
export { ServiceService }
```

**Subdivisión:**
```
modules/admin/
├── portals/
│   ├── portals.controller.ts
│   ├── portals.service.ts
│   ├── entities/portal.entity.ts
│   └── dto/*.dto.ts
├── commerces/
│   ├── commerces.controller.ts
│   ├── commerces.service.ts
│   ├── entities/commerce.entity.ts
│   └── dto/*.dto.ts
├── categories/
│   ├── categories.controller.ts
│   ├── categories.service.ts
│   ├── entities/category.entity.ts
│   └── dto/*.dto.ts
└── services/
    ├── services.controller.ts
    ├── services.service.ts
    ├── entities/service.entity.ts
    └── dto/*.dto.ts
```

**Características:**
- Scope validation en cada controller (ADMIN_PORTAL ve solo su portal)
- Soft delete para entidades principales
- Publication/unpublication flow
- Relationships: Portal 1:N Commerce, Commerce 1:N Category

---

### 3.3 Dynamic Forms

**Responsabilidad:** Captura y gestión de formularios dinámicos

**Exports público:**
```typescript
export { FormService }
export { FormSubmissionService }
```

**Subdivisión:**
```
modules/forms/
├── forms.controller.ts        // GET/POST /api/admin/forms
├── forms.service.ts
├── submissions.controller.ts   // GET /api/public/form-submissions
├── submissions.service.ts
├── entities/
│   ├── form-definition.entity.ts
│   ├── form-version.entity.ts
│   ├── form-field.entity.ts
│   └── form-submission.entity.ts
└── dto/
    ├── create-form.dto.ts
    ├── form-field.dto.ts
    └── submit-form.dto.ts
```

**Características:**
- Versionado temporal (FormVersion)
- Campos configurables (FormField)
- Validaciones por campo
- Publicación de versiones
- Captura en Portal Público (sin autenticación)

---

### 3.4 Payments (CRÍTICO)

**Responsabilidad:** Transacciones, pagos, obligaciones

**Exports público:**
```typescript
export { TransactionService }
export { PaymentIntentService }
export { PaymentGatewayService }
```

**Subdivisión:**
```
modules/payments/
├── transactions/
│   ├── transactions.controller.ts       // Admin + Public
│   ├── transactions.service.ts
│   ├── transaction-lifecycle.service.ts // State machine
│   ├── entities/
│   │   ├── transaction.entity.ts
│   │   ├── transaction-event.entity.ts
│   │   └── payer-data.entity.ts
│   └── dto/*.dto.ts
├── payment-intents/
│   ├── payment-intent.service.ts
│   └── entities/payment-intent.entity.ts
├── obligations/
│   ├── obligation.service.ts            // Consulta externa
│   └── entities/payment-obligation.entity.ts
├── payment-gateway/
│   ├── payment-gateway.service.ts       // Integración proveedores
│   ├── providers/
│   │   ├── pse-provider.ts
│   │   ├── card-provider.ts
│   │   └── transfer-provider.ts
│   └── webhooks.controller.ts           // Callbacks
├── idempotency/
│   ├── idempotency.service.ts           // Deduplicación
│   └── idempotency.interceptor.ts
└── financial-adjustments/
    ├── adjustments.service.ts           // Devoluciones, reversales
    └── entities/financial-adjustment.entity.ts
```

**Características:**
- State machine: PENDING → PROCESSING → APPROVED/REJECTED
- TransactionEvent para auditoría
- PaymentIntent para validación pre-pago
- Idempotency keys para prevenir doble-cargo
- Webhook signature validation
- Rate limiting por usuario/IP en public endpoints

---

### 3.5 Reporting & Analytics

**Responsabilidad:** Reportes, KPIs, métricas

**Exports público:**
```typescript
export { ReportService }
```

**Subdivisión:**
```
modules/reporting/
├── reports.controller.ts
├── reports.service.ts
├── queries/
│   ├── transaction-stats.query.ts
│   ├── portal-metrics.query.ts
│   ├── commerce-metrics.query.ts
│   └── user-activity.query.ts
└── dto/*.dto.ts
```

**Características:**
- Queries optimizadas (aggregations en DB)
- Scope filtering (ADMIN_PORTAL ve solo su portal)
- Date range filtering
- Export capability (CSV, PDF)

---

### 3.6 Audit & Compliance

**Responsabilidad:** Logging de eventos para auditoría

**Exports público:**
```typescript
export { AuditService }
```

**Subdivisión:**
```
modules/audit/
├── audit.service.ts           // Event listener
├── entities/audit-event.entity.ts
├── listeners/
│   ├── transaction-audit.listener.ts
│   ├── user-audit.listener.ts
│   └── auth-audit.listener.ts
└── dto/audit-event.dto.ts
```

**Características:**
- Event-driven (escucha eventos de otros módulos)
- Logging de: usuario, acción, recurso, scope, resultado
- PII masking en logs
- Immutable (no se puede editar audit events)

---

### 3.7 Integrations & Webhooks

**Responsabilidad:** Integraciones con sistemas externos

**Exports público:**
```typescript
export { WebhookService }
export { PaymentGatewayService }
```

**Subdivisión:**
```
modules/integrations/
├── webhooks/
│   ├── webhooks.controller.ts
│   ├── webhooks.service.ts
│   ├── signature-validation.ts
│   └── retry.strategy.ts
├── payment-gateways/
│   ├── payment-gateway.service.ts
│   ├── providers/
│   │   ├── base-provider.abstract.ts
│   │   ├── wompi-provider.ts       // Ejemplo
│   │   └── epayco-provider.ts      // Ejemplo
│   └── dto/*.dto.ts
└── reconciliation/
    ├── reconciliation.service.ts
    └── reconciliation.scheduler.ts
```

**Características:**
- Signature validation (HMAC)
- Retry logic con exponential backoff
- Webhook queuing (para no bloquear)
- Conciliación automática

---

## 4. CROSS-CUTTING CONCERNS (Common Layer)

```
src/common/
├── guards/
│   ├── jwt-auth.guard.ts       // Valida JWT presente y válido
│   ├── roles.guard.ts          // Valida @Roles()
│   └── scope.guard.ts          // Valida @Scope() + resource ownership
├── decorators/
│   ├── roles.decorator.ts      // @Roles(SUPERADMIN, ADMIN_PORTAL)
│   ├── scope.decorator.ts      // @Scope(PORTAL, COMMERCE)
│   ├── user.decorator.ts       // @User() para extraer usuario
│   └── audit.decorator.ts      // @Audit() para marcar para auditoría
├── pipes/
│   ├── validation.pipe.ts      // Valida DTOs con Zod
│   └── parse-int.pipe.ts
├── filters/
│   └── all-exceptions.filter.ts // Captura todos los errores, formatea RFC 9457
├── interceptors/
│   ├── logging.interceptor.ts  // Log de requests/responses
│   ├── transform.interceptor.ts // Transforma responses
│   ├── idempotency.interceptor.ts
│   └── timeout.interceptor.ts
├── middleware/
│   ├── request-id.middleware.ts
│   ├── request-logging.middleware.ts
│   └── cors-options.middleware.ts
└── utilities/
    ├── crypto.util.ts
    ├── date.util.ts
    ├── formatting.util.ts
    └── pii-masking.util.ts
```

---

## 5. TRES SUPERFICIES DE API

### 5.1 ADMIN API (`/api/admin/*`)

**Protección:** JWT + @Roles + @Scope

**Endpoints ejemplares:**
```
POST   /api/admin/auth/login              (sin auth, login)
POST   /api/admin/auth/logout             (con auth)
GET    /api/admin/users                   (SUPERADMIN)
POST   /api/admin/users                   (SUPERADMIN)
PUT    /api/admin/users/:id               (SUPERADMIN/ADMIN_PORTAL)
GET    /api/admin/portals                 (filtra por scope)
POST   /api/admin/portals                 (SUPERADMIN)
GET    /api/admin/portals/:id/commerces   (ADMIN_PORTAL de ese portal)
POST   /api/admin/portals/:id/commerces   (ADMIN_PORTAL)
GET    /api/admin/reports/transactions    (filtra por scope)
```

**Guard pipeline:**
```
JwtAuthGuard (verifica JWT)
  ↓
RolesGuard (verifica @Roles si está presente)
  ↓
ScopeGuard (verifica @Scope y pertenencia del recurso)
  ↓
Controller
```

### 5.2 PUBLIC API (`/api/public/*`)

**Protección:** NONE (opcional: rate limiting por IP)

**Endpoints ejemplares:**
```
GET    /api/public/portals                (solo published)
GET    /api/public/portals/:id
GET    /api/public/commerces/:id
GET    /api/public/services/:id
GET    /api/public/forms/:id/version/:v
POST   /api/public/form-submissions       (captura datos)
POST   /api/public/transactions/intent    (crea PaymentIntent)
POST   /api/public/transactions/:id/pay   (inicia pago)
GET    /api/public/transactions/:id       (cliente ve estado)
```

**Guard pipeline:**
```
ThrottlerGuard (rate limit por IP)
  ↓
Controller
```

### 5.3 INTEGRATION API (`/api/webhooks/*`, `/api/integrations/*`)

**Protección:** Signature validation (HMAC) + API Key

**Endpoints ejemplares:**
```
POST   /api/webhooks/payment-gateway      (callbacks de proveedor)
POST   /api/webhooks/reconciliation       (confirmaciones)
GET    /api/integrations/payment-methods  (lookup)
```

---

## 6. DATA FLOW

### 6.1 Admin: Create Commerce Flow

```
Client (admin UI)
  ↓
POST /api/admin/portals/portal-123/commerces
  ↓
CommercesController
  ├─ JwtAuthGuard: token válido?
  ├─ RolesGuard: @Roles(SUPERADMIN, ADMIN_PORTAL)?
  ├─ ScopeGuard: @Scope(PORTAL) + portalId = user.portalId?
  ↓
CommerceService.create(createCommerceDto)
  ├─ Valida: nombre, tipo, identificación
  ├─ Verifica: Portal existe y pertenece al scope
  ├─ Inserta: commerce en DB
  ├─ Emite evento: CommerceCreated
  ↓
AuditListener captura evento
  ├─ Loguea: user, action, resource, scope, timestamp
  ↓
Response: 201 Created { id, name, ... }
```

### 6.2 Public: Pay Flow

```
Client (portal público)
  ↓
POST /api/public/form-submissions
  ├─ FormSubmission { formId, values: {...} }
  ↓
SubmissionController
  ├─ ThrottlerGuard (rate limit por IP)
  ├─ Valida estructura según FormVersion
  ↓
FormService.saveSubmission()
  ├─ Persiste: FormSubmission
  ↓
POST /api/public/transactions/intent
  ├─ PaymentIntentDto { obligationId, amount, method, ... }
  ↓
TransactionController
  ├─ ThrottlerGuard
  ├─ Valida: amount vs obligation
  ├─ Crea: PaymentIntent (pre-payment validation)
  ↓
TransactionService.createIntent()
  ├─ Verifica obligación (externa o interna)
  ├─ Inserta: Transaction (PENDING)
  ├─ Inserta: PaymentIntent
  ↓
POST /api/public/transactions/trans-123/pay
  ├─ Usa intent (validation + idempotency key)
  ├─ Llama: PaymentGatewayService
  ↓
PaymentGatewayService.charge()
  ├─ Elige provider (PSE, card, etc.)
  ├─ Ejecuta: external API call
  ├─ Obtiene: response (approved/rejected)
  ↓
TransactionService.updateTransaction()
  ├─ Transición de estado: PENDING → APPROVED/REJECTED
  ├─ Emite evento: TransactionApproved/Rejected
  ├─ Crea: TransactionEvent (auditoría)
  ↓
AuditListener captura evento
  ↓
ReportService.updateMetrics() (async)
  ├─ Actualiza: KPIs de commerce/portal
  ↓
Response: { status, reference, ... }
```

---

## 7. PATRONES DE IMPLEMENTACIÓN

### 7.1 Service Pattern

```typescript
// commerce.service.ts
@Injectable()
export class CommerceService {
  constructor(private db: PrismaService) {}

  async create(portalId: string, dto: CreateCommerceDto): Promise<Commerce> {
    // Validar portal existe
    const portal = await this.db.portal.findUnique({ where: { id: portalId } });
    if (!portal) throw new NotFoundException('Portal no encontrado');

    // Crear commerce
    const commerce = await this.db.commerce.create({
      data: { portalId, ...dto },
    });

    // Emitir evento para auditoría
    this.eventBus.emit(new CommerceCreatedEvent(commerce));

    return commerce;
  }
}
```

### 7.2 Guard Pattern

```typescript
// scope.guard.ts
@Injectable()
export class ScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: AppUser = request.user;
    const { portalId } = request.params;

    // ADMIN_PORTAL solo puede ver su portal
    if (user.role === 'ADMIN_PORTAL' && user.scope !== portalId) {
      throw new ForbiddenException('No tienes acceso a este portal');
    }

    return true;
  }
}
```

### 7.3 Exception Pattern (RFC 9457)

```typescript
// all-exceptions.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ExecutionContext) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status = 500;
    let detail = 'Error interno del servidor';

    if (exception instanceof BadRequestException) {
      status = 400;
      detail = exception.message;
    } else if (exception instanceof UnauthorizedException) {
      status = 401;
    }

    // RFC 9457 Problem Details
    response.status(status).json({
      type: 'about:blank',
      status: status,
      title: exception.name || 'Error',
      detail: detail,
      instance: request.url,
    });
  }
}
```

---

## 8. DECISIONES CLAVE

| Decision | Choice | Justification |
|---|---|---|
| **Architecture** | Modular Monolith | Single DB, easier ops, can split later |
| **ORM** | Prisma (recomendado) | Better DX, TypeScript-first, migrations simple |
| **Database** | PostgreSQL | ACID transactions needed, mature, scalable |
| **Admin/Public split** | `/api/admin/*` vs `/api/public/*` | Clear separation, easier auth/authz |
| **DDD depth** | Light (no repositories pattern) | Avoid over-engineering, direct service usage |
| **Testing** | Unit + Integration | E2E too slow for CI/CD |
| **Logging** | Winston + structured | Observability, PII masking easy |
| **Error format** | RFC 9457 Problem Details | Standard, client-friendly |

---

## 9. ESCALAMIENTO FUTURO

Si en el futuro necesitamos escalar:

### Opción A: Replicas del Monolith
```
Load Balancer
  ├─ NestJS Instance 1 (puerto 3002)
  ├─ NestJS Instance 2 (puerto 3002)
  └─ NestJS Instance N (puerto 3002)
  ↓
  Shared PostgreSQL (con connection pooling)
```
**Sin cambios arquitectónicos.** Estateless app.

### Opción B: Extract Payment Service
Si PaymentGateway necesita escalar independientemente:
```
Admin Monolith ↔ Payment Service (microservice)
                ↔ Queue (RabbitMQ/Redis)
```
**Cuando tenga justificación.**

---

## 10. PRÓXIMOS PASOS (FASE 3 continuación)

1. ✅ TARGET_ARCHITECTURE.md (ESTE DOCUMENTO)
2. → MODULE_MAP.md (detalles de módulos)
3. → DEPENDENCY_RULES.md (qué depende de qué)
4. → API_BOUNDARIES.md (admin/public/integration endpoints)
5. → CONTRACT_STRATEGY.md (DTOs compartidos)
6. → ADR-*.md (Architecture Decision Records)

---

**Status:** Arquitectura propuesta, sin implementación  
**Siguiente:** Revisar y validar esta propuesta con user
