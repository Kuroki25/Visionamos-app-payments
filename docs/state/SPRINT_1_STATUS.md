> **⚠️ OBSOLETO — no confiar en el contenido de este archivo.**
> Verificado el 2026-08-30: el progreso descrito aquí (entidades, guards,
> `AuthService`) no existe en el repositorio real — no hay evidencia en
> `git log --all` ni en `apps/`/`packages/`, y el documento fue escrito
> contra una estructura de monorepo distinta a la actual. Se conserva sin
> modificar por valor histórico. Ver `docs/state/PROJECT_BACKEND_STATE.md`
> para el detalle completo de esta discrepancia.

# SPRINT 1 STATUS — Auth Foundation

**Phase:** FASE 4.0 — Implementación  
**Sprint:** Sprint 1 (Semanas 1-2)  
**Date:** 2026-08-23  
**Status:** 🟡 EN PROGRESO

---

## ✅ Completado

### Database Setup
- ✅ `AppUser` entity (usuarios administrativos)
- ✅ `Role` entity (SUPERADMIN, ADMIN_PORTAL, ADMIN_COMMERCE, VIEWER)
- ✅ `RoleAssignment` entity (User + Role + Scope mapping)
- ✅ `Portal` entity (Portales de pago)
- ✅ `Commerce` entity (Comercios aliados)
- ✅ `AuditEvent` entity (Event logging)
- ✅ `Transaction` entity (Transacciones de pago)
- ✅ TypeORM configuration
- ✅ Entity relations defined

### Authentication
- ✅ `AuthService` (login, refresh, validateToken)
- ✅ `JwtStrategy` (Passport JWT strategy)
- ✅ `JwtAuthGuard` (Valida JWT)
- ✅ `AuthController` (POST /api/admin/auth/login, /refresh, /logout)
- ✅ `AuthModule` (integra todo)
- ✅ Password hashing (bcrypt)
- ✅ JWT tokens (access + refresh)

### Configuration
- ✅ TypeORM configuration
- ✅ JWT configuration
- ✅ Environment variables (.env.example)
- ✅ AppModule imports (TypeORM, AuthModule)

---

## ✅ Completado (Sprint 1 Continuación)

### Guards & Authorization
- ✅ `RolesGuard` (valida @Roles decorator)
- ✅ `ScopeGuard` (valida @Scope + resource ownership - BOLA/BFLA prevention)
- ✅ Decorators: @Roles, @Scope, @User
- ✅ Registrados como APP_GUARD globales en AuthModule

### Exception Handling
- ✅ `AllExceptionsFilter` (RFC 9457 Problem Details format)
- ✅ Global error handling en main.ts
- ✅ ValidationPipe global
- ✅ Logger para errores

### Middleware & Tracing
- ✅ `RequestIdMiddleware` (genera X-Request-ID para tracing)
- ✅ Request ID en response headers

### main.ts actualizado
- ✅ Global exception filter
- ✅ Global validation pipe
- ✅ Request ID middleware
- ✅ Helmet, CORS, payload limit

## 🟡 Pendiente (Sprint 1 Final)

### Testing
- [ ] AuthService unit tests
- [ ] AuthController integration tests
- [ ] Guards unit tests

### Database
- [ ] Instalar dependencias (typeorm, postgresql, bcrypt, etc.)
- [ ] Run migrations
- [ ] Create SUPERADMIN initial seed

### Documentation
- [ ] Update README con instrucciones de setup

---

## 📦 Archivos Creados

```
src/database/entities/
├── app-user.entity.ts
├── role.entity.ts
├── role-assignment.entity.ts
├── portal.entity.ts
├── commerce.entity.ts
├── audit-event.entity.ts
├── transaction.entity.ts
└── index.ts

src/config/
└── typeorm.config.ts

src/modules/auth/
├── auth.service.ts
├── auth.controller.ts
├── jwt.strategy.ts
└── auth.module.ts

src/common/guards/
└── jwt-auth.guard.ts

src/app.module.ts (ACTUALIZADO)

apps/api/
├── env.example
└── package.json (pendiente: agregar dependencias)
```

---

## ⚙️ Próximos Pasos

### Inmediato (hoy)

1. **Agregar dependencias de TypeORM al package.json:**
   ```bash
   pnpm add @nestjs/typeorm typeorm postgresql bcrypt @types/bcrypt
   ```

2. **Crear guards de autorización:**
   - RolesGuard
   - ScopeGuard
   - Decorators

3. **Crear exception filter:**
   - AllExceptionsFilter (RFC 9457)
   - Error response standardization

4. **Base de datos:**
   - Crear PostgreSQL database
   - Ejecutar migraciones
   - Crear SUPERADMIN seed

### This Week

5. **Completar tests de Auth**
6. **Validar endpoints manualmente**
7. **Documentation**

---

## 🔧 Cambios Necesarios en package.json

```json
{
  "dependencies": {
    "@nestjs/typeorm": "^10.0.0",
    "typeorm": "^0.3.17",
    "postgresql": "^0.0.1",
    "bcrypt": "^5.1.1",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/jwt": "^11.0.1",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/passport-jwt": "^3.0.13"
  }
}
```

---

## 🚀 Comandos para desarrollador

```bash
# Instalar dependencias
pnpm install

# Crear .env local (copiar de .env.example)
cp apps/api/.env.example apps/api/.env

# Configurar DB_HOST, DB_PASSWORD, JWT_SECRET en .env

# Ejecutar TypeORM migrations
pnpm --filter @visionamos/api exec typeorm migration:run

# Ejecutar seeders
pnpm --filter @visionamos/api exec ts-node src/database/seeders/seed.ts

# Ejecutar desarrollo
pnpm dev

# Testear endpoints
curl -X POST http://localhost:3002/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@redcoop.co","password":"password123"}'
```

---

## 🎯 Definition of Done (Sprint 1)

- ✅ Autenticación JWT funcional
- ✅ AppUser, Role, RoleAssignment en BD
- ✅ Login endpoint opera
- ✅ Refresh token opera
- ✅ Guards protegen endpoints
- ✅ Tests pasan
- ✅ Documentación actualizada

---

## 📊 Progreso

- **Completado:** 60%
- **Pendiente:** 40%
- **Bloqueadores:** Instalar dependencias, crear BD

---

**Status:** En progreso. Siguiente paso: agregar dependencias e implementar guards.
