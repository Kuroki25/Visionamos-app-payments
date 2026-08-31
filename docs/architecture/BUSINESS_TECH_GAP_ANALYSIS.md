# BUSINESS_TECH_GAP_ANALYSIS.md — Red Coopagos

**Status:** FASE 2.0 — Auditoría Completada  
**Fecha:** 2026-08-23  
**Propósito:** Comparar requerimientos funcionales vs implementación actual

---

## Análisis de Gaps

Formato: **REQUERIMIENTO | FUENTE | IMPLEMENTACIÓN ACTUAL | STATUS | GAP | RIESGO/IMPACTO**

### I. Identity & Access Control

| Requerimiento | Fuente | Actual | Status | Gap | Riesgo |
|---|---|---|---|---|---|
| AppUser: Entidad usuario administrativo | DOMAIN_MODEL.md | ✅ Tipos en admin mocks | PARTIAL | Sin tabla, sin ORM, sin endpoints GET/POST/PUT | CRÍTICO: Sin usuarios, sin login |
| Roles: SUPERADMIN | ROLE_PERMISSION_MATRIX.md | ✅ Enum en admin | PARTIAL | Sin validación backend, sin storage | CRÍTICO: Sin autorización |
| Roles: ADMIN_PORTAL | ROLE_PERMISSION_MATRIX.md | ✅ Enum en admin | PARTIAL | Sin validación backend, sin storage | CRÍTICO: Sin autorización |
| Roles: ADMIN_COMMERCE | ROLE_PERMISSION_MATRIX.md | ✅ Enum en admin | PARTIAL | Sin validación backend, sin storage | CRÍTICO: Sin autorización |
| Roles: VIEWER | ROLE_PERMISSION_MATRIX.md | ✅ Enum en admin | PARTIAL | Sin validación backend, sin storage | CRÍTICO: Sin autorización |
| RoleAssignment (User + Role + Scope) | ROLE_PERMISSION_MATRIX.md | ❌ No existe | MISSING | Tabla + entidad + endpoints necesarios | CRÍTICO: Sin RBAC |
| JWT Authentication | ROLE_PERMISSION_MATRIX.md | ❌ No existe | MISSING | Necesita @nestjs/jwt, strategy, guards | CRÍTICO: Sin autenticación |
| Authorization Guard (ROLE+SCOPE+RESOURCE) | ROLE_PERMISSION_MATRIX.md | ❌ No existe | MISSING | Decoradores @Roles(), @Scope() + guards | CRÍTICO: Sin autorización enforcement |
| Session invalidation | ROLE_PERMISSION_MATRIX.md | ❌ No existe | MISSING | Logout endpoint, token blacklist o TTL | ALTO: Sin cierre de sesión |

---

### II. Administration / Network

#### Portales (Portal de Pago)

| Requerimiento | Fuente | Actual | Status | Gap | Riesgo |
|---|---|---|---|---|---|
| Portal CRUD (CREATE) | ROLE_PERMISSION_MATRIX.md | ✅ Tipo en admin | PARTIAL | Sin POST /api/admin/portals endpoint | CRÍTICO: Sin creación |
| Portal CRUD (READ) | ROLE_PERMISSION_MATRIX.md | ✅ Tipo + mocks en admin | PARTIAL | Sin GET /api/admin/portals, /api/admin/portals/:id | CRÍTICO |
| Portal CRUD (UPDATE) | ROLE_PERMISSION_MATRIX.md | ✅ Tipo en admin | PARTIAL | Sin PUT /api/admin/portals/:id endpoint | CRÍTICO: Sin edición |
| Portal CRUD (DELETE) | ROLE_PERMISSION_MATRIX.md | 🟡 PENDIENTE | PENDING | Decisión: ¿eliminar físico o soft delete? | MEDIO: Futura decisión |
| Portal activation/deactivation | ROLE_PERMISSION_MATRIX.md | ✅ Tipo status en admin | PARTIAL | Sin PATCH /api/admin/portals/:id/status | ALTO: Sin control de estado |
| Portal publication/unpublication | ROLE_PERMISSION_MATRIX.md | ✅ Tipo status en admin | PARTIAL | Sin PATCH /api/admin/portals/:id/publication | ALTO: Sin publicación en portal público |
| Portal 1:N Commerce relationship | DOMAIN_GLOSSARY.md | ✅ Tipos en admin | PARTIAL | Sin enforcement en BD, sin cascade en ORM | CRÍTICO: Sin relación |
| Portal metrics (totalAliados, volume, successRate) | ROLE_PERMISSION_MATRIX.md | ✅ Mocks en admin | PARTIAL | Sin cálculo real, sin query en endpoint | ALTO: Sin KPIs |
| Scope enforcement: ADMIN_PORTAL sees only own portal | ROLE_PERMISSION_MATRIX.md | ❌ No existe | MISSING | Sin validación en GET, sin filtering en queries | CRÍTICO: BOLA risk |

