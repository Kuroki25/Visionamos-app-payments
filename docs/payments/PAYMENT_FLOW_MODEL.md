# Red Coopagos — PAYMENT_FLOW_MODEL

**Estado:** FASE 1 — Diseño funcional del flujo de pago

## 1. Regla principal

El pago del cliente ocurre exclusivamente en el **Portal Público**. El **Backoffice Administrativo** configura y administra portales, categorías, comercios, servicios, formularios, transacciones, reportes y configuración; no es un canal de pago para clientes.

## 2. Flujo público de alto nivel

```text
Cliente
  ↓
Portal Público
  ↓
Portal
  ↓
Categoría
  ↓
Comercio Aliado
  ↓
Servicio
  ↓
Formulario Dinámico Publicado
  ↓
Datos del servicio + datos base del pagador
  ↓
Consulta/determinación de obligación o cuota
  ↓
Monto permitido
  ↓
Método de pago permitido
  ↓
Contexto / intención de pago
  ↓
Proveedor o mecanismo de pago
  ↓
Transacción
  ↓
Resultado / comprobante
```

## 3. Datos base del pagador

Confirmados:

```text
email
documentType
documentNumber
firstName
lastName
phone
```

Reglas:

- no crean automáticamente una cuenta;
- no convierten al cliente en `AppUser`;
- son datos del contexto de pago;
- el backend debe validarlos;
- deben protegerse como PII;
- no deben aparecer completos en logs ordinarios.

## 4. Formulario dinámico

El formulario se **configura y publica en Backoffice**, se **renderiza y diligencia en Portal Público** y se **valida nuevamente en Backend**.

Separación conceptual recomendada:

```text
FormDefinition
  ↓
FormVersion
  ↓
FormSubmission
```

El formulario recopila datos; la transacción representa una operación financiera. No deben tratarse como el mismo concepto.

## 5. Obligación / cuota

**Confirmado conceptualmente:** existe un monto o cuota que corresponde pagar al cliente.

Nombre temporal:

```text
PaymentObligation
```

No es todavía un nombre definitivo.

### Orígenes posibles — pendientes de negocio

1. Consulta en tiempo real al sistema del comercio.
2. Obligaciones cargadas previamente a Coopagos.
3. Valor introducido por el cliente para ciertos servicios.
4. Modelo híbrido según el servicio.

### Recomendación

No acoplar `Service` a un único mecanismo de obtención de obligación.

## 6. Snapshot de obligación

Aunque la obligación se consulte externamente, conviene conservar el contexto visto al iniciar el pago:

```text
obligationReference
referenceAmount
outstandingAmount
queriedAt
providerReference
```

Esto preserva trazabilidad histórica.

## 7. Reglas de monto

Confirmado:

- existe una cuota/monto de referencia;
- el cliente puede pagar la cuota correspondiente;
- se contempla permitir un valor superior.

Pendiente:

```text
allowPartialPayment
allowOverpayment
maxOverpayment
minimumAmount
maximumAmount
currency
roundingPolicy
```

Estas reglas pueden variar por servicio.

## 8. Métodos de pago

Confirmados conceptualmente:

```text
Cash
Card
PSE
Digital Wallet
```

El catálogo real dependerá de las integraciones.

### Modelo recomendado a evaluar

```text
Coopagos define catálogo técnico
        ↓
Portal habilita subconjunto
        ↓
Commerce puede restringir
```

Un comercio no debería habilitar un método que su portal no tenga habilitado.

## 9. Contexto / intención de pago

Candidato recomendado:

```text
PaymentIntent
```

Puede congelar:

```text
portal
commerce
service
formVersion
formSubmission
payerSnapshot
obligationSnapshot
selectedAmount
selectedPaymentMethod
expiration
idempotencyInformation
```

Objetivos:

- impedir manipulación entre pasos;
- soportar idempotencia;
- separar preparación de ejecución;
- mantener trazabilidad;
- facilitar expiración;
- proteger contra replay.

No está aprobado todavía como entidad física.

## 10. Validaciones server-side antes del pago

