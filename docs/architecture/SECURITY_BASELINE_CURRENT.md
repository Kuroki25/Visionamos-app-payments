# SECURITY_BASELINE_CURRENT.md — Red Coopagos

**Status:** FASE 2.0 — Auditoría Completada  
**Fecha:** 2026-08-23  
**Evaluación:** OWASP Top 10:2025, OWASP API Security Top 10:2023, ASVS 5.x

---

## Baseline de Seguridad Actual

### Resumen

**Compliance actual:** ~15% (Solo medidas básicas, sin lógica de dominio)

**Medidas presentes:**
- ✅ Helmet headers
- ✅ Rate limiting (global)
- ✅ CORS configurable
- ✅ Payload size limit
- ✅ HTTPS-ready (NO FORZADO EN STARTUP)

**Crítico ausente:**
- ❌ Autenticación
- ❌ Autorización
- ❌ Validación de entrada
- ❌ Manejo de errores seguro
- ❌ Logging de auditoría
- ❌ Secrets management
- ❌ Transacciones DB
- ❌ Rate limiting por usuario
- ❌ PII masking
- ❌ HTTPS enforcement

---

## OWASP Top 10:2025 Evaluación

| # | Vulnerabilidad | Status | Evidencia | Remediación |
|---|---|---|---|---|
| **A1** | Broken Access Control | 🔴 CRÍTICO | Sin autorización implementada | FASE 3: Guards RBAC |
| **A2** | Cryptographic Failures | 🟡 RIESGO | Secretos en env, sin rotación | FASE 3: Vault integration |
| **A3** | Injection | 🟡 RIESGO | Sin validación entrada aún, ORM TBD | FASE 3: Parametrized queries + validation |
| **A4** | Insecure Design | 🔴 CRÍTICO | Modelo de autorización incompleto | FASE 3: Implementar RBAC+Scope |
| **A5** | Security Misconfiguration | 🟡 RIESGO | CORS flexible, headers parciales | FASE 3: Config validation |
| **A6** | Vulnerable Components | 🟢 OK | Dependencias actuales, npm audit limpio | Continuar monitoreo |
| **A7** | Identification Failures | 🔴 CRÍTICO | Sin JWT, sin sesiones | FASE 3: JWT implementation |
| **A8** | Software & Data Integrity | 🟡 RIESGO | Sin integridad de transacciones | FASE 3: DB transactions |
| **A9** | Logging & Monitoring | 🟠 ALTO | Sin structured logging | FASE 3: Winston/Pino |
| **A10** | SSRF | 🟢 OK | Sin external requests aún | Monitor en webhooks |

---

## OWASP API Security Top 10:2023

| # | Risk | Status | Evidencia | Remediación |
|---|---|---|---|---|
| **API1:2023** | Broken Object Level Auth (BOLA) | 🔴 CRÍTICO | Sin validación de scope | FASE 3 |
| **API2:2023** | Broken Auth | 🔴 CRÍTICO | Sin JWT, sin guards | FASE 3 |
| **API3:2023** | Broken Object Property Level Auth | 🔴 CRÍTICO | Sin field-level permissions | FASE 3 |
| **API4:2023** | Unrestricted Res. Consumption | 🟠 ALTO | Rate limit global, no por usuario | FASE 3 |
| **API5:2023** | Broken Function Level Auth | 🔴 CRÍTICO | Sin endpoint-level authorization | FASE 3 |
| **API6:2023** | Unrestricted Access to Sensitive Business Flows | 🔴 CRÍTICO | No hay validación de intent | FASE 3 |
| **API7:2023** | Server-Side Request Forgery (SSRF) | 🟢 OK | Sin webhooks implementados | Monitor |
| **API8:2023** | Mass Assignment | 🟡 RIESGO | Sin DTO validation | FASE 3 |
| **API9:2023** | API Testing | 🟡 RIESGO | Sin tests | FASE 3 |
| **API10:2023** | Unsafe Consumption of APIs | 🟢 OK | Sin integraciones externas aún | Monitor |

---

## ASVS 5.x — Selección Crítica

### V1: Architecture

| Req | Description | Status | Deadline |
|---|---|---|---|
| 1.1.1 | Document architecture | 🔴 | FASE 3 |
| 1.2.1 | Identify security gates | 🔴 | FASE 3 |
| 1.3.1 | Enforce least privilege | 🔴 | FASE 3 |
| 1.4.1 | Document authentication | 🔴 | FASE 3 |
| 1.5.1 | Implement segregation | 🟡 | FASE 3 |

### V2: Authentication

| Req | Description | Status |
|---|---|---|
| 2.1.1 | Unique identifiers | 🔴 |
| 2.2.1 | Default password policy | 🔴 |
| 2.3.1 | Weak password checks | 🔴 |
| 2.4.1 | Session timeout | 🔴 |
| 2.5.1 | Notification of auth changes | 🔴 |

### V3: Session Management

| Req | Description | Status |
|---|---|---|
| 3.1.1 | Prevent CSRF | 🟡 (CORS en lugar) |
| 3.2.1 | Secure cookies | 🔴 |
| 3.3.1 | Session invalidation | 🔴 |

### V4: Access Control

| Req | Description | Status |
|---|---|---|
| 4.1.1 | Enforce access control | 🔴 |
| 4.1.2 | Validate scope | 🔴 |
| 4.1.3 | Enforce horizontal access control | 🔴 |
| 4.1.4 | Enforce vertical access control | 🔴 |

### V5: Validation, Sanitization, Encoding