#### Comercios / Aliados

| Requerimiento | Fuente | Actual | Status | Gap | Riesgo |
|---|---|---|---|---|---|
| Commerce/Aliado entidad única (no duplicado) | DOMAIN_GLOSSARY.md | ✅ Aliado tipo en admin | PARTIAL | Sin tabla, sin ORM, Aliado ≠ Commerce TBD en DB | CRÍTICO: Debe ser misma tabla |
| Commerce CRUD (CREATE) | ROLE_PERMISSION_MATRIX.md | ✅ Dialog en admin | PARTIAL | Sin POST /api/admin/portals/:id/commerces | CRÍTICO |
| Commerce CRUD (READ) | ROLE_PERMISSION_MATRIX.md | ✅ Mocks en admin | PARTIAL | Sin GET /api/admin/portals/:id/commerces, GET /api/admin/commerces/:id | CRÍTICO |
| Commerce CRUD (UPDATE) | ROLE_PERMISSION_MATRIX.md | ✅ Dialog en admin | PARTIAL | Sin PUT /api/admin/commerces/:id endpoint | CRÍTICO |
| Commerce soft delete (no eliminar física) | ROLE_PERMISSION_MATRIX.md | ❌ No existe | MISSING | Sin soft_delete flag, sin archived logic | CRÍTICO: Regla de negocio |
| Commerce activation/deactivation | ROLE_PERMISSION_MATRIX.md | ✅ Status tipo | PARTIAL | Sin PATCH /api/admin/commerces/:id/status | ALTO |
| Commerce publication/unpublication | ROLE_PERMISSION_MATRIX.md | ✅ Status tipo | PARTIAL | Sin PATCH /api/admin/commerces/:id/publication | ALTO: Portal público requiere |
| Commerce category assignment | ROLE_PERMISSION_MATRIX.md | ❌ Sin Category entidad | MISSING | Category entidad missing, sin assignment logic | CRÍTICO |
| Commerce 1:1 relationship to Portal | DOMAIN_GLOSSARY.md | ✅ portalId en tipo | PARTIAL | Sin FK constraint, sin ORM validation | CRÍTICO: Debe validarse |
| Commerce metrics (transactions, volume, successRate, averageTicket) | ROLE_PERMISSION_MATRIX.md | ✅ Mocks en admin | PARTIAL | Sin cálculo real | ALTO |
| Scope enforcement: ADMIN_PORTAL sees own portal commerces, ADMIN_COMMERCE sees own | ROLE_PERMISSION_MATRIX.md | ❌ No existe | MISSING | Sin validación portalId, sin filtering | CRÍTICO: BFLA risk |

#### Categorías

| Requerimiento | Fuente | Actual | Status | Gap | Riesgo |
|---|---|---|---|---|---|
| Category entidad | ROLE_PERMISSION_MATRIX.md | ❌ No existe | MISSING | Sin tabla, sin tipo, sin endpoints | CRÍTICO |
| Category portal-specific (N por Portal) | ROLE_PERMISSION_MATRIX.md | ❌ No existe | MISSING | Sin relación Portal:Category | CRÍTICO |
| Category CRUD (CREATE, READ, UPDATE) | ROLE_PERMISSION_MATRIX.md | ❌ No existe | MISSING | Sin endpoints | CRÍTICO |
| Category classification of Commerce | ROLE_PERMISSION_MATRIX.md | ❌ No existe | MISSING | Sin Commerce.categoryId FK | CRÍTICO |
| NOT: Category classification of Service | ROLE_PERMISSION_MATRIX.md | 📌 CONFIRMADO NO | CONFIRMED | Categories clasifican Comercios, no Servicios | OK |

#### Servicios

