# DEPENDENCY_RULES.md — Module Dependencies & Imports

**Phase:** FASE 3.0  
**Date:** 2026-08-23

---

## Dependency Graph

```
┌─────────────────────────────────────────────────┐
│          COMMON LAYER (No dependencies)          │
│  (guards, decorators, pipes, filters, utils)    │
└─────────────────────┬───────────────────────────┘
                      ↑ All modules depend on COMMON
                      
┌─────────────────────────────────────────────────┐
│              AUTH MODULE (Independent)           │
│  (JWT, user management, roles, scope)           │
└─────────────────────┬───────────────────────────┘
                      ↑ Admin, Forms, Payments depend
                      
┌────────────┬────────────┬──────────────┬─────────┐
│  ADMIN     │   FORMS    │  PAYMENTS    │REPORTING│
│  (Portal,  │  (Dynamic  │  (Transact.) │ (Stats) │
│   Commerce)│   Forms)   │              │         │
└────────────┴────────────┴──────────────┴────┬────┘
                                              ↑
                                    ┌─────────────┐
                                    │AUDIT MODULE │
                                    │(Event logs) │
                                    └─────────────┘
```

---

## Import Rules

### ✅ PERMITIDO

1. **auth.module** puede ser importado por:
   - admin, forms, payments, reporting, integrations

2. **admin.module** (Portals, Commerces, etc.) puede ser importado por:
   - forms (FormDefinition enlazado a Service)
   - payments (Transaction enlazado a Commerce)
   - reporting (Queries usan Portal/Commerce)

3. **forms.module** puede ser importado por:
   - payments (Transaction captura FormSubmission)
   - reporting (Stats incluyen forms)

4. **payments.module** puede ser importado por:
   - reporting (Analytics de transactions)
   - integrations (Webhooks actualizan transactions)
   - audit (AuditEvents desde TransactionService)

5. **audit.module** escucha eventos pero NO importa otros módulos (event-driven)

### ❌ PROHIBIDO

```
// NO
imports: [PaymentsModule]  // en AdminModule
// Razón: Admin no depende de Payments internamente

// NO
imports: [AdminModule]     // en AuthModule
// Razón: Auth debe ser independent

// NO
imports: [IntegrationsModule]  // en cualquier módulo
// Razón: Integrations es solo consumed, no consumed
```

---

## Cyclic Dependency Prevention

**Patrón:** Shared DTOs en `packages/contracts` (futuro)

Si `admin/commerce.service` necesita hablar con `payments/transaction.service`:

```typescript
// ✅ OK: usar DTO público
export interface TransactionCreatedEvent {
  transactionId: string;
  commerceId: string;
  amount: number;
}

// ✓ En payments.service
this.eventBus.emit(new TransactionCreatedEvent(...));

// ✓ En admin.service (solo escucha eventos)
this.eventBus.on(TransactionCreatedEvent, (event) => {
  // Update commerceMetrics
});
```

---

## Import Statement Rules

```typescript
// ✅ OK: Import desde mismo módulo
import { CommerceService } from './commerce.service';

// ✅ OK: Import desde COMMON
import { JwtAuthGuard } from '@common/guards';

// ✅ OK: Import desde dependencia permitida
import { AuthService } from '@modules/auth';

// ✅ OK: Import entity/DTO para tipos
import { Commerce, CreateCommerceDto } from '@modules/admin/dtos';

// ❌ NO: Circular
import { AdminService } from '@modules/admin'; // in AuthModule

// ❌ NO: Cross-import
import { PrivateService } from '@modules/payments/private'; // in admin
```

---

## Module Exports

**Cada módulo define:**

```typescript
// auth.module.ts
@Module({
  providers: [AuthService, UsersService, JwtStrategy],
  exports: [AuthService, JwtAuthGuard, RolesGuard, ScopeGuard],
  // ❌ NO exportar: PrivateService, InternalHelper
})
export class AuthModule {}

// admin.module.ts
@Module({
  providers: [PortalService, CommerceService, CategoryService],
  exports: [PortalService, CommerceService],
  // ❌ Interno: RoleService, PermissionChecker
})
export class AdminModule {}
```

---

## Dependency Injection Pattern

```typescript
// ✅ Constructor injection
@Injectable()
export class CommerceService {
  constructor(
    private db: PrismaService,        // Database
    private authService: AuthService, // From auth module
    private eventBus: EventEmitter,   // Common service
  ) {}
}

// ❌ Service locator (antipattern)
constructor(private container: Container) {
  this.authService = container.get(AuthService);
}
```

---

## Teste & Mocking

**En tests,** puedes importar lo que necesites:

```typescript
describe('CommerceService', () => {
  beforeEach(() => {
    TestingModule.createTestingModule({
      providers: [CommerceService, { provide: PrismaService, useValue: mockDb }],
    });
  });
});
```

---

**Status:** Dependency rules defined, enforced during code review
