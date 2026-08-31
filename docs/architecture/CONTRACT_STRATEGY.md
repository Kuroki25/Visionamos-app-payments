# CONTRACT_STRATEGY.md — DTOs & API Contracts

**Phase:** FASE 3.0  
**Date:** 2026-08-23

---

## Estrategia de Contratos

**Objetivo:** Single source of truth para DTOs compartidos entre frontend + backend

---

## Estructura

### `packages/contracts/` (Futuro, FASE 4)

```
packages/contracts/
├── src/
│   ├── auth/
│   │   ├── login.dto.ts            { email, password }
│   │   ├── login-response.dto.ts   { access_token, user }
│   │   └── user.dto.ts             { id, email, role, scope }
│   │
│   ├── admin/
│   │   ├── portal.dto.ts
│   │   ├── commerce.dto.ts
│   │   ├── category.dto.ts
│   │   └── service.dto.ts
│   │
│   ├── forms/
│   │   ├── form-definition.dto.ts
│   │   ├── form-field.dto.ts
│   │   ├── form-submission.dto.ts
│   │   └── form-validation.schema.ts
│   │
│   ├── payments/
│   │   ├── transaction.dto.ts
│   │   ├── payer-data.dto.ts
│   │   ├── payment-intent.dto.ts
│   │   ├── obligation.dto.ts
│   │   └── payment-response.dto.ts
│   │
│   ├── reporting/
│   │   ├── transaction-stats.dto.ts
│   │   ├── portal-metrics.dto.ts
│   │   └── report-query.dto.ts
│   │
│   ├── errors/
│   │   ├── problem-details.ts       (RFC 9457)
│   │   ├── error-codes.ts
│   │   └── error-messages.ts
│   │
│   └── index.ts                     (re-export all)
│
├── package.json
│   { "name": "@redcoop/contracts", "exports": { ... } }
│
└── tsconfig.json
```

---

## Implementación en Módulos

### Backend (NestJS)

```typescript
// modules/auth/auth.controller.ts
import { LoginDto, LoginResponseDto } from '@redcoop/contracts';

@Controller('api/admin/auth')
export class AuthController {
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    // Valida contra LoginDto schema
    // Retorna LoginResponseDto
  }
}
```

### Frontend (Next.js + React)

```typescript
// apps/admin/lib/api/auth.ts
import { LoginDto, LoginResponseDto } from '@redcoop/contracts';

export async function login(email: string, password: string): Promise<LoginResponseDto> {
  const response = await fetch('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password } as LoginDto),
  });
  return response.json() as Promise<LoginResponseDto>;
}
```

---

## Validación con Zod

**Cada DTO tiene schema Zod asociado:**

```typescript
// contracts/src/auth/login.dto.ts
import { z } from 'zod';

export const loginDtoSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 chars'),
});

export type LoginDto = z.infer<typeof loginDtoSchema>;

export const loginResponseDtoSchema = z.object({
  access_token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    role: z.enum(['SUPERADMIN', 'ADMIN_PORTAL', 'ADMIN_COMMERCE', 'VIEWER']),
  }),
});

export type LoginResponseDto = z.infer<typeof loginResponseDtoSchema>;
```

**Backend validation:**

```typescript
@Post('login')
async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
  // ValidationPipe usa loginDtoSchema automáticamente
  // Si falla validación → 400 Bad Request
}
```

**Frontend validation:**

```typescript
function LoginForm() {
  const handleSubmit = async (formData) => {
    const parseResult = loginDtoSchema.safeParse(formData);
    if (!parseResult.success) {
      setErrors(parseResult.error.flatten());
      return;
    }
    // Enviar al backend
  };
}
```

---

## Enums & Constants

**Compartidos:**

```typescript
// contracts/src/enums.ts
export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN_PORTAL = 'ADMIN_PORTAL',
  ADMIN_COMMERCE = 'ADMIN_COMMERCE',
  VIEWER = 'VIEWER',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  PSE = 'PSE',
  TARJETA = 'TARJETA',
  TRANSFERENCIA = 'TRANSFERENCIA',
  EFECTIVO = 'EFECTIVO',
}

// Ambos frontend y backend importan de aquí
import { UserRole, TransactionStatus } from '@redcoop/contracts';
```

---

## Error Response Standard

**RFC 9457 Problem Details:**

```typescript
// contracts/src/errors/problem-details.ts
export interface ProblemDetails {
  type: string;                         // URI tipo de error
  status: number;                       // HTTP status
  title: string;                        // Título del error
  detail: string;                       // Descripción
  instance: string;                     // Request URI
  timestamp: string;                    // ISO 8601
  requestId: string;                    // Tracing
  errors?: Record<string, string[]>;    // Field-level
}

// Backend genera
const error: ProblemDetails = {
  type: 'about:blank',
  status: 400,
  title: 'Validation Failed',
  detail: 'Email is required',
  instance: '/api/admin/users',
  timestamp: new Date().toISOString(),
  requestId: request.id,
  errors: { email: ['Email is required'] },
};

// Frontend parsea
const response = await fetch('/api/admin/users');
if (!response.ok) {
  const error = (await response.json()) as ProblemDetails;
  console.error(`[${error.status}] ${error.title}: ${error.detail}`);
}
```

---

## API Versioning (Futuro)

```typescript
// contracts/package.json
{
  "name": "@redcoop/contracts",
  "version": "1.0.0",  // Incrementa en cambios compatibles
  "exports": {
    "./v1": "./dist/v1/index.js",
    "./v2": "./dist/v2/index.js"  // Futuro breaking changes
  }
}

// Backend
import { LoginDto } from '@redcoop/contracts/v1';

// Frontend
import { LoginDto } from '@redcoop/contracts/v1';
```

---

## Generación de Tipos desde Swagger

**Futuro (FASE 4+):**

```bash
# Generar tipos desde Swagger/OpenAPI
openapi-generator-cli generate \
  -i http://localhost:3002/api-docs \
  -g typescript-axios \
  -o generated-types/
```

---

## Dependencies en package.json

```json
{
  "name": "@redcoop/contracts",
  "version": "1.0.0",
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "5.6.2"
  }
}
```

**Backend package.json:**
```json
{
  "dependencies": {
    "@redcoop/contracts": "workspace:*",
    "zod": "^3.22.4"
  }
}
```

**Frontend package.json:**
```json
{
  "dependencies": {
    "@redcoop/contracts": "workspace:*",
    "zod": "^3.22.4"
  }
}
```

---

## Best Practices

1. **Un DTO = un archivo**
2. **Cada DTO tiene schema Zod**
3. **Usar `z.infer<>` para types**
4. **Re-export todo desde index.ts**
5. **Versionear contracts con app**
6. **Tests de tipos: `expectType<>`**

---

**Status:** Contract strategy defined, packages/contracts ready for FASE 4.0
