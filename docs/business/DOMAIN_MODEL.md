# Red Coopagos — DOMAIN_MODEL

**Estado:** FASE 1 — Modelo conceptual de dominio

> Este documento NO define todavía tablas, entidades ORM ni clases NestJS.

# 1. Dominios / bounded contexts candidatos

```text
Identity & Access
Administration / Network
Commerce Catalog
Dynamic Forms
Payments
Reporting
Audit
Integrations
```

La Fase 2 decidirá qué límites se convierten en módulos NestJS.

# 2. Identity & Access

## AppUser — CONFIRMADO
Representa exclusivamente a una persona con acceso al Backoffice.

No representa al cliente/pagador público.

## Role — CONFIRMADO

```text
SUPERADMIN
ADMIN_PORTAL
ADMIN_COMMERCE
VIEWER
```

## RoleAssignment — RECOMENDADO
Asocia `AppUser + Role + Scope`.

Ejemplos:

```text
ADMIN_PORTAL -> Portal Avanza
ADMIN_COMMERCE -> Universidad X
VIEWER -> scope autorizado
```

## Permission — RECOMENDADO
Representa capacidades autorizables granularmente. Implementación exacta pendiente de Fase 2.

# 3. Administration / Network

## Portal — CONFIRMADO
Entidad administrativa/publicable que agrupa comercios aliados.

Invariantes:
- se crea/administra desde Backoffice;
- puede exponerse al Portal Público según estado;
- posee muchos comercios;
- un comercio pertenece a un único portal.

## Commerce — CONFIRMADO
También denominado **Comercio Aliado**.

Ejemplos: universidad, colegio, hotel, escuela deportiva, clínica.

Invariantes:
- pertenece a exactamente un portal;
- se clasifica mediante categoría;
- puede ofrecer uno o más servicios;
- se administra desde Backoffice;
- puede publicarse en Portal Público.

Evitar mantener `Aliado` y `Comercio` como dos entidades diferentes si describen el mismo concepto.

## Category — CONFIRMADO
Clasifica comercios, no servicios.

Pendiente:
- global vs por portal;
- una o varias categorías por comercio.

## Service — CONFIRMADO CON DEFINICIÓN EN EVOLUCIÓN
Representa un concepto u operación que el comercio permite pagar.

Ejemplos: matrícula, mensualidad, reserva, cuota, inscripción.

# 4. Dynamic Forms

## FormDefinition — CONFIRMADO CONCEPTUALMENTE
Define el formulario configurado en Backoffice para un servicio.

## FormVersion — RECOMENDADO
Congela una definición publicable en el tiempo para preservar significado histórico.

## FormField — CONFIRMADO CONCEPTUALMENTE
Campo configurable: identificador, etiqueta, tipo, obligatoriedad, orden, validaciones y opciones.

## FormSubmission — CANDIDATO FUERTE
Valores enviados por el pagador para una versión concreta.

Pendiente: persistencia, snapshot, retención y protección de PII.

# 5. Customer / Payer

## PayerData — CONFIRMADO CONCEPTUALMENTE
No es una cuenta ni un AppUser.

Datos base:

```text
email
documentType
documentNumber
firstName
lastName
phone
```

Pendiente decidir si se normaliza o se conserva como snapshot transaccional. Preliminarmente se prefiere snapshot por trazabilidad.

# 6. Payments

## PaymentObligation — CANDIDATO
Representa la cuota/deuda/obligación/factura/referencia que determina qué debe pagar el cliente.

Aún no está confirmado:
- nombre definitivo;
- si Coopagos la almacena;
- si se consulta externamente;
- lifecycle;
- identificadores.

## PaymentMethod — CONFIRMADO
Catálogo de formas de pago soportadas.

Ejemplos conocidos: efectivo, tarjeta, PSE, billetera digital.

## PaymentIntent — CANDIDATO RECOMENDADO
Puede representar la intención validada previa a ejecutar una operación externa.

Es útil para idempotencia, fijar monto/servicio/formulario y limitar manipulación del cliente.

## Transaction — CONFIRMADO
Registro de una operación de pago.

Debe relacionar conceptualmente:

```text
Portal
Commerce
Service
PayerData
FormVersion/FormSubmission
Amount
PaymentMethod
State
Internal reference
External references
Timestamps
```

Invariantes:
- estado derivado del flujo real;
- monto original no reescrito para ocultar correcciones;
- trazabilidad;
- control de duplicados.

## TransactionEvent — CANDIDATO FUERTE
Historial append-oriented de eventos de la transacción. No implica Event Sourcing.

## FinancialAdjustment — CANDIDATO
Nombre temporal para acciones posteriores: devolución, reverso, ajuste, reembolso o transferencia compensatoria.

## Refund — PENDIENTE
## Settlement — PENDIENTE
## Commission — PENDIENTE
## Reconciliation — PENDIENTE / ALTA RELEVANCIA

# 7. Media

## MediaAsset — CANDIDATO RECOMENDADO
Metadatos de logos, banners, imágenes y otros archivos.

No asumir blobs en PostgreSQL.

# 8. Reporting

## Report — CAPACIDAD, NO NECESARIAMENTE ENTIDAD
No crear una tabla `reports` solo porque existe una pantalla de informes.

# 9. Audit

## AuditEvent — CANDIDATO FUERTE
Registro de acciones administrativas críticas: actor, acción, tipo/recurso, scope, timestamp, resultado y metadatos seguros.

# 10. Integrations

Conceptos candidatos:

```text
PaymentProvider
ObligationProvider
WebhookEndpoint
ExternalReference
```

No convertirlos en entidades hasta conocer proveedores y contratos reales.

# 11. Modelo conceptual consolidado

```text
                        APPUSER
                           │
                           ▼
                    ROLE ASSIGNMENT
                           │
                    ROLE + SCOPE
                           │
                           ▼
                        PORTAL
                           │ 1:N
                           ▼
                       COMMERCE
                           │
                 ┌─────────┴─────────┐
                 ▼                   ▼
              CATEGORY            SERVICE
                                     │
                                     ▼
                              FORM DEFINITION
                                     │
                                     ▼
                                FORM VERSION
                                     │
                                     ▼
                                FORM FIELD(S)

PORTAL PÚBLICO

PAYER DATA
    │
    ├──────────────────────────────┐
    ▼                              ▼
FORM SUBMISSION             PAYMENT OBLIGATION?
    │                              │
    └──────────────┬───────────────┘
                   ▼
             PAYMENT INTENT?
                   │
                   ▼
              TRANSACTION
                   │
          ┌────────┼─────────┐
          ▼        ▼         ▼
      METHOD     EVENTS   ADJUSTMENT?
```

# 12. Agregados candidatos para Fase 2

- Portal aggregate.
- Commerce aggregate.
- FormDefinition aggregate.
- Transaction aggregate.
- AppUser / Access aggregate.

No definitivos; evitar agregados excesivamente grandes.

# 13. Invariantes confirmadas

1. Un comercio pertenece a un único portal.
2. Las categorías clasifican comercios.
3. El cliente no necesita AppUser para pagar.
4. AppUser representa administración interna.
5. El formulario se configura en Backoffice.
6. El formulario se diligencia en Portal Público.
7. Solo recursos publicados/habilitados deben exponerse públicamente.
8. Admin Portal está restringido a su portal.
9. Admin Comercio está restringido a su comercio.
10. Una transacción no puede confiar en IDs enviados por cliente sin validar relaciones.
11. El backend revalida inputs aun cuando Next.js/Zod haya validado.
12. El estado transaccional no debe ser un campo CRUD libre.
13. Las correcciones financieras deben preservar el hecho original.
