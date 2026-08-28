# ADR 002: Gestor de paquetes y estrategia de versiones de Node.js

**Status:** Aceptado
**Fecha:** 2026-08-27

## Context

El equipo necesita instalaciones deterministas, un único lockfile, protección
contra ataques de la cadena de suministro (OWASP A03:2025 — Software Supply Chain
Failures) y una versión de Node.js soportada activamente. La máquina de desarrollo
tenía Node v22.15.0 instalado globalmente (sin gestor de versiones) cuando arrancó
este proyecto.

## Decision

- **pnpm 11.24.0** como gestor de paquetes único, con lockfile congelado en CI
  (`pnpm install --frozen-lockfile`).
- **Node.js 24.20.0** (Active LTS) como versión objetivo del proyecto, declarada en
  `.nvmrc` y en `engines.node` de cada `package.json`.
- **nvm-windows** como gestor de versiones de Node en la máquina de desarrollo, en
  vez de reemplazar la instalación global existente. Se conserva Node 22.15.0
  instalable/usable con `nvm use 22.15.0` para otros proyectos de la máquina;
  este repositorio se desarrolla con `nvm use 24.20.0`.

## Alternatives considered

- **Reemplazar el Node global vía winget/instalador MSI**: descartado a petición
  explícita del usuario — afectaría a todos los proyectos de la máquina, no solo a
  este repositorio.
- **Seguir con Node 22.15.0 sin cambios**: técnicamente viable (satisface los
  `engines` mínimos de Next.js 16, NestJS 11 y ESLint 9), pero Node 22 ya salió de
  Active LTS (fin de soporte activo: 2025-10-21) y solo permanece en soporte
  extendido/mantenimiento. No es la elección correcta para un proyecto nuevo con
  horizonte de "estabilidad a largo plazo" (prioridad #1 del proyecto).
- **Corepack como fuente de verdad de la versión de pnpm**: evaluado y descartado
  por ahora. El equipo de Node ha señalado que Corepack podría dejar de
  distribuirse por defecto en futuras majors, y pnpm mismo recomienda instalación
  directa vía npm en Windows (`https://pnpm.io/installation`, sección Windows) por
  posibles falsos positivos de Windows Defender con el instalador standalone. Se
  opta por instalar pnpm globalmente vía `npm install -g pnpm@11.24.0` y fijar la
  versión exacta en el campo `"packageManager"` del `package.json` raíz como
  documentación/verificación, sin depender de que Corepack esté habilitado.

## Consequences

- **Limitación conocida de nvm-windows**: a diferencia de `nvm` (Unix) o `fnm`,
  nvm-windows no cambia de versión automáticamente por carpeta/`.nvmrc` — el cambio
  de versión activa (`nvm use X`) es global a la sesión de Windows, no por proyecto.
  Un desarrollador que alterne entre este repo y un proyecto en Node 22 debe
  ejecutar `nvm use 24.20.0` / `nvm use 22.15.0` manualmente al cambiar de carpeta.
  Se documenta en `README.md` → Requirements.
- `pnpm-workspace.yaml` centraliza versiones compartidas (React, TypeScript, ESLint,
  Zod) vía `catalog:` para impedir versiones duplicadas entre `apps/*` y
  `packages/*` (ver `docs/DEPENDENCY_POLICY.md`).
- CI fija exactamente Node 24.20.0 y pnpm 11.24.0 (sin rangos), para que una
  actualización de ninguna de las dos herramientas rompa un build en producción sin
  pasar antes por una actualización controlada y revisada del repositorio.

## Trade-offs

Fijar versiones exactas (en vez de rangos `^`/`~`) reduce la superficie de "funciona
en mi máquina" pero exige un proceso explícito de actualización — ver
`docs/DEPENDENCY_POLICY.md`.
