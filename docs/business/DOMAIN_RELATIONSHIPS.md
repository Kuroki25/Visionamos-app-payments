# Red Coopagos — DOMAIN_RELATIONSHIPS

**Estado:** FASE 1 — Relaciones conceptuales

> Las cardinalidades pendientes están marcadas. Esto no es todavía un ERD físico.

# 1. Relaciones confirmadas

## Portal → Commerce

```text
Portal 1 ───────── N Commerce
```

- un portal puede tener muchos comercios;
- un comercio pertenece a un único portal.

## Commerce → Service

```text
Commerce 1 ───────── N Service
```

Un comercio puede ofrecer múltiples servicios.

## Portal → Category

```text
Portal 1 ───────── N Category
```

Las categorías son específicas de cada Portal y no pueden mezclarse entre Portales.

## Category → Commerce

Modelo mínimo:

```text
Category 1 ───────── N Commerce
```

Pendiente confirmar si un comercio puede pertenecer a varias categorías. Si es así:

```text
Category N ───────── M Commerce
```

No diseñar tabla intermedia hasta responder.

## Service → FormDefinition

Modelo recomendado a evaluar:

```text
Service 1 ───────── 1 FormDefinition
FormDefinition 1 ───────── N FormVersion
FormVersion 1 ───────── N FormField
```

## AppUser → RoleAssignment

```text
AppUser 1 ───────── N RoleAssignment
```

Aun si inicialmente se limita a un rol activo, separar asignación evita mezclar identidad con autorización.

## RoleAssignment → Scope

```text
RoleAssignment
├── role
├── scopeType
└── scopeId
```

Ejemplos:

```text
SUPERADMIN / GLOBAL
ADMIN_PORTAL / PORTAL / portal-123
ADMIN_COMMERCE / COMMERCE / commerce-456
VIEWER / PORTAL / portal-123
```

# 2. Relaciones del flujo público

## PayerData → Transaction

La cardinalidad de almacenamiento está pendiente porque el cliente no tiene cuenta.

### Opción recomendada preliminar: snapshot por transacción
Ventajas: trazabilidad histórica, independencia de una entidad cliente mutable y evita crear cuentas.

## FormVersion → FormSubmission

```text
FormVersion 1 ───────── N FormSubmission
```

Cada submission debe saber qué versión interpretaba sus campos.

## FormSubmission → Transaction

```text
FormSubmission 1 ───────── 0..1 Transaction
```

Puede existir submission antes del pago. Persistencia temporal/expiración pendientes.

## Service → Transaction

```text
Service 1 ───────── N Transaction
```

## Commerce → Transaction

Puede derivarse desde Service. Persistir referencia directa podría ayudar a consultas e integridad histórica; decisión física pendiente.

## Portal → Transaction

También puede derivarse desde `Service -> Commerce -> Portal`. Persistir `portalId` podría ser denormalización controlada; Fase 3 decide.

## PaymentMethod → Transaction

```text
PaymentMethod 1 ───────── N Transaction
```

# 3. Payment obligation

Concepto pendiente:

```text
Payer/Form Input
       │
       ▼
PaymentObligation?
       │
       ▼
Transaction
```

### Escenario externo

```text
Service
   ↓
External Obligation Provider
   ↓
Lookup
   ↓
Obligation Snapshot
   ↓
Transaction
```

### Escenario interno

```text
Commerce/Service
   ↓
PaymentObligation
   ↓
Transaction(s)
```

No decidir hasta conocer el proceso real.

# 4. Métodos de pago — modelos candidatos

## Global

```text
PaymentMethod -> disponible para todos
```

## Por portal

```text
Portal N ───────── M PaymentMethod
```

## Jerárquico recomendado a evaluar

```text
PaymentMethod
      ↓
PortalPaymentMethod
      ↓
Commerce restriction/override
```

Regla sugerida: un comercio no puede habilitar un método que su portal no tenga habilitado.

# 5. Transaction lifecycle

```text
Transaction 1 ───────── N TransactionEvent
```

Ejemplo conceptual:

```text
CREATED
   ↓
PENDING
   ↓
PROCESSING
   ├── APPROVED
   ├── REJECTED
   └── FAILED
```

Estados exactos pendientes.

# 6. Correcciones financieras

No reemplazar la transacción original.

```text
Transaction 1 ───────── 0..N FinancialAdjustment
```

Especializaciones pendientes: Refund, Reversal, Adjustment, CompensatingTransfer.

# 7. Publicación

Backoffice no duplica recursos en Portal Público.

```text
Backoffice writes
      ↓
Portal / Commerce / Service / FormVersion
      ↓  estado/configuración de publicación
Public API reads
      ↓
Portal Público
```

No crear una segunda familia de tablas `public_*` salvo una razón arquitectónica real.

# 8. Boundary de seguridad por relación

### Portal

```text
ADMIN_PORTAL.scopeId == resource.portalId
```

### Commerce

Para Admin Portal:

```text
commerce.portalId == admin.scopePortalId
```

Para Admin Commerce:

```text
commerce.id == admin.scopeCommerceId
```

### Service

```text
service.commerceId -> commerce.portalId
```

Validar la cadena, no confiar en IDs aislados.

### Transaction

La autorización debe poder derivar:

```text
transaction -> service -> commerce -> portal
```

# 9. Relaciones pendientes

1. `Category 1:N Commerce` vs `N:M`.
3. Uno o varios formularios por servicio.
4. Origen de obligación.
5. Métodos de pago global/portal/comercio/servicio.
6. Persistencia de PayerData.
7. Publicación automática vs workflow.
8. Ownership de media.
9. Liquidaciones.
10. Comisiones.
11. Conciliación.
12. Correcciones financieras.
