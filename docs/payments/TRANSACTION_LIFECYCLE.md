# Red Coopagos — TRANSACTION_LIFECYCLE

**Estado:** FASE 1 — Modelo conceptual del ciclo transaccional

## 1. Principio

`Transaction.status` no debe ser un campo CRUD editable libremente. Los cambios ocurren como consecuencia del flujo real de pago, respuesta del proveedor, webhook/callback, timeout, cancelación válida o corrección financiera formal.

## 2. Estados candidatos

```text
CREATED
PENDING
PROCESSING
APPROVED
REJECTED
FAILED
CANCELLED
```

Solo si los proveedores/negocio lo requieren:

```text
EXPIRED
UNKNOWN
REQUIRES_ACTION
```

Los nombres finales se validarán contra las integraciones reales.

## 3. Semántica candidata

- `CREATED`: operación registrada internamente.
- `PENDING`: espera una confirmación externa o acción.
- `PROCESSING`: proveedor procesando.
- `APPROVED`: evidencia suficiente de aprobación.
- `REJECTED`: proveedor rechazó explícitamente.
- `FAILED`: fallo técnico u operacional; no equivale necesariamente a rechazo financiero.
- `CANCELLED`: cancelación previa a completar, si el flujo la permite.

## 4. REJECTED no es FAILED

`REJECTED` implica una decisión explícita del proveedor. `FAILED` puede ser timeout, red, servicio indisponible o respuesta inválida.

Por ello un fallo técnico no debe asumirse automáticamente como “definitivamente no cobrado”.

## 5. Transiciones candidatas

```text
CREATED
   ├── PENDING
   ├── PROCESSING
   ├── FAILED
   └── CANCELLED

PENDING
   ├── PROCESSING
   ├── APPROVED
   ├── REJECTED
   ├── FAILED
   └── CANCELLED/EXPIRED (si aplica)

PROCESSING
   ├── APPROVED
   ├── REJECTED
   └── FAILED
```

No se permitirán transiciones arbitrarias desde la UI.

## 6. Corrección financiera

Ejemplo incorrecto:

```text
TX-100 APPROVED
cliente reclama
admin cambia TX-100 → FAILED
```

Modelo correcto:

```text
TX-100 APPROVED
       │
       └── CORRECCIÓN
             ↓
          REFUND / REVERSAL / ADJUSTMENT
```

La transacción original conserva la verdad histórica.

## 7. Historial de eventos

Candidato fuerte:

```text
TransactionEvent
```

Puede registrar conceptualmente:

```text
transactionId
eventType
previousState
newState
occurredAt
source
providerReference
safeMetadata
```

Fuentes posibles:

```text
SYSTEM
PAYMENT_PROVIDER
WEBHOOK
ADMINISTRATIVE_CORRECTION
RECONCILIATION
```

Esto no implica Event Sourcing.

## 8. Concurrencia

Webhook, polling y retry pueden llegar casi al mismo tiempo.

Las transiciones deben ser:

- idempotentes;
- atómicas;
- protegidas contra carreras;
- coherentes con el estado actual.

La estrategia concreta se definirá en el diseño de persistencia.

## 9. Estado incierto

Si existe timeout con el proveedor, Coopagos no debe declarar un fallo definitivo si desconoce si existió efecto financiero.

Podría ser necesario mantener `PENDING` o usar un estado equivalente a `UNKNOWN`, dependiendo del proveedor.

## 10. Invariantes

1. No transición arbitraria desde UI.
2. No pérdida de historial.
3. No doble efecto por webhook repetido.
4. No doble cobro por retry.
5. Cada transición debe tener razón/fuente.
6. Referencias externas deben validarse.
7. Corrección financiera es una operación separada.
8. Estado final depende de evidencia real.
9. El frontend nunca decide el estado financiero.
10. El backend no confía en IDs o estados enviados por el cliente.

## 11. Backoffice

Puede consultar estado, historial, monto, referencias, portal, comercio, servicio, método de pago, fechas y correcciones relacionadas.

No debe existir un simple selector “Cambiar estado” como operación administrativa ordinaria.

## 12. Pendientes

1. Estados exactos de los proveedores.
2. Timeout incierto.
3. Cancelación.
4. Expiración.
5. Reintentos.
6. Reversa.
7. Devolución.
8. Conciliación.
9. Política final de corrección financiera.
