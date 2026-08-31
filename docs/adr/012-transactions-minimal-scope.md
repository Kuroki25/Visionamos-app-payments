# ADR 012: `Transaction` de alcance mínimo (sin flujo de pago)

**Status:** Aceptado
**Fecha:** 2026-08-31

## Context

`docs/payments/` (`PAYMENT_FLOW_MODEL.md`, `TRANSACTION_LIFECYCLE.md`,
`PAYMENT_DOMAIN_DECISIONS.md`) confirma la existencia conceptual de
`Transaction` pero deja explícitamente PENDIENTE casi todo lo que definiría
su schema físico completo: origen de la obligación/cuota, moneda(s), pago
parcial, límite de sobrepago, proveedores de pago reales, y el mecanismo de
corrección financiera (devolución/reverso/ajuste). `docs/business/ROLE_PERMISSION_MATRIX.md`
§5.8 además confirma, para las cuatro roles administrativas sin excepción:
`Crear manualmente: ❌`, `Editar monto original: ❌`,
`Cambiar estado arbitrariamente: ❌` — una transacción solo puede nacer del
flujo real de pago (Portal Público → proveedor), que no existe todavía.

Esto crea una restricción real: no se puede construir un endpoint
administrativo de creación de transacciones sin violar una regla de negocio
ya CONFIRMADA, y no se puede construir el flujo público de pago sin resolver
primero el origen de la obligación, moneda y proveedor (todos PENDIENTES).

## Decision

### Alcance de este ADR

Se construye el schema físico (`transactions`, `transaction_events`) y la
capa de servicio (`TransactionsService`) como el andamiaje que el futuro
flujo público de pago usará — pero **sin exponer ningún endpoint de
escritura administrativo**. El Backoffice solo puede **listar y ver detalle**
(`GET`), exactamente lo que la matriz de roles confirma. `TransactionsService.create()`
y `.applyTransition()` existen como API interna, lista para que el módulo de
Payments (próxima fase, cuando se resuelvan las decisiones pendientes) la
invoque — no como código muerto especulativo, sino porque la máquina de
estados y el registro de eventos ya están completamente definidos en
`TRANSACTION_LIFECYCLE.md` y no dependen de ninguna decisión pendiente.

### Máquina de estados (docs/payments/TRANSACTION_LIFECYCLE.md §2/§5)

```text
CREATED    → PENDING | PROCESSING | FAILED | CANCELLED
PENDING    → PROCESSING | APPROVED | REJECTED | FAILED | CANCELLED
PROCESSING → APPROVED | REJECTED | FAILED
```

`APPROVED`, `REJECTED`, `FAILED`, `CANCELLED` son terminales. Toda transición
se valida contra este grafo en `TransactionsService.applyTransition` — nunca
un `UPDATE status = ...` libre — y queda registrada en `transaction_events`
(append-only, nunca se edita ni se borra un evento).

### Supuestos documentados (asunciones explícitas, reversibles)

Estas decisiones NO están confirmadas por el negocio; se adoptan como el
mínimo necesario para que el schema compile y sea consistente, y se marcan
para revisión cuando el negocio resuelva las preguntas reales
(`docs/reference/DECISIONS_PENDING.md`):

- **Moneda:** columna `currency` (ISO 4217, `varchar(3)`) con default `'COP'`
  — Red Coopagos opera en Colombia (formato de NIT, ciudades, teléfonos en
  los datos ya vistos); soporte multi-moneda real queda pendiente.
- **Monto:** `amount` es `integer`, en la unidad menor de la moneda
  (centavos) — evita errores de coma flotante en dinero; es el estándar de
  facto (Stripe, la mayoría de pasarelas). No implica que el negocio haya
  confirmado esta representación.
- **`PaymentMethod`:** enum plano (`CASH`, `CARD`, `PSE`, `DIGITAL_WALLET`)
  en la propia columna `method` de `Transaction` — **no** una tabla
  `payment_methods` con jerarquía de habilitación Portal→Comercio→Servicio,
  porque esa jerarquía está explícitamente PENDIENTE
  (`docs/business/BUSINESS_RULES_RED_COOPAGOS.md` BR-030). Todo método está
  disponible sin restricción en este schema — el día que se confirme la
  jerarquía, se añade como tabla/constraint aparte sin tocar `Transaction`.
