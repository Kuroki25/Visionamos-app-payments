# CURRENT_ARCHITECTURE.md — Red Coopagos

**Status:** FASE 2.0 — Auditoría Completada  
**Fecha:** 2026-08-23

---

## Arquitectura Actual

```
┌─────────────────────────────────────────────────────────────┐
│                   RED COOPAGOS MONOREPO                      │
│              pnpm workspaces + Turborepo (No presente)       │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┬──────────────────┬──────────────────┐
│  apps/admin      │   apps/api       │   apps/web       │
│  (Next.js 16)    │  (NestJS 11)     │  (Next.js 16)    │
│  Backoffice      │  Backend REST    │  Portal Público  │
└──────────────────┴──────────────────┴──────────────────┘
        │                  │                  │
        │                  │                  │
        ├──────────────────┼──────────────────┤
                           │
                   ┌───────▼────────┐
                   │  NestJS API    │
                   │  (Port 3002)   │
                   │  ❌ Sin DB aún │
                   └────────────────┘
        │                                     │
        └─────────────────────────────────────┘
                    Consumidores API

┌──────────────────┬──────────────────┐
│  packages/types  │ packages/schemas │
│  (Tipos TS)      │ (Zod schemas)    │
└──────────────────┴──────────────────┘
         │                 │
         └─────────────────┘
         Compartidos entre apps
```

---

## Componentes

### 1. Backoffice (apps/admin)

**Responsabilidad:**
- UI para gestión administrativa
- Crear/editar Portales, Comercios, Usuarios
- Consultar transacciones y reportes
- Requiere autenticación como AppUser

**Arquitectura interna:**
```
Next.js App Router
├── (auth) layout group
│   ├── /login
│   └── /logout
│
├── (dashboard) layout group
│   ├── / (KPIs)
│   ├── /portales (lista)
│   ├── /portal/[portalId] (detalle + aliados)
│   ├── /portal/[portalId]/aliado/[aliadoId] (detalle aliado)
│   ├── /transacciones (tabla)
│   ├── /usuarios (gestión)
│   ├── /configuracion
│   └── /profile
│
├── components/ (UI + dialogs)
├── lib/domain/ (tipos + mocks)
└── lib/utils/ (helpers)
```

**Dependencias de backend:**
- GET /api/auth/login
- GET/POST /api/portals
- GET /api/portals/:id
- GET /api/portals/:id/commerces
- GET /api/commerces/:id
- GET /api/transactions
- GET /api/users
- POST/PUT /api/users
- etc.

**Estado:** Interfaz lista, mocks presentes, **sin integración real**.

---

### 2. Backend API (apps/api)

**Responsabilidad:**
- REST API para Backoffice y Portal Público
- Lógica de negocio
- Persistencia
- Autenticación y autorización

**Arquitectura actual:**
```
NestJS 11 Bootstrap
├── main.ts
│   ├── Helmet (headers de seguridad)
│   ├── CORS (configurable)
│   ├── Payload limit (1MB)
│   └── Shutdown hooks
│
└── app.module
    └── ThrottlerModule (rate limiting)
        ├── TTL: env RATE_LIMIT_WINDOW_MS
        └── Limit: env RATE_LIMIT_MAX_REQUESTS

AppController (stub)
AppService (stub)
```

**Estructura esperada (no presente):**
```
src/
├── modules/
│   ├── auth/ (JWT, sessions, guards)
│   ├── users/ (AppUser management)
│   ├── portals/ (Portal CRUD)
│   ├── commerces/ (Comercio/Aliado CRUD)
│   ├── categories/ (Categoría CRUD)
│   ├── services/ (Servicio CRUD)
│   ├── forms/ (FormDefinition, FormVersion, FormSubmission)
│   ├── transactions/ (Transaction, lifecycle)
│   ├── payments/ (PaymentIntent, PaymentObligation)
│   ├── reporting/ (Reports)
│   └── audit/ (AuditEvent logging)
│
├── common/
│   ├── guards/ (JWT, Roles, Scope)
│   ├── decorators/ (@Roles, @Scope, @User)
│   ├── pipes/ (Validation)
│   ├── filters/ (Exception handling)
│   ├── interceptors/ (Logging, transformation)
│   └── middleware/ (Request tracking)
│
├── database/
│   ├── entities/ (ORM models)
│   ├── migrations/
│   ├── seeds/
│   └── config/
│
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── auth.config.ts
│   └── env.validation.ts
│
└── main.ts
```

**Estado:** Solo skeleton, implementación pendiente.

---

### 3. Portal Público (apps/web)

**Responsabilidad:**
- UI pública para cliente/pagador
- Navegar Portales, Comercios, Servicios
- Diligenciar formularios dinámicos
- Iniciar pagos