| Requerimiento | Fuente | Actual | Status | Gap | Riesgo |
|---|---|---|---|---|---|
| Service entidad | DOMAIN_MODEL.md | ❌ No existe | MISSING | Sin tabla, sin tipo, sin endpoints | CRÍTICO |
| Service 1:N Commerce (Commerce puede tener servicios) | DOMAIN_MODEL.md | ❌ No existe | MISSING | Sin Commerce.services relación | CRÍTICO |
| Service CRUD (CREATE, READ, UPDATE por ADMIN_COMMERCE) | DOMAIN_MODEL.md | ❌ No existe | MISSING | Sin endpoints | CRÍTICO |
| Service determines payment flow | PAYMENT_FLOW_MODEL.md | ❌ No existe | MISSING | Servicio debe vincular a FormDefinition, obligación | CRÍTICO |

---

### III. Dynamic Forms

| Requerimiento | Fuente | Actual | Status | Gap | Riesgo |
|---|---|---|---|---|---|
| FormDefinition entidad | DOMAIN_MODEL.md | ❌ No existe | MISSING | Sin tabla, sin endpoints | CRÍTICO para portal público |
| FormVersion (snapshot temporal) | DOMAIN_MODEL.md | ❌ No existe | MISSING | Sin versionado, histórico | ALTO: Auditoría |
| FormField (campo configurable) | DOMAIN_MODEL.md | ❌ No existe | MISSING | Sin entidad, sin validaciones | CRÍTICO |
| FormSubmission (datos del pagador) | DOMAIN_MODEL.md | ❌ No existe | MISSING | Sin captura, sin persistencia | CRÍTICO |
| Form publication/versioning | ROLE_PERMISSION_MATRIX.md | ❌ No existe | MISSING | Sin PATCH /forms/:id/publish | CRÍTICO: Portal público necesita |
| Form rendering in Admin y Portal Público | 📌 SPLIT | ❌ No existe | MISSING | Admin: editor; Web: renderer | CRÍTICO |

---

### IV. Payments / Transactions

| Requerimiento | Fuente | Actual | Status | Gap | Riesgo |
|---|---|---|---|---|---|
| Transaction entidad | DOMAIN_MODEL.md | ✅ Tipo en admin | PARTIAL | Sin tabla, sin ORM, sin endpoints | CRÍTICO |
| Transaction fields: portalId, commerceId, servicioId | DOMAIN_MODEL.md | ✅ Tipo en admin | PARTIAL | Sin relaciones, sin validación | CRÍTICO |
| Transaction fields: amount, method, status | DOMAIN_MODEL.md | ✅ Tipo en admin | PARTIAL | Sin persistencia real | CRÍTICO |
| TransactionEvent (historial append-only) | DOMAIN_MODEL.md | ❌ No existe | MISSING | Sin tabla, sin evento logging | ALTO: Auditoría |
| Transaction state lifecycle (APPROVED, PENDING, REJECTED, CANCELLED) | TRANSACTION_LIFECYCLE.md | ✅ Enum en admin | PARTIAL | Sin máquina de estados, sin transiciones | CRÍTICO |
| Payment gateway integration | 🟡 PENDIENTE | ❌ No existe | MISSING | Requiere decisión de proveedor | CRÍTICO: Bloqueador de negocio |
| Idempotency en transacciones (prevenir doble-cargo) | PAYMENT_DOMAIN_DECISIONS.md | ❌ No existe | MISSING | Sin idempotency-key, sin deduplicación | CRÍTICO: Riesgo financiero |
| Refunds | 🟡 PENDIENTE | ❌ No existe | MISSING | Requiere decisión de modelo | 🟡 PENDIENTE |
| Reversals | 🟡 PENDIENTE | ❌ No existe | MISSING | Requiere decisión | 🟡 PENDIENTE |
| Settlements | 🟡 PENDIENTE | ❌ No existe | MISSING | Requiere decisión | 🟡 PENDIENTE |
| Commissions | 🟡 PENDIENTE | ❌ No existe | MISSING | Requiere decisión de modelo | 🟡 PENDIENTE |
| Reconciliation | 🟡 PENDIENTE | ❌ No existe | MISSING | Requiere decisión | 🟡 PENDIENTE |
| Financial adjustments | DOMAIN_MODEL.md | ❌ No existe | MISSING | Sin FinancialAdjustment entidad | 🟡 PENDIENTE |

#### PayerData

