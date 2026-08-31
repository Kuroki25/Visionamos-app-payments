# MONOREPO_AUDIT.md — Red Coopagos

**Auditoría realizada:** 2026-08-23  
**Phase:** FASE 2.0 — AUDITORÍA TÉCNICA DEL MONOREPO REAL  
**Status:** COMPLETADO  
**Auditor:** Claude Code (Principal Software Architect)

---

## 1. RESUMEN EJECUTIVO

Red Coopagos utiliza un **monorepo pnpm con 3 aplicaciones separadas**:

```
@visionamos/monorepo (pnpm workspaces)
├── apps/admin (Next.js 16)          ← Backoffice Administrativo
├── apps/api (NestJS 11)              ← Backend API
└── apps/web (Next.js 16)             ← Portal Público

packages/
├── schemas/                           ← Zod schemas
└── types/                             ← Tipos TypeScript compartidos
```

**El monorepo está **bien estructurado** desde el punto de vista de separación de responsabilidades.**

La configuración de seguridad en main.ts (NestJS) está presente pero el dominio funcional **NO está implementado todavía** en el backend. La API es un stub básico.

---

## 2. STACK Y VERSIONES

### Información crítica

| Componente | Versión | Status |
|---|---|---|
| **Node.js** | >=20.0.0 | ✅ Correcto |
| **pnpm** | (actual) | ✅ Correcto |
| **TypeScript** | 5.6.2 (forzado override) | ✅ Correcto |
| **Next.js** (admin/web) | ^16.0.0 | ✅ Correcto |
| **NestJS** (api) | ^11.0.0 | ✅ Correcto |
| **React** | (via Next.js) | ✅ Correcto |
| **Zod** | ^3.22.4 | ✅ Compartido frontend/backend |
| **ESLint** | ^8.56.0 | ✅ Compartido |
| **Prettier** | ^3.3.0 | ✅ Compartido |

### Dependencias NestJS

```
@nestjs/common ^11.0.0
@nestjs/core ^11.0.0
@nestjs/platform-express ^11.0.0
@nestjs/throttler ^6.0.0 (rate limiting)
@nestjs/testing ^11.0.0

class-transformer ^0.5.1
class-validator ^0.14.1
helmet ^7.2.0
reflect-metadata ^0.2.2
rxjs ^7.8.1
zod ^3.22.4

Testing: Jest ^29.7.0, ts-jest ^29.1.2
```

### Observaciones sobre stack

- ✅ **Zod presente:** Mismo que frontend, permite contracts compartidos.
- ✅ **Helmet presente:** Headers de seguridad.
- ✅ **Throttler presente:** Rate limiting configurable por env.
- ⚠️ **NO hay ORM instalado:** Requiere decisión (TypeORM, Prisma, etc.).
- ⚠️ **NO hay driver de database:** Requiere decisión (PostgreSQL, MySQL, etc.).
- ⚠️ **NO hay JWT:** Autenticación pendiente.
- ⚠️ **NO hay logging:** Winston/Pino no presente.
- ⚠️ **NO hay Swagger:** OpenAPI no configurado.

---

## 3. ESTRUCTURA DE APLICACIONES

### 3.1 apps/admin (Backoffice Next.js)

**Propósito:** Panel de control administrativo para gestionar la plataforma.

**Estructura:**
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login
│   │   └── logout
│   └── (dashboard)/
│       ├── page.tsx (dashboard principal)
│       ├── portales/
│       ├── portal/[portalId]/
│       ├── portal/[portalId]/aliado/[aliadoId]/
│       ├── transacciones/
│       ├── usuarios/
│       ├── configuracion/
│       └── profile/
├── components/
│   ├── dialogs/ (create-portal, create-aliado, create-user, etc.)
│   ├── ui/ (primitivos shadcn/ui)
│   └── layout (header, sidebar, etc.)
└── lib/
    ├── domain/
    │   ├── types.ts ← TIPOS CANÓNICOS
    │   └── mocks.ts ← DATOS DE PRUEBA
    └── utils/