- **Datos del pagador:** columnas snapshot directas en `Transaction`
  (`payerEmail`, `payerDocumentType`, `payerDocumentNumber`,
  `payerFirstName`, `payerLastName`, `payerPhone`) — no una entidad
  `PayerData` reutilizable, siguiendo la preferencia documentada en
  `DOMAIN_RELATIONSHIPS.md` ("preliminarmente se prefiere snapshot por
  trazabilidad"). `payerDocumentType` es `varchar` libre, no enum — el
  catálogo real de tipos de documento (CC, CE, TI, pasaporte...) no está
  confirmado.
- **Sin `PaymentObligation`:** no existe ninguna columna relacionada con
  cuota/obligación consultada — su origen mismo (interno vs. externo) es la
  decisión más bloqueante de todas (`DECISIONS_PENDING.md` #1) y no se
  aproxima aquí.
- **Sin `PaymentIntent`:** la creación es un solo paso
  (`TransactionsService.create`), no un flujo en dos fases
  intent→transacción — `PAYMENT_FLOW_MODEL.md` §9 dice explícitamente que
  `PaymentIntent` "no está aprobado todavía como entidad física".
- **`portalId`/`commerceId` cacheados en `Transaction`:** denormalización
  deliberada (igual que en `RoleAssignment`/`AuditEvent`) — se derivan de
  `service → commerce → portal` pero se guardan también en la fila para
  poder filtrar/indexar sin cuatro JOINs en cada consulta administrativa
  scoped. `DOMAIN_RELATIONSHIPS.md` dejaba esto explícitamente para "Fase 3
  decide" — esta es esa decisión.
- **`FormSubmission.transactionId`:** se añade ahora (nueva migración, no se
  edita la migración ya aplicada) como FK nullable `ON DELETE RESTRICT` —
  una transacción puede o no venir precedida de una captura de formulario.

### Sin corrección financiera

`BR-036`/`BR-037`/`BR-038` (reverso/devolución/ajuste) permanecen sin
implementar — el mecanismo exacto sigue sin decidirse. No se agrega ningún
endpoint ni tabla para esto en este ADR.

## Alternatives considered

- **No construir nada de `Transaction` hasta resolver todo lo pendiente**:
  la alternativa más conservadora, descartada porque el usuario pidió
  avanzar con supuestos documentados para lo mínimo indispensable, y la
  máquina de estados + el registro de eventos son terreno sólido (no
  dependen de las preguntas realmente abiertas).
- **Exponer `POST /transactions` para pruebas/demo**: descartado — viola
  literalmente `ROLE_PERMISSION_MATRIX.md` §5.8 ("Crear manualmente: ❌"
  para los cuatro roles, sin excepción). Los tests e2e de este módulo usan
  un fixture que inserta directo por repositorio (mismo patrón que
  `seedSuperadmin` para el primer usuario), no un endpoint real.
- **`PaymentMethod` como tabla con jerarquía de habilitación**: descartado
  por ahora — la jerarquía está PENDIENTE; una tabla vacía sin la regla que
  la gobierna no aporta nada y sí compromete a un diseño físico prematuro.

## Consequences

- El Backoffice puede listar/ver transacciones (scoped por Portal/Comercio,
  igual patrón que el resto de módulos) en cuanto existan filas — pero
  ninguna fila existe todavía por ningún camino administrativo; solo
  aparecerán cuando el futuro módulo de Payments llame a
  `TransactionsService.create()`.
- Cuando se resuelva el origen de la obligación y se apruebe `PaymentIntent`/
  `PaymentObligation`, esas piezas se añaden como columnas/tablas nuevas con
  su propia migración — `Transaction` y `TransactionEvent` no deberían
  necesitar reescritura, solo extensión.
- `docs/business/ROLE_PERMISSION_MATRIX.md` §5.8 confirma que
  `SUPERADMIN`/`ADMIN_PORTAL` sí podrán ejecutar "corrección financiera" —
  ese endpoint queda pendiente de una decisión de negocio, no de este ADR.

## Trade-offs

`TransactionsService.create()`/`.applyTransition()` no tienen ningún
consumidor real todavía (ni endpoint, ni webhook) — es código sin caller en
producción hasta la siguiente fase. Se acepta porque la alternativa
(esperar a tener el flujo completo para escribir la máquina de estados) deja
la lógica de transición sin tests hasta un cambio mucho más grande y
riesgoso; aquí se construye y se prueba aislada, con fixtures.
