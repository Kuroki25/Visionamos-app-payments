# TECHNICAL_RISKS.md — Red Coopagos Backend

**Status:** FASE 2.0 — Auditoría Completada  
**Fecha:** 2026-08-23

---

## Matriz de Riesgos

Clasificación: 🔴 CRÍTICO | 🟠 ALTO | 🟡 MEDIO | 🟢 BAJO

---

## 🔴 RIESGOS CRÍTICOS

### R001: Sin Autenticación implementada

**Severidad:** 🔴 CRÍTICO  
**Componente:** apps/api  
**Descripción:** No existe JWT, sesiones ni guards en NestJS.

**Impacto:**
- Cualquier usuario no autenticado puede potencialmente acceder a endpoints
- Breach de confidencialidad de datos administrativos
- No hay trazabilidad de actor (quién hizo qué)

**Evidencia:**
- main.ts: Sin middleware de autenticación
- app.module.ts: Sin JWT provider
- Sin @nestjs/jwt instalado
- Sin strategy de Passport
- Sin guards implementados

**Remediación (FASE 3):**
- Instalar @nestjs/jwt, @nestjs/passport, passport-jwt
- Crear JwtStrategy
- Implementar JwtAuthGuard
- Proteger endpoints administrativos
- Deadline: CRÍTICO - Antes de cualquier endpoint público

---

### R002: Sin Autorización (RBAC + Scope) implementada

**Severidad:** 🔴 CRÍTICO  
**Componente:** apps/api  
**Descripción:** No existe validación de ROLE + SCOPE + RECURSO.

**Impacto:**
- ADMIN_PORTAL puede acceder a otros portales (BOLA)
- ADMIN_COMMERCE puede operar sobre otros comercios (BFLA)
- Escalamiento horizontal y vertical sin restricción
- Violación grave de separación de datos

**Evidencia:**
- Sin @Roles() decorator
- Sin @Scope() decorator
- Sin RolesGuard
- Sin ScopeGuard
- Sin validación de portalId en queries

**Requerimiento de negocio:**
```
PERMISO + SCOPE + RECURSO (ROLE_PERMISSION_MATRIX.md)
```

**Remediación (FASE 3):**
- Crear RolesGuard
- Crear ScopeGuard
- Implementar decoradores @Roles(), @Scope()
- Validar CADA endpoint contra scope del usuario
- Deadline: CRÍTICO - Antes de endpoint de datos sensibles

---

### R003: Sin Base de Datos configurada

**Severidad:** 🔴 CRÍTICO  
**Componente:** apps/api  
**Descripción:** No hay ORM, no hay driver de BD, no hay schema.

**Impacto:**
- Sin persistencia, sin datos
- Imposible validar lógica de negocio
- Sin migraciones = sin versionado de schema
- Sin transacciones = integridad comprometida

**Evidencia:**
- Sin Prisma, TypeORM, o similar en package.json
- Sin pg, mysql2, etc.
- Sin carpeta database/
- Sin entidades ORM

**Remediación (FASE 3):**
- Elegir ORM: PostgreSQL + Prisma (recomendado)
- Definir schema based on DOMAIN_MODEL.md
- Crear migraciones
- Deadline: CRÍTICO - Antes de implementar módulos

---

### R004: Sin datos administrativos iniciales

**Severidad:** 🔴 CRÍTICO  
**Componente:** apps/api  
**Descripción:** Sin seeds, sin SUPERADMIN inicial, sin datos de prueba.

**Impacto:**
- Sin usuario para loguear
- Sistema inoperable desde inicio
- Ciclo dev bloqueado

**Remediación (FASE 3):**
- Crear seed script
- Crear SUPERADMIN initial
- Crear test data (Portals, Commerces, etc.)
- Deadline: Antes de testeo E2E

---

## 🟠 RIESGOS ALTOS

### R005: Sin Validación de entrada

**Severidad:** 🟠 ALTO  
**Componente:** apps/api  
**Descripción:** class-validator presente pero sin uso. Sin Zod DTOs.