**Arquitectura interna:** No evaluada en profundidad en esta auditoría.

**Dependencias de backend:**
- GET /api/public/portals
- GET /api/public/portals/:id
- GET /api/public/commerces/:id
- GET /api/public/services/:id
- GET /api/public/forms/:id/version/:version
- POST /api/public/form-submissions
- POST /api/public/transactions/intent
- POST /api/public/transactions/:id/pay
- etc.

**Estado:** No conectado al backend real.

---

## Flujos de datos

### Flujo Backoffice

```
Usuario → Login (apps/admin)
          ↓
        POST /api/auth/login
          ↓
        JWT Token
          ↓
        Header: Authorization: Bearer <token>
          ↓
        Backoffice API endpoints (PROTEGIDOS)
          ↓
        Respuesta JSON
```

### Flujo Portal Público

```
Cliente → Browse Portal Público (apps/web)
          ↓
        GET /api/public/portals
          ↓
        Respuesta JSON (SIN autenticación)
          ↓
        Select Comercio → GET /api/public/commerces/:id
          ↓
        Diligenciar formulario
          ↓
        POST /api/public/form-submissions
          ↓
        Iniciar pago → POST /api/public/transactions/intent
          ↓
        Respuesta con payment intent
```

---

## Separación de superficies

### Actual

**No hay separación explícita de endpoints.**

### Esperada (Recomendación)

```
NestJS API
├── /api/admin/          (Protegido con JWT + RBAC)
│   ├── /auth
│   ├── /users
│   ├── /portals
│   ├── /commerces
│   ├── /transactions
│   └── ... (todas operaciones administrativas)
│
├── /api/public/         (Sin autenticación)
│   ├── /portals
│   ├── /commerces
│   ├── /services
│   ├── /forms
│   ├── /form-submissions
│   ├── /transactions/:id/intent
│   └── /transactions/:id/pay
│
└── /api/webhooks/       (Integraciones externas)
    ├── /payment-gateway
    └── /reconciliation
```

---

## Convenciones técnicas

### Nombrado

- **Plural en endpoints:** `/api/portals`, `/api/commerces` ✅
- **IDs en path params:** `/api/portals/:id` ✅
- **HTTP verbs:** GET, POST, PUT/PATCH, DELETE
- **Responses:** JSON con estructura coherente (TBD)

### Tipos compartidos

```
packages/types/
├── User, Role, RoleAssignment
├── Portal, Commerce, Category
├── Service, Form, Transaction
├── PaymentMethod, PaymentObligation
└── ...

packages/schemas/
├── Zod schemas para validación
├── Compartidos frontend/backend
└── DTOs derivados de schemas
```

### Base de datos

**Requerimientos aún por confirmar:**
- ORM: TypeORM vs Prisma vs otro
- Database: PostgreSQL (recomendado)
- Schema: Definir tablas, relaciones, índices
- Migrations: Strategy
- Transacciones: Necesarias para operaciones de pago

---

## Matriz de responsabilidades

| Concepto | Frontend Mocks | Backend | Database |
|---|---|---|---|
| Portal | ✅ Tipos definidos | ❌ Ausente | ❌ No hay schema |
| Commerce/Aliado | ✅ Tipos definidos | ❌ Ausente | ❌ No hay schema |
| AppUser | ✅ Tipos definidos | ❌ Ausente | ❌ No hay schema |
| Transaction | ✅ Tipos definidos | ❌ Ausente | ❌ No hay schema |
| Movement | ✅ Tipos definidos | ❌ Ausente | ❌ No hay schema |
| Authentication | ⚠️ UI presente | ❌ Sin JWT | ❌ Sin tabla users |
| Authorization | ⚠️ UI hiding | ❌ Sin guards | ❌ Sin tabla roles |
| PayerData | ❌ No en admin | ❌ Ausente | ❌ No hay schema |
| FormDefinition | ❌ No en admin | ❌ Ausente | ❌ No hay schema |

---

## Puntos de decisión arquitectónica

1. **ORM Strategy:**
   - Prisma (recomendado): mejor DX, TypeScript-first
   - TypeORM: más similar a otros ORMs, decorated entities

2. **Authentication:**
   - JWT (stateless) vs Sessions (stateful)
   - Recomendación: JWT para escalabilidad

3. **Module organization:**
   - Feature-based (actual estructura sugerida) vs Layer-based
   - Recomendación: Feature-based para Red Coopagos

4. **Validation:**
   - Zod en DTOs vs class-validator
   - Recomendación: Zod para consistencia con frontend

5. **Error handling:**
   - Standard HTTP codes vs Custom codes
   - Recomendación: RFC 9457 Problem Details

---

**Status:** Auditoría completada. Arquitectura objetivo se define en FASE 3.
