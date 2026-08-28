# ADR 004: Estrategia de contratos API (`@repo/contracts`)

**Status:** Aceptado
**Fecha:** 2026-08-27

## Context

`portal-web`, `dashboard-web` y `api` necesitan compartir la forma de los
request/response de la API sin duplicar tipos a mano ni acoplar los frontends al
código interno de NestJS.

## Decision

`packages/contracts` es un paquete **framework-agnostic** que contiene:

- Esquemas Zod (fuente de verdad) para request/response de cada endpoint público.
- Tipos TypeScript inferidos de esos esquemas (`z.infer<...>`), nunca duplicados a mano.
- Enums de contrato y objetos de error públicos (`ProblemDetails`, ver ADR 005 y
  `docs/API_GUIDELINES.md`).

`packages/contracts` **no** depende de Next.js ni de NestJS, no contiene
controladores, servicios, acceso a base de datos ni secretos. `api` importa
`@repo/contracts` para tipar sus DTOs de entrada/salida; `portal-web` y
`dashboard-web` lo importan para tipar las respuestas de sus llamadas HTTP.

## Alternatives considered

- **OpenAPI-first con generación de cliente** (`@nestjs/swagger` exporta el spec,
  un generador crea el cliente TypeScript): evaluado, no descartado a futuro. Para
  esta fase se prioriza Zod-first porque da validación runtime real en ambos lados
  (backend valida con el mismo esquema con el que el frontend tipa), mientras que
  un cliente generado desde OpenAPI solo da tipos, no validación runtime en el
  frontend. `@nestjs/swagger` se sigue usando para _documentar_ la API (sección 15
  del prompt), generado a partir de los mismos esquemas Zod vía `nestjs-zod`, sin
  duplicar la definición.
- **Tipos TypeScript planos compartidos sin Zod** (`interface CreateUser {}`):
  descartado — no da validación runtime y duplica la fuente de verdad respecto a
  cualquier validación que el backend haga de todas formas.

## Consequences

- Un cambio en la forma de un endpoint se hace en un único lugar
  (`packages/contracts`) y TypeScript falla en frontend y backend si algún consumidor
  no se actualiza.
- `packages/contracts` debe compilar y testear de forma completamente aislada
  (sin `apps/*` como dependencia) — es la comprobación de que de verdad es
  framework-agnostic.

## Trade-offs

Zod-first requiere que cualquier cambio de contrato pase primero por
`packages/contracts` antes que por el controlador de Nest o la llamada del
frontend, lo cual añade un paso extra comparado con definir el tipo directamente
en el controlador — se acepta porque elimina la duplicación y la deriva de tipos.