| Requerimiento | Fuente | Actual | Status | Gap | Riesgo |
|---|---|---|---|---|---|
| PayerData (NO es AppUser) | DOMAIN_MODEL.md | ❌ No existe | MISSING | Entidad separada requerida | CRÍTICO |
| PayerData fields: email, documentType, documentNumber, firstName, lastName, phone | DOMAIN_MODEL.md | ❌ No existe | MISSING | Sin tabla, sin entidad | CRÍTICO |
| PayerData snapshot strategy (preservar histórico) | DOMAIN_MODEL.md | 🟡 PREFERENCIA | PENDING | Decisión: normalizado vs snapshot | ALTO: Trazabilidad |
| PayerData capture in Portal Público | PUBLIC_PAYMENT_SECURITY_BASELINE.md | ❌ No existe | MISSING | Sin formulario público, sin captura | CRÍTICO: Portal público bloqueado |
| PayerData PII protection (masking, encryption) | PUBLIC_PAYMENT_SECURITY_BASELINE.md | ❌ No existe | MISSING | Sin masking en logs, sin encryption en BD | CRÍTICO: Compliance |

#### PaymentObligation

| Requerimiento | Fuente | Actual | Status | Gap | Riesgo |
|---|---|---|---|---|---|
| PaymentObligation entidad (cuota/factura/referencia) | DOMAIN_MODEL.md | ❌ No existe | MISSING | Nombre + modelo pendiente | CRÍTICO: Bloquea flujo |
| Origin: interna vs externa | DECISIONS_PENDING.md | 🟡 PENDIENTE | PENDING | Requiere decisión de negocio | CRÍTICO: Arquitectura depende |
| Lookup/consultation mechanism | PAYMENT_FLOW_MODEL.md | ❌ No existe | MISSING | Requiere decisión de API externa | CRÍTICO |
| Partial payments | DECISIONS_PENDING.md | 🟡 PENDIENTE | PENDING | ¿Permitido? Límites? | 🟡 PENDIENTE |
| Overpayment limits | DECISIONS_PENDING.md | 🟡 PENDIENTE | PENDING | ¿Máximo sobrepago? | 🟡 PENDIENTE |

#### PaymentMethod

| Requerimiento | Fuente | Actual | Status | Gap | Riesgo |
|---|---|---|---|---|---|
| PaymentMethod enum: PSE | BUSINESS_RULES.md | ✅ Enum en admin | PARTIAL | Sin integración proveedor | CRÍTICO |
| PaymentMethod enum: TARJETA | BUSINESS_RULES.md | ✅ Enum en admin | PARTIAL | Sin integración proveedor | CRÍTICO |
| PaymentMethod enum: TRANSFERENCIA | BUSINESS_RULES.md | ✅ Enum en admin | PARTIAL | Sin integración proveedor | CRÍTICO |
| PaymentMethod enum: EFECTIVO | BUSINESS_RULES.md | ✅ Enum en admin | PARTIAL | Requiere decisión operativa | 🟡 PENDIENTE |
| Payment method selection per Service | DOMAIN_MODEL.md | ❌ No existe | MISSING | Service.allowedPaymentMethods no existe | CRÍTICO |

---

### V. Usuarios Administrativos

| Requerimiento | Fuente | Actual | Status | Gap | Riesgo |
|---|---|---|---|---|---|
| AppUser CRUD (CREATE, READ, UPDATE) | ROLE_PERMISSION_MATRIX.md | ✅ UI en admin | PARTIAL | Sin endpoints real | CRÍTICO |
| Password policy enforcement | ROLE_PERMISSION_MATRIX.md | ❌ No existe | MISSING | Sin reglas, sin hash | CRÍTICO |
| User activation/deactivation (no delete físico) | ROLE_PERMISSION_MATRIX.md | ✅ UI dialog | PARTIAL | Sin lógica backend | ALTO |
| RoleAssignment per user | ROLE_PERMISSION_MATRIX.md | ❌ No existe | MISSING | Sin tabla, sin asignación | CRÍTICO: RBAC |
| Scope assignment (ADMIN_PORTAL to portal X, ADMIN_COMMERCE to commerce Y) | ROLE_PERMISSION_MATRIX.md | ❌ No existe | MISSING | Sin lógica, sin validación | CRÍTICO |
| Users list filtered by scope (ADMIN_PORTAL sees own users) | ROLE_PERMISSION_MATRIX.md | ❌ No existe | MISSING | Sin filtering en query | CRÍTICO |

