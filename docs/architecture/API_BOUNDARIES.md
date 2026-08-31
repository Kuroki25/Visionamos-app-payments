# API_BOUNDARIES.md — Red Coopagos API Surfaces

**Phase:** FASE 3.0  
**Date:** 2026-08-23

---

## Tres Superficies de API Separadas

### 1. ADMIN API (`/api/admin/*`)

**Autenticación:** JWT requerido  
**Autorización:** @Roles + @Scope guards  
**Base:** `/api/admin`

#### 1.1 Auth Endpoints

```
POST   /api/admin/auth/login              (sin auth)
  Request:  { email, password }
  Response: { access_token, user }
  
POST   /api/admin/auth/logout             (con auth)
  Response: { success }
```

#### 1.2 User Management

```
GET    /api/admin/users                   (SUPERADMIN)
  Query: ?role=ADMIN_PORTAL&status=ACTIVE
  Response: [ User[] ]

POST   /api/admin/users                   (SUPERADMIN)
  Body: { email, password, role, scope: { portalId? } }
  Response: User (201)

GET    /api/admin/users/:id               (SUPERADMIN | own user)
GET    /api/admin/users/:id/roles         (See role assignments)

PUT    /api/admin/users/:id               (SUPERADMIN)
PATCH  /api/admin/users/:id/status        (Activate/deactivate)
PATCH  /api/admin/users/:id/roles         (Assign roles + scope)
```

#### 1.3 Portal Management

```
GET    /api/admin/portals                 (filtered by scope)
  Query: ?status=ACTIVE&published=true
  Response: Portal[]

POST   /api/admin/portals                 (SUPERADMIN)
  Body: { name, description, logo }
  Response: Portal (201)

GET    /api/admin/portals/:id             (@Scope(portalId))
PUT    /api/admin/portals/:id             (@Scope(portalId))
PATCH  /api/admin/portals/:id/status      (activate/deactivate)
PATCH  /api/admin/portals/:id/publish     (publish/unpublish)

GET    /api/admin/portals/:id/analytics   (KPIs: volume, transactions, etc.)
```

#### 1.4 Commerce Management

```
GET    /api/admin/portals/:portalId/commerces
POST   /api/admin/portals/:portalId/commerces
  Body: { name, type, identification, address, ... }

GET    /api/admin/commerces/:id
PUT    /api/admin/commerces/:id
PATCH  /api/admin/commerces/:id/status
PATCH  /api/admin/commerces/:id/publish
PATCH  /api/admin/commerces/:id/category  (assign category)

GET    /api/admin/commerces/:id/analytics
```

#### 1.5 Category Management

```
GET    /api/admin/portals/:portalId/categories
POST   /api/admin/portals/:portalId/categories
PUT    /api/admin/categories/:id
PATCH  /api/admin/categories/:id/status
```

#### 1.6 Service Management

```
GET    /api/admin/commerces/:commerceId/services
POST   /api/admin/commerces/:commerceId/services
PUT    /api/admin/services/:id
PATCH  /api/admin/services/:id/status
```

#### 1.7 Form Management

```
GET    /api/admin/forms                   (for administration)
POST   /api/admin/forms                   (create form definition)
GET    /api/admin/forms/:id
PUT    /api/admin/forms/:id
PATCH  /api/admin/forms/:id/publish       (publish version)
GET    /api/admin/forms/:id/versions      (all versions)
```

#### 1.8 Transaction Management

```
GET    /api/admin/transactions            (filtered by scope)
  Query: ?portalId=...&commerceId=...&status=APPROVED&from=...&to=...
  
GET    /api/admin/transactions/:id
PATCH  /api/admin/transactions/:id/status (manual status update - rare)
```

#### 1.9 Reporting

```
GET    /api/admin/reports/transactions    (aggregated stats)
  Query: ?portalId=...&period=month&format=json|csv|pdf
  Response: { totalVolume, successRate, averageTicket, ... }

GET    /api/admin/reports/portals         (portal metrics)
GET    /api/admin/reports/commerces       (commerce metrics)
GET    /api/admin/reports/users           (user activity)
```

---

### 2. PUBLIC API (`/api/public/*`)

**Autenticación:** NONE  
**Autorización:** Rate limiting por IP  
**Base:** `/api/public`

#### 2.1 Portal Discovery

```
GET    /api/public/portals
  Query: ?status=ACTIVE
  Response: Portal[] (solo publicados)
  Rate limit: 100 req/min per IP

GET    /api/public/portals/:id
  Response: { id, name, description, commerces }
```

#### 2.2 Commerce Discovery

```
GET    /api/public/portals/:portalId/commerces
  Response: Commerce[] (publicados)

GET    /api/public/commerces/:id
  Response: { id, name, type, services, logo }
```

#### 2.3 Service & Category