El backend debe comprobar:

```text
Portal existe y está habilitado/publicado
Commerce pertenece al Portal
Commerce está habilitado/publicado
Category pertenece al Portal
Service pertenece al Commerce
Service está habilitado
FormVersion es la versión válida/publicada
Payload satisface el schema
PayerData es válido
Obligation es válida
Monto cumple la política
PaymentMethod está permitido
Contexto no expiró
Operación no es duplicada
```

Nunca confiar en la secuencia o IDs enviados por el frontend.

## 11. Referencias de transacción

La transacción debe tener identidad interna propia:

```text
transactionId
internalReference
```

Y conservar referencias externas cuando existan:

```text
providerTransactionId
providerReference
authorizationCode
```

Una referencia externa no debe ser la única identidad interna.

## 12. Idempotencia

Crítica para pagos.

Ejemplo de riesgo:

```text
Cliente pulsa PAGAR
  ↓
timeout
  ↓
pulsa PAGAR otra vez
```

No deben producirse dos cobros accidentales.

Conceptualmente se evaluará:

```text
Idempotency-Key
+
PaymentIntent/contexto
+
Business fingerprint
```

## 13. Integración con proveedor

Modelo conceptual:

```text
Application
   ↓
PaymentGateway Port
   ↑
Provider Adapter
   ↓
Proveedor externo
```

El dominio no debe depender directamente del SDK/API del proveedor.

## 14. Resultado síncrono y asíncrono

Una operación puede:

- responder inmediatamente;
- quedar pendiente;
- confirmarse por webhook;
- requerir consulta posterior.

Un HTTP 200 de un proveedor no significa automáticamente que el pago esté financieramente confirmado.

## 15. Webhooks / callbacks

Si existen, deben validar:

- firma/autenticidad;
- timestamp;
- replay;
- schema;
- idempotencia;
- referencias;
- logging seguro.

## 16. Resultado al cliente

El Portal Público puede mostrar:

```text
referencia
portal/comercio
servicio
monto
fecha
estado
información necesaria del pago
```

Sin exponer secretos, stack traces, tokens, datos internos ni PII excesiva.

## 17. Consulta posterior sin cuenta

Pendiente definir un mecanismo seguro, por ejemplo:

- referencia + validación adicional;
- signed lookup token;
- correo + referencia;
- documento + referencia;
- enlace temporal.

Debe evitar enumeración de transacciones.

## 18. Correcciones posteriores

La transacción original no se sobrescribe para ocultar el hecho.

```text
Original Transaction
        │
        └── FinancialCorrection
```

Nombre temporal. Puede terminar siendo refund, reversal, adjustment o transferencia compensatoria según el negocio.

Debe requerir autorización, auditoría, razón, actor y referencias.

## 19. Conciliación

**Pendiente de confirmación / altamente recomendable.**

```text
Coopagos Transactions
        ⇅
Provider/Bank Records
        ↓
Differences
```

Detectaría transacciones faltantes, duplicados, montos o estados diferentes y cobros externos no reflejados internamente.

## 20. Secuencia candidata

```text
1. Consultar portales
2. Consultar categorías por portal
3. Consultar comercios
4. Consultar servicios
5. Obtener formulario publicado
6. Enviar formulario + pagador
7. Resolver obligación
8. Validar monto
9. Resolver métodos permitidos
10. Crear contexto/intención de pago
11. Iniciar pago
12. Crear/actualizar transacción
13. Procesar proveedor
14. Callback/Webhook/Polling
15. Estado actual/final
16. Resultado o comprobante
```

No interpretar esta lista como endpoints finales todavía.

## 21. Decisiones abiertas

1. Fuente de obligaciones.
2. Pago parcial.
3. Límite de sobrepago.
4. Moneda(s).
5. Métodos de pago y scopes.
6. Proveedores de pago.
7. Flujo síncrono/asíncrono.
8. Consulta pública posterior.
9. Devoluciones.
10. Reversos.
11. Transferencias compensatorias.
12. Conciliación.
13. Liquidaciones.
14. Comisiones.
