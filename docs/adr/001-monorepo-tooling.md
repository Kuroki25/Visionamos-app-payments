# ADR 001: Herramientas del monorepo (pnpm workspaces + Turborepo)

**Status:** Aceptado
**Fecha:** 2026-08-27

## Context

El repositorio debe alojar tres aplicaciones (`portal-web`, `dashboard-web`, `api`) y
varios paquetes compartidos, con builds, tests y lint reproducibles, cacheables y
paralelizables, sin convertir `apps/api` en un monorepo anidado.

## Decision

- **pnpm workspaces** como única autoridad de resolución de dependencias e
  instalación (`pnpm-workspace.yaml`, protocolo `workspace:*` para paquetes internos).
- **Turborepo** como única autoridad de orquestación de tareas (task graph, caché,
  ejecución paralela). Turborepo no gestiona dependencias; pnpm no gestiona el
  orden de ejecución de tareas — cada herramienta tiene una responsabilidad.

## Alternatives considered

- **npm/yarn workspaces**: descartado. pnpm ofrece un modelo de `node_modules`
  estricto (no flat/phantom dependencies), `catalogs` nativos para centralizar
  versiones, y es explícitamente el gestor requerido por el prompt del proyecto.
- **Nx**: descartado para esta fase. Nx añade generators/plugins propios y una capa
  de configuración adicional; Turborepo cubre task graph + caché con una superficie
  de configuración más pequeña, alineado con la prioridad "buenas prácticas sin
  sobreingeniería".
- **Monorepo de NestJS (Nest CLI workspace)** para todo el repo: descartado. Mezclaría
  la gestión de proyectos de Nest con la de Next.js/paquetes compartidos. `apps/api`
  es una aplicación Nest normal dentro del monorepo pnpm/Turborepo, no al revés.

## Consequences

- Cada app/paquete debe declarar explícitamente sus scripts (`build`, `lint`,
  `typecheck`, `test`) para que Turborepo pueda orquestarlos; no hay "magia" implícita.
- El caché de Turborepo depende de que los `outputs` de cada tarea estén bien
  declarados (ver `turbo.json`); un output mal declarado invalida el caché o, peor,
  sirve resultados obsoletos — se revisa en cada fase.
- Los desarrolladores nuevos solo necesitan aprender dos herramientas de nivel
  raíz (pnpm, turbo); el resto (Next, Nest, Vitest, Jest) se comporta como en
  cualquier proyecto standalone.

## Trade-offs

Turborepo no reemplaza un orquestador de CI completo: sigue siendo necesario un
pipeline de CI (ver ADR 007 y `.github/workflows`) que invoque `turbo run ...`.
