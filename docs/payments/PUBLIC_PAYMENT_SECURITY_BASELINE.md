# Red Coopagos — PUBLIC_PAYMENT_SECURITY_BASELINE

**Estado:** FASE 1 — Baseline funcional de seguridad del Portal Público

## 1. Contexto

El Portal Público permite pagos sin cuenta. Esto no significa que sus endpoints sean “sin seguridad”. La ausencia de autenticación del cliente aumenta la importancia de validación, rate limiting, anti-automation, idempotencia, integridad y protección contra enumeración.

## 2. Superficies

```text
/admin/*         → identidad administrativa + autorización
/public/*        → operaciones públicas estrictamente necesarias
/integrations/*  → autenticación/firma/controles específicos del tercero
```

## 3. Amenazas prioritarias

### Manipulación de IDs

Un cliente intenta combinar `portalId`, `commerceId`, `serviceId` o `formVersionId` que no pertenecen entre sí.

**Mitigación:** validar las relaciones completas en backend.

### Manipulación del monto

El cliente modifica el monto enviado por el navegador.

**Mitigación:** recalcular o validar contra obligación y política server-side.

### Manipulación del formulario

El cliente elimina campos requeridos o envía campos no autorizados.

**Mitigación:** validar contra la versión publicada en backend.

### Replay / doble pago

Se repite una solicitud válida.

**Mitigación:** idempotencia y lifecycle transaccional.

### Enumeración

Un atacante intenta descubrir transacciones o deudas probando identificadores.

**Mitigación:** identificadores no predecibles, lookup seguro, rate limiting y minimización de respuestas.

### Abuso de consulta de obligación

Un atacante consulta obligaciones de terceros usando documentos ajenos.

**Mitigaciones candidatas:** datos adicionales, rate limiting, anti-enumeración, minimización y monitoreo.

### Resource exhaustion

Bots generan consultas, formularios o intentos de pago masivos.

**Mitigación:** límites por endpoint, payload limits, timeouts y controles de abuso.

## 4. PII

Datos actuales:

```text
email
documentType
documentNumber
firstName
lastName
phone
```

Reglas:

- no logs completos;
- masking cuando corresponda;
- acceso por scope;
- cifrado en tránsito;
- protección en backups;
- política de retención;
- exportación controlada.

## 5. Integridad de pago

El frontend no es autoridad para:

```text
amount
payment status
allowed payment methods
portal-commerce relationship
service-commerce relationship
published form
obligation
```

Todo se verifica server-side.

## 6. Idempotencia

Aplicar según corresponda a:

```text
create payment context
initiate payment
provider callback
financial correction
```

## 7. Webhooks

Verificar:

```text
signature/authentication
timestamp
replay
payload schema
external reference
idempotency
```

No confiar únicamente en IP de origen.

## 8. Respuestas públicas

No exponer:

```text
stack traces
SQL errors
internal paths
provider secrets
API keys
JWT/session secrets
admin data
unnecessary PII
```

## 9. Separación de trazas

Diferenciar:

```text
Application Log
Security Event
Business Audit
Transaction Event
```

## 10. Marcos de seguridad para fases posteriores

Profundizar con:

- OWASP Top 10:2025;
- OWASP API Security Top 10;
- OWASP ASVS;
- BOLA/BFLA;
- Injection;
- SSRF;
- Resource Consumption;
- Unsafe Consumption of APIs;
- Logging/Alerting;
- Supply Chain;
- Exceptional Conditions.