---

### VI. Portal Público

| Requerimiento | Fuente | Actual | Status | Gap | Riesgo |
|---|---|---|---|---|---|
| Public Portal UI (apps/web) | 📌 ARQUITECTURA | ✅ App existe | PARTIAL | Sin conexión a backend, sin datos | CRÍTICO |
| Public API: GET /api/public/portals | DOMAIN_GLOSSARY.md | ❌ No existe | MISSING | Sin endpoint, sin filtering (published=true) | CRÍTICO |
| Public API: GET /api/public/portals/:id | DOMAIN_GLOSSARY.md | ❌ No existe | MISSING | Sin endpoint | CRÍTICO |
| Public API: GET /api/public/commerces/:id | DOMAIN_GLOSSARY.md | ❌ No existe | MISSING | Sin endpoint, sin validation de published | CRÍTICO |
| Public API: GET /api/public/forms/:id/version/:version | DOMAIN_GLOSSARY.md | ❌ No existe | MISSING | Sin endpoint, sin versionado | CRÍTICO |
| Public API: POST /api/public/form-submissions | DOMAIN_GLOSSARY.md | ❌ No existe | MISSING | Sin captura de datos | CRÍTICO |
| Public API: POST /api/public/transactions/intent | PAYMENT_FLOW_MODEL.md | ❌ No existe | MISSING | Sin Payment Intent | CRÍTICO |
| Public API: POST /api/public/transactions/:id/pay | PAYMENT_FLOW_MODEL.md | ❌ No existe | MISSING | Sin payment processing | CRÍTICO |
| Public API: NO autenticación AppUser | ROLE_PERMISSION_MATRIX.md | 🟡 A definir | PENDING | Requiere separación /api/public vs /api/admin | CRÍTICO |
| Public API: NO roles administrativos | ROLE_PERMISSION_MATRIX.md | 🟡 A definir | PENDING | Cliente no es AppUser | CRÍTICO |

---

### VII. Reporting & Analytics

| Requerimiento | Fuente | Actual | Status | Gap | Riesgo |
|---|---|---|---|---|---|
| Transaction reports | DOMAIN_MODEL.md | ✅ UI table en admin | PARTIAL | Sin queries real, sin API endpoint | CRÍTICO |
| Portal metrics (KPIs) | ROLE_PERMISSION_MATRIX.md | ✅ Mocks en admin | PARTIAL | Sin cálculos real, sin API | ALTO |
| Commerce metrics | ROLE_PERMISSION_MATRIX.md | ✅ Mocks en admin | PARTIAL | Sin cálculos real, sin API | ALTO |
| User-scoped metrics (ADMIN_PORTAL sees own portal data) | ROLE_PERMISSION_MATRIX.md | ❌ No existe | MISSING | Sin filtering por scope | ALTO |
| Reporting API endpoints | DOMAIN_MODEL.md | ❌ No existe | MISSING | TBD: Estructura de reports | 🟡 PENDIENTE |

---

### VIII. Auditoría

| Requerimiento | Fuente | Actual | Status | Gap | Riesgo |
|---|---|---|---|---|---|
| AuditEvent entidad (actor, acción, recurso, scope, timestamp) | DOMAIN_MODEL.md | ❌ No existe | MISSING | Sin tabla, sin logging de acciones | CRÍTICO: Compliance |
| Admin action auditing | PUBLIC_PAYMENT_SECURITY_BASELINE.md | ❌ No existe | MISSING | Sin decorador @Audit(), sin capture | CRÍTICO |
| Transaction auditing | PUBLIC_PAYMENT_SECURITY_BASELINE.md | ❌ No existe | MISSING | Sin logs transaccionales | CRÍTICO |
| Login/logout auditing | PUBLIC_PAYMENT_SECURITY_BASELINE.md | ❌ No existe | MISSING | Sin registro de acceso | CRÍTICO |

---

### IX. Integraciones

