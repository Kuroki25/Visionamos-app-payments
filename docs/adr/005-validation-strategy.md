# ADR 005: Estrategia de validación (Zod en fronteras, no en todo el dominio)

**Status:** Aceptado
**Fecha:** 2026-08-27

## Context

El prompt exige validar datos en las fronteras no confiables del sistema (requests,
variables de entorno, respuestas externas) sin convertir Zod en un sustituto de
parametrización SQL ni en validación redundante de cada objeto interno del dominio.

## Decision

Zod se usa exclusivamente en:

1. **Request/response de la API** (`packages/contracts`, consumido por `api` vía
   `nestjs-zod` como `ZodValidationPipe`, y por los frontends para validar/tipar
   respuestas de `fetch`).
2. **Variables de entorno** (`apps/api/src/config`, `apps/portal-web`,
   `apps/dashboard-web`): cada app valida su propio `process.env` al arrancar con un
   esquema Zod; la app falla rápido (`process.exit(1)` con mensaje claro) si falta
   una variable obligatoria. Prohibido `process.env.X!` disperso por el código —
   toda variable se lee desde el objeto de configuración ya validado.
3. **Query params / route params** de endpoints que lo requieran.

Zod **no** se usa para validar objetos internos del dominio que nunca cruzan una
frontera no confiable (esos se protegen con el sistema de tipos de TypeScript, no
con validación runtime redundante).

Las queries a base de datos usan siempre parametrización nativa del driver/ORM
elegido — Zod valida la forma del input antes de que llegue a la query, nunca
sustituye la parametrización (sección 26 del prompt, prevención de injection).

## Alternatives considered

- **class-validator + decoradores** (el validador "clásico" de Nest): descartado
  como mecanismo principal — obligaría a mantener dos fuentes de verdad (los DTOs
  decorados de Nest y los esquemas Zod de `packages/contracts` que los frontends ya
  necesitan). Se mantiene como dependencia transitiva porque `@nestjs/common`
  la declara como peer, pero los DTOs propios del proyecto se validan con Zod.
- **Validar cada capa del dominio con Zod "por si acaso"**: descartado —
  sobreingeniería explícita prohibida en la sección 33 del prompt; añade coste de
  rendimiento y ceremonia sin reducir riesgo real, ya que esos objetos nunca vienen
  de una fuente no confiable.

## Consequences

- Un endpoint que reciba un payload inválido responde `400` con un `ProblemDetails`
  (ver `docs/API_GUIDELINES.md`) generado a partir del mismo error de Zod, sin
  necesidad de mapeo manual.
- Las tres apps comparten la misma disciplina: "todo lo que entra desde fuera del
  proceso se valida antes de usarse".

## Trade-offs

Ninguna capa interna queda protegida en runtime contra un bug de programación que
construya un objeto de dominio inválido a mano (fuera de una frontera) — se acepta
porque el sistema de tipos de TypeScript ya cubre ese caso en tiempo de compilación.