```

**Tipos detectados en mocks.ts:**
- `Portal` ✅
- `Aliado` ✅ (= Comercio)
- `Transaction` ✅
- `Movement` ✅
- `User` ✅
- `UserRole` (SUPERADMIN, ADMIN_PORTAL, ADMIN_COMMERCE, VIEWER) ✅
- `AliadoType`, `EntityStatus`, `TransactionStatus`, `PaymentMethod`, `MovementType`

**Rutas principales:**
- GET `/` → Dashboard KPIs
- GET `/portales` → Listar portales
- GET `/portal/[portalId]` → Detalle portal + aliados
- GET `/portal/[portalId]/aliado/[aliadoId]` → Detalle aliado + transacciones/movimientos
- GET `/transacciones` → Tabla transacciones
- GET `/usuarios` → Gestión usuarios administrativos
- GET `/configuracion` → Configuración general
- GET/POST `/login`, `/logout` → Autenticación

**Componentes de UI:**
- CreatePortalDialog
- CreateAliadoDialog
- CreateUserDialog
- EditUserDialog
- DeleteUserDialog
- DisableUserDialog
- DataTable (componente genérico)
- MetricCard, Header, Sidebar

**Estado:** Frontend está bien estructurado con mocks. **NO conecta aún al backend real.**

---

### 3.2 apps/api (Backend NestJS)

**Propósito:** API REST para Backoffice y Portal Público.

**Estructura actual:**
```
src/
├── main.ts                    ← Bootstrap
├── app.module.ts              ← Root module
├── app.controller.ts          ← Controller stub
├── app.service.ts             ← Service stub
└── (sin módulos de dominio)
```

**main.ts (Seguridad):**
- ✅ Helmet habilitado
- ✅ CORS configurado (almacena origins en env CORS_ORIGINS)
- ✅ Trust proxy configurable
- ✅ Request payload limit: 1MB
- ✅ Shutdown hooks habilitados
- ✅ Logger básico con console.log

**app.module.ts:**
- ThrottlerModule configurado
- TTL window: env RATE_LIMIT_WINDOW_MS (default 60000ms)
- Límite: env RATE_LIMIT_MAX_REQUESTS (default 100 req/min)

**Estado:** Solo estructura básica de NestJS. **Sin lógica de negocio, sin autenticación, sin base de datos.**

---

### 3.3 apps/web (Portal Público Next.js)

**Propósito:** Interfaz pública para clientes/pagadores.

**Estructura detectada:** No inspeccionada en detalle en esta auditoría.

**Nota:** El Portal Público debe consumir endpoints públicos del API NestJS (sin autenticación de AppUser).

---

## 4. PACKAGES COMPARTIDOS

### packages/types

Contiene tipos TypeScript compartidos entre frontend y backend.

**Nota:** Estructura exacta no inspeccionada, pero debe incluir tipos de dominio.

### packages/schemas

Contiene schemas Zod compartidos entre frontend y backend.

**Nota:** Estructura exacta no inspeccionada.

---

## 5. CONFIGURACIÓN Y CONVENCIONES

### tsconfig.json

- TypeScript 5.6.2 (strict mode, confirmado)
- Compilación a ES2020
- Module commonjs (NestJS)
- ESM en package.json raíz

### Scripts de desarrollo

```bash
pnpm dev                    # Todas las apps en paralelo
pnpm build                  # Build de todas las apps
pnpm typecheck              # TypeScript sin emitir
pnpm lint                   # ESLint
pnpm test                   # Jest
pnpm security:audit         # npm audit recursivo
pnpm format                 # Prettier
```

### Variables de entorno

Detectadas en código:

**NestJS (api/src/main.ts):**
```
PORT              (default 3002)
HOST              (default 0.0.0.0)
NODE_ENV
CORS_ORIGINS      (comma-separated, default localhost:3000,3001)
TRUST_PROXY       (default 0)
RATE_LIMIT_WINDOW_MS     (default 60000)
RATE_LIMIT_MAX_REQUESTS  (default 100)
```

**Archivo:** `.env.example` presente (no inspeccionado en detalle).

---

## 6. AUTENTICACIÓN Y AUTORIZACIÓN

### Estado actual

**Backend:** ❌ NO IMPLEMENTADA

- Sin JWT
- Sin sesiones
- Sin guards
- Sin middleware de autenticación
- Sin schema de usuarios

**Frontend (admin):**
- Login page presente
- Logout page presente
- User mocks presentes
- **Pero sin integración con backend real.**

### Requerimiento de negocio

Según ROLE_PERMISSION_MATRIX.md:

```
SUPERADMIN          (Global scope)
ADMIN_PORTAL        (Portal scope)
ADMIN_COMMERCE      (Commerce scope)
VIEWER              (Read-only, variable scope)