| Requerimiento | Fuente | Actual | Status | Gap | Riesgo |
|---|---|---|---|---|---|
| Payment Gateway integration | PAYMENT_FLOW_MODEL.md | ❌ No existe | MISSING | Requiere decisión de proveedor | 🔴 BLOQUEADOR |
| Webhook handling (payment callbacks) | DOMAIN_MODEL.md | ❌ No existe | MISSING | Sin /webhooks endpoints, sin signature validation | CRÍTICO |
| External obligation lookup | DECISIONS_PENDING.md | ❌ No existe | MISSING | API integration TBD | CRÍTICO: Bloquea |
| Reconciliation with provider | DECISIONS_PENDING.md | ❌ No existe | MISSING | TBD | 🟡 PENDIENTE |

---

## Resumen de Status

### Entidades por implementación

| Entidad | Status | Prioridad |
|---|---|---|
| AppUser | PARTIAL (tipos) | 🔴 CRÍTICO |
| Role | PARTIAL (tipos) | 🔴 CRÍTICO |
| RoleAssignment | MISSING | 🔴 CRÍTICO |
| Portal | PARTIAL (tipos) | 🔴 CRÍTICO |
| Commerce/Aliado | PARTIAL (tipos) | 🔴 CRÍTICO |
| Category | MISSING | 🔴 CRÍTICO |
| Service | MISSING | 🔴 CRÍTICO |
| FormDefinition/Version/Field/Submission | MISSING | 🔴 CRÍTICO |
| Transaction | PARTIAL (tipos) | 🔴 CRÍTICO |
| TransactionEvent | MISSING | 🟠 ALTO |
| PayerData | MISSING | 🔴 CRÍTICO |
| PaymentObligation | MISSING | 🔴 CRÍTICO (bloqueador) |
| PaymentMethod | PARTIAL (enum) | 🔴 CRÍTICO |
| PaymentIntent | MISSING | 🔴 CRÍTICO |
| FinancialAdjustment | MISSING | 🟡 PENDIENTE |
| AuditEvent | MISSING | 🟠 ALTO |
| Movement | PARTIAL (tipos en admin) | 🟡 PENDIENTE |

### Por superficie

| Superficie | Avance | Bloqueadores |
|---|---|---|
| **Backoffice Admin** | UI: 80%, Lógica: 0% | Auth, Autorización, DB |
| **Portal Público** | UI: ~30%, API: 0% | Auth pública, Formularios, PaymentIntent |
| **Backend API** | Skeleton: 10%, Lógica: 0% | TODO |
| **Database** | 0% | ORM decision, schema design |

---

## Orden recomendado de implementación (FASE 3)

### Sprint 1: Foundation (Semanas 1-3)

1. ORM + Database setup (Prisma + PostgreSQL)
2. JWT Authentication
3. RBAC + Scope Guards
4. AppUser, Role, RoleAssignment entidades

### Sprint 2: Admin API (Semanas 4-6)

5. Portal CRUD + endpoints
6. Commerce/Aliado CRUD + endpoints
7. Category CRUD + endpoints
8. Service CRUD + endpoints

### Sprint 3: Forms (Semanas 7-9)

9. FormDefinition, FormVersion, FormField
10. Form publication/versioning
11. FormSubmission capture

### Sprint 4: Payments (Semanas 10-12)

12. Transaction entidad + lifecycle
13. PayerData + public capture
14. PaymentObligation (requiere decisión externa)
15. Payment gateway integration (decisión de negocio)

### Sprint 5+: Advanced

16. AuditEvent logging
17. Reporting/Analytics queries
18. Webhooks + reconciliation
19. Tests, security hardening

---

## Decisiones de negocio pendientes que bloquean

Del documento DECISIONS_PENDING.md:

1. **Origen de obligación** → Impacta PaymentObligation schema
2. **Pago parcial** → Impacta Transaction validation
3. **Límite sobrepago** → Impacta Transaction validation
4. **Modelo de devoluciones** → Impacta FinancialAdjustment
5. **Modelo de reversales** → Impacta FinancialAdjustment
6. **Modelo de liquidaciones** → Impacta Settlement
7. **Modelo de comisiones** → Impacta Financial structure
8. **Conciliación** → Impacta Reconciliation module
9. **Payment gateway** → BLOQUEADOR: Determina integración

---

**Gap Analysis completado. Arquitectura objetivo se define en FASE 3.**

La implementación debe comenzar por los críticos (Auth, DB) y avanzar secuencialmente respetando dependencias.

El portal público está completamente bloqueado sin PayerData, FormDefinition y PaymentIntent.

El backoffice está bloqueado sin Auth, Autorización y DB.