**Impacto:**
- SQL injection (cuando se implemente BD)
- XSS en formularios
- Lógica de negocio violada por datos inválidos

**Evidencia:**
- app.controller.ts: Sin ValidationPipe
- Sin DTO con validadores
- Sin ParseIntPipe, etc.

**Remediación (FASE 3):**
- Global ValidationPipe en main.ts
- Crear DTOs con Zod
- Validar CADA input
- Deadline: ALTO - Antes de endpoints públicos

---

### R006: Sin manejo global de errores

**Severidad:** 🟠 ALTO  
**Componente:** apps/api  
**Descripción:** Sin exception filters personalizados.

**Impacto:**
- Stack traces expuestos al cliente
- Información sensible en errores
- Inconsistencia en formato de respuesta

**Evidencia:**
- Sin AllExceptionsFilter
- main.ts: Sin catch global
- app.service.ts: Sin error handling

**Remediación (FASE 3):**
- Crear AllExceptionsFilter
- Implementar RFC 9457 Problem Details
- Mask stack traces en production
- Deadline: ALTO - Antes de deployment

---

### R007: Sin rate limiting por usuario

**Severidad:** 🟠 ALTO  
**Componente:** apps/api  
**Descripción:** ThrottlerModule global pero sin granularidad por usuario/IP.

**Impacto:**
- DoS brute-force en login
- Scraping no controlado
- Abuso de API pública

**Evidencia:**
- ThrottlerModule solo global (100 req/min)
- Sin custom throttling per endpoint
- Sin IP-based throttling

**Remediación (FASE 3):**
- Agregar ThrottlerGuard a endpoints sensibles
- Custom strategies per endpoint
- IP-based tracking para portal público
- Deadline: ALTO - Antes de deployment

---

### R008: CORS muy flexible

**Severidad:** 🟠 ALTO  
**Componente:** apps/api  
**Descripción:** CORS configurable en env, defaults a localhost:3000,3001.

**Impacto:**
- En production, si CORS_ORIGINS mal configurado = CSRF posible
- Cualquier dominio podría hacer requests

**Evidencia:**
```typescript
// main.ts
const corsOrigins = corsOriginsStr.split(',').map(...);
app.enableCors({ origin: corsOrigins, ... });
```

**Remediación (FASE 3):**
- Validar CORS_ORIGINS en startup
- Logging de rechazo CORS
- En production, whitelist explícita
- Deadline: ALTO - Antes de deployment

---

### R009: Sin logging de PII

**Severidad:** 🟠 ALTO  
**Componente:** apps/api  
**Descripción:** Sin mecanismo para evitar logging de PII (documentos, emails, etc.).

**Impacto:**
- Exposición de datos personales en logs
- Breach de GDPR/protección de datos
- Auditoría fallida

**Evidencia:**
- Sin logger centralizado
- console.log en main.ts sin masking
- Sin PII detection

**Remediación (FASE 3):**
- Implementar Winston/Pino con custom formatters
- Masking de documentos, emails, phones
- Auditor must review logs
- Deadline: ALTO - Antes de datos reales

---

## 🟡 RIESGOS MEDIOS

### R010: Sin Swagger/OpenAPI

**Severidad:** 🟡 MEDIO  
**Componente:** apps/api  
**Descripción:** API sin documentación automática.

**Impacto:**
- Dificultad para frontend onboarding
- Endpoints mal entendidos
- Testing manual complejo

**Remediación (FASE 3):**
- @nestjs/swagger
- @ApiOperation, @ApiResponse decoradores
- Deadline: MEDIO - Antes de QA

---

### R011: Sin Request ID / Correlation tracking

**Severidad:** 🟡 MEDIO  
**Componente:** apps/api  
**Descripción:** Sin mechanism para trackear requests end-to-end.

**Impacto:**
- Debugging difícil
- Auditoría incompleta
- Tracing para observabilidad imposible

**Remediación (FASE 3):**
- Middleware para generar Request ID
- Incluir en logs
- Pasar a frontend en response headers
- Deadline: MEDIO - Antes de production monitoring

---

### R012: Sin Secrets management

