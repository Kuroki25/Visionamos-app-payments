# ADR 007: Estrategia de testing

**Status:** Aceptado
**Fecha:** 2026-08-27

## Context

El prompt exige una pirámide de testing real (unit, integration, component, API,
contract, E2E, security regression) usando las herramientas oficiales de cada
framework, sin forzar un único test runner en todo el monorepo si eso aumenta el
mantenimiento.

## Decision

| Ámbito                                          | Herramienta                                                                        | Motivo                                                                                                                                                                                  |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `portal-web` / `dashboard-web` — unit/component | **Vitest 4.1.11** + React Testing Library                                          | Recomendación oficial vigente para proyectos Next.js modernos; integración nativa con Vite/esbuild, no requiere transformar TS vía `ts-jest`.                                           |
| `portal-web` / `dashboard-web` — E2E            | **Playwright** (`@playwright/test` 1.62.1)                                         | E2E oficial recomendado por Next.js; corre contra la app construida, no contra mocks.                                                                                                   |
| `api` — unit/integration                        | **Jest 30.4.2** + `@nestjs/testing` + `ts-jest` 29.4.12                            | Test runner oficial de NestJS (`@nestjs/testing` está diseñado alrededor de Jest); no se reemplaza por Vitest solo para unificar herramientas (regla explícita del prompt, sección 31). |
| `api` — API/HTTP                                | **Supertest 7.2.2**                                                                | Estándar de facto para probar endpoints Nest de extremo a extremo dentro del proceso de test.                                                                                           |
| `packages/contracts`                            | **Vitest**                                                                         | Paquete framework-agnostic sin dependencias de Next/Nest; Vitest es la opción más ligera.                                                                                               |
| Regresión de seguridad                          | Tests de integración dedicados (401/403/404/400/429 por endpoint, BOLA por objeto) | Ver `docs/SECURITY-CONTROLS.md` — cada control OWASP mapeado debe tener un test que lo demuestre, no solo documentación.                                                                |

Turborepo orquesta `test`, `test:unit`, `test:integration`, `test:e2e`,
`test:coverage` como tareas independientes por paquete/app; cada una declara sus
propios `outputs` (`coverage/**`) para que el caché de Turborepo sea válido.

## Alternatives considered

- **Un único test runner para todo el monorepo** (p. ej. Vitest también para
  `api`): descartado explícitamente por el prompt — `@nestjs/testing` está acoplado
  a convenciones de Jest (mocks, `Test.createTestingModule`) y migrar tiene coste
  sin beneficio funcional real.
- **Cypress para E2E**: descartado a favor de Playwright, que es la recomendación
  oficial actual de Next.js y soporta múltiples motores (Chromium/Firefox/WebKit)
  con una única API.

## Consequences

- Un desarrollador que trabaje solo en frontend nunca necesita entender Jest; uno
  que trabaje solo en backend nunca necesita entender Vitest — cada stack usa la
  herramienta con la que su framework fue diseñado para trabajar.
- El coverage se mide, pero como indicador, no como objetivo (sección 33 del
  prompt): los thresholds de CI priorizan lógica de negocio, controles de
  seguridad, autorización, contratos y manejo de errores sobre un porcentaje global.

## Trade-offs

Mantener dos test runners (Jest y Vitest) implica dos configuraciones distintas
(`packages/test-config` documenta ambas) en vez de una sola — se acepta a cambio de
no forzar convenciones ajenas a cada framework.