Autorización: ROLE + SCOPE + RESOURCE (no solo rol)
```

---

## 7. BASE DE DATOS

### Estado actual

**❌ SIN CONFIGURACIÓN**

- Sin ORM instalado
- Sin driver de base de datos
- Sin entidades
- Sin migraciones
- Sin seeds

### Necesario

Decisión sobre:
1. **ORM:** TypeORM, Prisma, Sequelize, etc.
2. **Database:** PostgreSQL (recomendado), MySQL, etc.
3. **Connection pool:** Configuración
4. **Migrations:** Strategy (Typeorm migrations, Prisma migrations, etc.)

---

## 8. LOGGING Y OBSERVABILIDAD

### Estado actual

**Mínimo:**
- `console.log` en main.ts para startup
- `console.error` en bootstrap catch
- Sin structured logging
- Sin correlationID / requestID
- Sin métricas

### Riesgo

- ⚠️ Sin logs estructurados
- ⚠️ Sin request tracking
- ⚠️ Potencial exposición de error stacks en respuestas

---

## 9. TESTING

### Backend (NestJS)

- Jest configurado en package.json
- `@nestjs/testing` presente
- Sin tests actuales
- Sin fixtures
- Sin integration tests

### Frontend

- Testing no evaluado en esta auditoría

---

## 10. AUDITORÍA DE SEGURIDAD

### Baseline actual

| Categoría | Estado | Evidencia |
|---|---|---|
| **CORS** | ⚠️ Configurable | Hardcoded en main.ts, depende de env |
| **Rate Limiting** | ✅ Presente | ThrottlerModule configurado |
| **Helmet** | ✅ Presente | Headers de seguridad |
| **Payload Size** | ✅ Limitado | 1MB |
| **Autenticación** | ❌ AUSENTE | Sin JWT, guards, estrategia |
| **Autorización** | ❌ AUSENTE | Sin guards, sin RBAC |
| **Input Validation** | ⚠️ Parcial | class-validator presente pero sin uso |
| **Error Handling** | ⚠️ BÁSICO | Sin filters personalizados |
| **Logging de PII** | ❌ RIESGO | Sin control |
| **Secrets** | ❌ RIESGO | Sin gestión de env secrets |

### Riesgos OWASP identificados

| Risk | Severidad | Evidencia |
|---|---|---|
| **Broken Access Control (BOLA)** | 🔴 CRÍTICO | Sin autenticación/autorización implementadas |
| **No Authentication** | 🔴 CRÍTICO | Endpoints sin guards |
| **CORS Misconfiguration** | 🟠 ALTO | Flexible, depende de env |
| **Injection** | 🟠 ALTO | Sin ORM aún, SQL inyección posible cuando se implemente |
| **Error Leakage** | 🟡 MEDIO | Sin exception filters personalizados |
| **Missing Rate Limiting** | 🟡 MEDIO | Configurado pero podría eludirse |
| **Secrets Exposure** | 🟡 MEDIO | Variables en env, sin validación |

---

## 11. COMPARACIÓN: DOCUMENTACIÓN vs CÓDIGO

### BUSINESS_TECH_GAP_ANALYSIS

| Requerimiento | Fuente | Actual | Status | Gap |
|---|---|---|---|---|
| **Portal** | DOMAIN_MODEL | Tipos en mocks (frontend) | PARTIAL | Sin tabla, sin ORM, sin endpoints |
| **Commerce/Aliado** | DOMAIN_GLOSSARY | Tipos en mocks (frontend) | PARTIAL | Sin tabla, sin ORM, sin endpoints |
| **AppUser** | ROLE_PERMISSION_MATRIX | Tipos en mocks (frontend) | PARTIAL | Sin tabla, sin ORM, sin autenticación |
| **Roles (SUPERADMIN/ADMIN_PORTAL/ADMIN_COMMERCE/VIEWER)** | ROLE_PERMISSION_MATRIX | Tipos en mocks (frontend) | PARTIAL | Sin guards, sin middleware, sin lógica |
| **Authorization (ROLE+SCOPE+RESOURCE)** | ROLE_PERMISSION_MATRIX | No implementada | MISSING | Crítico: sin guards |
| **Category** | DOMAIN_MODEL | No implementada | MISSING | Sin tabla, sin endpoints |
| **Service** | DOMAIN_MODEL | No implementada | MISSING | Sin tabla, sin endpoints |
| **Transaction** | DOMAIN_MODEL | Tipos en mocks (frontend) | PARTIAL | Sin tabla, sin ORM, sin endpoints |
| **Movement** | DOMAIN_MODEL | Tipos en mocks (frontend) | PARTIAL | Sin tabla, sin ORM, sin endpoints |
| **PayerData** | DOMAIN_MODEL | No implementada | MISSING | Requerido para Portal Público |
| **Dynamic Forms** | DOMAIN_MODEL | No implementada | MISSING | Complejo, requiere especificación |
| **Payment Flow** | PAYMENT_FLOW_MODEL | No implementada | MISSING | Crítico para negocio |
| **Public API (sin auth)** | DOMAIN_GLOSSARY | No implementada | MISSING | Requerido para Portal Público |
| **Admin API (con auth)** | ROLE_PERMISSION_MATRIX | No implementada | MISSING | Crítico para Backoffice |

### Resumen del Gap

El backend es **100% nueva implementación requerida**. El frontend (admin/web) tiene tipos y mocks que reflejan el modelo, pero **sin código backend que soporte**.

---

## 12. DEUDA TÉCNICA IDENTIFICADA

| Elemento | Severidad | Descripción |
|---|---|---|
| **Autenticación** | 🔴 CRÍTICO | Sin JWT, sin sesiones, sin guards |
| **Autorización** | 🔴 CRÍTICO | Sin RBAC, sin validación de scope |
| **Base de datos** | 🔴 CRÍTICO | Sin ORM, sin entidades, sin schema |
| **Logging estructurado** | 🟠 ALTO | Sin Winston, Pino, u otro logger |
| **OpenAPI/Swagger** | 🟠 ALTO | Sin documentación de API |
| **Exception Handling** | 🟡 MEDIO | Sin global exception filter |
| **Validación de entrada** | 🟡 MEDIO | class-validator presente pero sin uso |
| **Tests unitarios** | 🟡 MEDIO | Jest presente, sin tests |
| **Secrets management** | 🟡 MEDIO | Sin .env parsing, sin validación |

---

## 13. DECISIONES PENDIENTES DE NEGOCIO

Las siguientes cuestiones **NO se pueden resolver en auditoría**, pero **impactan arquitectura**:

Del documento DECISIONS_PENDING.md:

- [ ] Origen definitivo de obligación (¿consulta externa? ¿almacenada?)
- [ ] Pago parcial (¿permitido?)
- [ ] Límite de sobrepago (¿cuánto?)
- [ ] Modelo final de métodos de pago (¿solo PSE, tarjeta, transferencia, efectivo?)
- [ ] Devoluciones (¿manual? ¿automática?)
- [ ] Reversos (¿scope?)
- [ ] Liquidaciones (¿frecuencia? ¿modelo?)
- [ ] Comisiones (¿quién paga? ¿modelo?)
- [ ] Conciliación (¿manual? ¿automática?)

**Impacto técnico:** Definen schema, workflows, endpoints, eventos.

---

## 14. MÓDULOS NECESARIOS (Candidatos para FASE 3)

Basado en DOMAIN_MODEL.md, candidatos para arquitectura NestJS:

```
@nestjs/identity-access          Identity & Access Control
  ├── controllers/auth
  ├── services/auth
  ├── guards/jwt.guard
  ├── decorators/roles
  └── entities/appUser, role, roleAssignment