**Severidad:** 🟡 MEDIO  
**Componente:** apps/api  
**Descripción:** Sin .env parsing, sin validación de secretos.

**Impacto:**
- Variables críticas (DB_PASSWORD, JWT_SECRET) mal manejadas
- Sin rotación de secrets
- Potencial leak

**Evidencia:**
- `.env.example` presente pero vacío
- `process.env.*` acceso directo
- Sin zod validation de env

**Remediación (FASE 3):**
- @nestjs/config
- Zod validation de .env
- Secrets en vault (no en repo)
- Deadline: MEDIO - Antes de deployment

---

### R013: Sin tests

**Severidad:** 🟡 MEDIO  
**Componente:** apps/api  
**Descripción:** Jest configurado pero sin tests.

**Impacto:**
- Sin validación automatizada
- Regressions no detectadas
- Refactoring arriesgado

**Remediación (FASE 3):**
- Unit tests para services
- Integration tests para controllers
- E2E tests para flujos críticos
- Deadline: MEDIO - Coverage > 70%

---

### R014: Sin idempotencia en transacciones

**Severidad:** 🟡 MEDIO  
**Componente:** apps/api  
**Descripción:** Sin mecanismo para detectar duplicados en pagos.

**Impacto:**
- Doble-cargo posible
- Cliente confundido por duplicados

**Evidencia:**
- Sin idempotency key support
- Sin deduplicación en TransactionController

**Remediación (FASE 3):**
- Header Idempotency-Key
- Cachear results por key
- TTL para cache
- Deadline: ALTO para payments - Antes de implementar pago

---

## 🟢 RIESGOS BAJOS

### R015: Estructura de carpetas puede cambiar

**Severidad:** 🟢 BAJO  
**Descripción:** Sin modules claros aún. Organización por definir.

**Impacto:** Refactoring futuro de carpetas.

**Remediación:** FASE 3 (Architecture).

---

## Tabla consolidada

| ID | Risk | Severidad | Componente | Status | Deadline |
|---|---|---|---|---|---|
| R001 | Sin Autenticación | 🔴 CRÍTICO | api | BLOQUEADOR | CRÍTICO |
| R002 | Sin Autorización | 🔴 CRÍTICO | api | BLOQUEADOR | CRÍTICO |
| R003 | Sin Base de Datos | 🔴 CRÍTICO | api | BLOQUEADOR | CRÍTICO |
| R004 | Sin Datos Iniciales | 🔴 CRÍTICO | api | BLOQUEADOR | CRÍTICO |
| R005 | Sin Validación entrada | 🟠 ALTO | api | IMPORTANTE | ALTO |
| R006 | Sin Exception Filter | 🟠 ALTO | api | IMPORTANTE | ALTO |
| R007 | Sin rate limit usuario | 🟠 ALTO | api | IMPORTANTE | ALTO |
| R008 | CORS muy flexible | 🟠 ALTO | api | IMPORTANTE | ALTO |
| R009 | Sin masking PII | 🟠 ALTO | api | IMPORTANTE | ALTO |
| R010 | Sin Swagger | 🟡 MEDIO | api | MEJORA | MEDIO |
| R011 | Sin Request ID | 🟡 MEDIO | api | MEJORA | MEDIO |
| R012 | Sin Secrets mgmt | 🟡 MEDIO | api | MEJORA | MEDIO |
| R013 | Sin tests | 🟡 MEDIO | api | MEJORA | MEDIO |
| R014 | Sin idempotencia | 🟡 MEDIO | api | MEJORA | ALTO (payments) |
| R015 | Carpetas cambiarán | 🟢 BAJO | api | ACEPTABLE | FASE 3 |

---

## Recomendación de orden de remediación

**Fase de Implementación (FASE 3):**

1. **Sprint 1:** R001, R002, R003, R004 (CRÍTICOS - Requieren TODOS)
2. **Sprint 2:** R005, R006, R007, R008, R009
3. **Sprint 3:** R010, R011, R012, R013, R014

---

**Status:** Auditoría completada. Riesgos documentados para FASE 3.