| Req | Description | Status | Current |
|---|---|---|---|
| 5.1.1 | Server-side validation | 🟡 | class-validator presente, sin uso |
| 5.1.2 | Canonicalization | 🔴 | TBD |
| 5.2.1 | Prevent NoSQL injection | 🔴 | ORM TBD |
| 5.2.2 | Prevent SQL injection | 🔴 | ORM TBD |
| 5.2.3 | Prevent LDAP injection | 🟢 | N/A |
| 5.2.4 | Prevent XPath injection | 🟢 | N/A |
| 5.2.5 | Prevent XML bomb | 🟢 | N/A (JSON only) |
| 5.2.6 | Prevent expression language injection | 🔴 | N/A |
| 5.2.7 | Prevent command injection | 🟢 | N/A |
| 5.2.8 | Prevent format string injection | 🟢 | N/A |
| 5.3.1 | Contextual output encoding | 🔴 | N/A (API response) |
| 5.3.2 | HTML entity encoding | 🟢 | N/A (API response) |
| 5.3.3 | Unicode encoding | 🔴 | UTF-8, check |
| 5.3.4 | URL encoding | 🔴 | N/A |
| 5.3.5 | CSS encoding | 🟢 | N/A (Backend) |
| 5.3.6 | Base64 encoding | 🔴 | Sensitive data handling |

### V6: Crypto

| Req | Description | Status |
|---|---|---|
| 6.1.1 | Secure random number generation | 🔴 |
| 6.2.1 | Encrypt sensitive data at rest | 🔴 |
| 6.2.2 | Encrypt data in transit | 🔴 (HTTPS TBD) |
| 6.2.4 | Encrypt stored secrets | 🔴 |
| 6.3.1 | Prevent key compromise | 🔴 |

### V7: Error Handling

| Req | Description | Status |
|---|---|---|
| 7.1.1 | Avoid information disclosure | 🔴 |
| 7.1.2 | Handle all exceptions | 🔴 |
| 7.1.3 | Logging sensitive errors | 🔴 |

### V8: Data Protection

| Req | Description | Status |
|---|---|---|
| 8.1.1 | Identify PII | 🔴 |
| 8.1.2 | Minimize PII usage | 🔴 |
| 8.1.3 | Mask PII in logs | 🔴 |
| 8.1.4 | Delete/expire PII | 🔴 |
| 8.2.1 | Encrypt data in transit | 🔴 |

### V9: Transmission

| Req | Description | Status |
|---|---|---|
| 9.1.1 | Verify TLS | 🔴 |
| 9.1.2 | Server certificate pinning | 🔴 |
| 9.2.1 | HTTP headers | ✅ Helmet |
| 9.2.3 | CSP header | 🔴 |
| 9.2.4 | X-Frame-Options | ✅ Helmet |

### V10: Malicious Code

| Req | Description | Status |
|---|---|---|
| 10.1.1 | Avoid code injection | 🔴 |
| 10.2.1 | Validate dependencies | 🟢 |
| 10.3.1 | Verify authentication to sources | 🟡 |

---

## Controles presentes

### ✅ Implementados

```
1. Helmet.js
   - X-Frame-Options: DENY (clickjacking)
   - X-Content-Type-Options: nosniff
   - Strict-Transport-Security (if HTTPS)
   - X-XSS-Protection
   - Referrer-Policy
   - Permissive-Policy

2. CORS allowlist (configurable)
   - Whitelist por env
   - Credentials habilitadas
   - Specific methods y headers

3. Rate limiting
   - ThrottlerModule global
   - 100 req/60s default
   - Configurable por env

4. Request parsing limits
   - 1MB limit JSON + urlencoded
   - Previene buffer overflow

5. Graceful shutdown
   - enableShutdownHooks()
   - Conexiones quedan cierren
```

### 🔴 NO implementados (CRÍTICO para FASE 3)

1. **Authentication (JWT, Sessions)**
2. **Authorization (RBAC + Scope)**
3. **Input Validation (Zod + ValidationPipe)**
4. **Exception Handling (AllExceptionsFilter)**
5. **Structured Logging (Winston/Pino)**
6. **Request ID / Correlation tracking**
7. **Secrets Management (Zod env + vault)**
8. **Database transacciones**
9. **Idempotency keys**
10. **PII Masking en logs**

---

## Recomendaciones prioridad FASE 3

### 🔴 CRÍTICO (Mes 1)

- [ ] JWT authentication + guards
- [ ] RBAC + Scope authorization
- [ ] Input validation (Zod DTOs + ValidationPipe)
- [ ] Exception filter global
- [ ] Database + ORM setup
- [ ] Secrets validation (Zod)

### 🟠 ALTO (Mes 1-2)

- [ ] Structured logging (Winston)
- [ ] PII masking
- [ ] Rate limiting per user/IP
- [ ] HTTPS enforcement (production)
- [ ] Request ID tracking

### 🟡 MEDIO (Mes 2)

- [ ] Swagger/OpenAPI
- [ ] Tests unitarios + integration
- [ ] Webhook signature validation
- [ ] Database encryption (at rest)
- [ ] Audit logging

---

## Compliance Roadmap

| Quarter | Focus | Target |
|---|---|---|
| **Q1** | Authentication + Authorization | ASVS 1.x-4.x: 40% |
| **Q2** | Input validation + error handling | ASVS 5.x-7.x: 70% |
| **Q3** | Data protection + transmission | ASVS 8.x-9.x: 85% |
| **Q4** | Monitoring + incident response | ASVS 10.x: 95%+ |

---

**Baseline establecida. FASE 3 definirá remediación detallada.**