@nestjs/administration           Network/Portal Management
  ├── controllers/portals, commerces, categories
  ├── services/portal, commerce, category
  ├── entities/portal, commerce, category
  └── dto/

@nestjs/commerce-catalog        Servicios
  ├── controllers/services
  ├── services/service
  ├── entities/service
  └── dto/

@nestjs/dynamic-forms            Formularios dinámicos
  ├── controllers/forms, submissions
  ├── services/form, submission
  ├── entities/formDefinition, formVersion, formField, formSubmission
  └── dto/

@nestjs/payments                 Pagos (crítico)
  ├── controllers/transactions, payerData
  ├── services/transaction, payment, obligation
  ├── entities/transaction, transactionEvent, payerData
  ├── providers/external-payment-gateway
  └── dto/

@nestjs/reporting               Reportes
  ├── controllers/reports
  ├── services/report
  └── queries/

@nestjs/audit                   Auditoría
  ├── services/audit
  ├── entities/auditEvent
  └── listeners/

@nestjs/integrations            Webhooks, proveedores externos
  ├── controllers/webhooks
  ├── services/webhook, integration
  └── entities/
```

Nota: Estas son **candidatas**. La arquitectura final se define en FASE 3.

---

## 15. RECOMENDACIONES INMEDIATAS

### Prioridad 🔴 (Bloquea desarrollo)

1. **Elegir ORM y database:**
   - Recomendación: PostgreSQL + Prisma (madurez, DX)
   - Alternativa: PostgreSQL + TypeORM (compatible con NestJS)

2. **Implementar autenticación JWT:**
   - @nestjs/jwt
   - Guards globales o por ruta
   - Refresh token strategy

3. **Implementar autorización RBAC:**
   - Guards personalizados (Roles, Scope)
   - Decoradores (@Roles, @Scope)
   - Validación server-side de ROLE+SCOPE+RESOURCE

### Prioridad 🟠 (Importante)

4. **Agregar logging estructurado:**
   - Winston o Pino
   - Correlation ID para tracing
   - Masking de PII

5. **Configurar OpenAPI/Swagger:**
   - @nestjs/swagger
   - Documentar endpoints públicos vs privados

6. **Global Exception Filter:**
   - Manejo de errores centralizado
   - RFC 9457 Problem Details (consideración)

### Prioridad 🟡 (Mejora)

7. Migrar Zod schemas a DTOs con Zod
8. Agregar validación de .env con Zod
9. Tests unitarios e integration tests
10. CI/CD (GitHub Actions u otra)

---

## 16. ARCHIVOS GENERADOS

Auditoría completada. Documentos creados:

```
docs/backend/architecture/
├── MONOREPO_AUDIT.md                    ← ESTE ARCHIVO
├── CURRENT_ARCHITECTURE.md
├── TECHNICAL_RISKS.md
├── SECURITY_BASELINE_CURRENT.md
└── BUSINESS_TECH_GAP_ANALYSIS.md

docs/backend/state/
└── PROJECT_BACKEND_STATE.md             ← ACTUALIZADO
```

---

## 17. PRÓXIMOS PASOS

**FASE 2.0 COMPLETADA.**

**NO ejecutar automáticamente FASE 3.0.**

El usuario debe:
1. Revisar esta auditoría
2. Solicitar cambios o confirmación
3. Aprobar arquitectura objetivo
4. **Entonces** Claude comienza FASE 3.0 (Arquitectura e Implementación)

---

**Auditoría realizada por:** Claude Code  
**Fecha:** 2026-08-23  
**Status:** COMPLETADO ✅  
**Siguiente:** Esperar aprobación del usuario