```
GET    /api/public/commerces/:id/services
GET    /api/public/services/:id
GET    /api/public/categories/:id
```

#### 2.4 Forms (Dinámicos)

```
GET    /api/public/forms/:id
  Response: FormDefinition (sin data sensible)

GET    /api/public/forms/:id/version/:version
  Response: FormVersion + FormFields[]
  
POST   /api/public/form-submissions
  Body: { formVersionId, values: { ... } }
  Response: FormSubmission (201)
  Rate limit: 10 req/min per IP
```

#### 2.5 Payment Flow

```
POST   /api/public/transactions/intent
  Body: { 
    obligationId?, 
    amount, 
    method (PSE|TARJETA|TRANSFERENCIA|EFECTIVO),
    payerData: { email, documentType, documentNumber, ... }
  }
  Response: { 
    transactionId, 
    paymentIntentId, 
    status: PENDING, 
    redirectUrl? 
  }
  Rate limit: 5 req/min per IP
  Requires: Idempotency-Key header

GET    /api/public/transactions/:id
  Response: { transactionId, status, amount, reference, ... }
  Rate limit: 100 req/min per IP

POST   /api/public/transactions/:id/pay
  Body: { paymentIntentId, paymentData: { ... } }
  Response: { status: APPROVED|REJECTED, reference, ... }
  Rate limit: 1 req/min per IP (critical)
  Requires: Idempotency-Key header

POST   /api/public/transactions/:id/retry
  Body: { idempotencyKey, method? }
  Rate limit: 3 req/min per IP
```

#### 2.6 Payment Status & Receipts

```
GET    /api/public/transactions/:id/receipt
  Response: PDF|JSON receipt

GET    /api/public/transactions/:id/status
  Response: { status, updates: [] }
```

---

### 3. INTEGRATION API (`/api/webhooks/*`, `/api/integrations/*`)

**Autenticación:** API Key + HMAC signature validation  
**Autorización:** Per-integration  
**Base:** `/api/webhooks`, `/api/integrations`

#### 3.1 Payment Gateway Callbacks

```
POST   /api/webhooks/payment-gateway
  Headers: 
    X-Webhook-Signature: HMAC-SHA256
    X-Webhook-Timestamp
  Body: { transactionId, status, reference, amount, ... }
  Response: { success, message }
  
  Processing:
  - Validate signature
  - Upsert transaction status
  - Emit event: TransactionGatewayCallback
  - Retry logic: 5 retries with exponential backoff
```

#### 3.2 Reconciliation Callbacks

```
POST   /api/webhooks/reconciliation
  Headers: X-Webhook-Signature
  Body: { batch: [ { transactionId, gatewayReference, status } ] }
  Response: { processed, errors }
```

#### 3.3 External Obligation Lookup

```
GET    /api/integrations/obligations/:id
  Query: ?obligationId=XXX&commerceId=...
  Response: { id, amount, dueDate, status, ... }
  Rate limit: 100 req/min per API key
```

---

## Error Responses (RFC 9457 Problem Details)

**Todos los endpoints devuelven:**

```json
{
  "type": "https://api.redcoopagos.co/errors/validation-failed",
  "status": 400,
  "title": "Validation Failed",
  "detail": "Email is required",
  "instance": "/api/admin/users",
  "timestamp": "2026-08-23T12:34:56Z",
  "requestId": "req-12345"
}
```

**Status codes:**
- 200 OK
- 201 Created
- 400 Bad Request (validation, malformed)
- 401 Unauthorized (no JWT)
- 403 Forbidden (JWT but no permission)
- 404 Not Found
- 409 Conflict (duplicate, idempotency key mismatch)
- 429 Too Many Requests (rate limit)
- 500 Internal Server Error

---

## Headers Standard

**Request:**
```
Authorization: Bearer <JWT>                    (admin + algunos public)
Content-Type: application/json
Accept: application/json|text/csv|application/pdf
Idempotency-Key: <UUID>                        (para payments)
X-Request-ID: <UUID>                           (generado por cliente)
```

**Response:**
```
X-Request-ID: <UUID>                           (para tracing)
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 2026-08-23T12:35:00Z
```

---

## Rate Limiting Estrategia

| Endpoint | Limit | Window | Apply |
|---|---|---|---|
| POST /auth/login | 5 | 1 min | Per IP |
| GET /portals | 100 | 1 min | Per IP |
| POST /form-submissions | 10 | 1 min | Per IP |
| POST /transactions/intent | 5 | 1 min | Per IP |
| POST /transactions/:id/pay | 1 | 1 min | Per IP |
| GET /admin/* | 1000 | 1 min | Per JWT |
| POST /webhooks/* | 1000 | 1 min | Per API key |

---

**Status:** API boundaries defined, ready for implementation
