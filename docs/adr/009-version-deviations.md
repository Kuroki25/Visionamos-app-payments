# ADR 009: Desviaciones deliberadas del baseline tecnológico (TypeScript y NestJS)

**Status:** Aceptado
**Fecha:** 2026-08-27

## Context

El baseline inicial del proyecto proponía TypeScript en rama 7 y NestJS en rama 12
como punto de partida a validar ("esto es solamente un baseline... antes de
instalar debes comprobar nuevamente documentación oficial, changelogs, peer
dependencies"). La auditoría de compatibilidad (Fase 0, `docs/COMPATIBILITY_MATRIX.md`)
encontró incompatibilidades reales y verificables en ambos casos.

## Decision

### TypeScript: 6.0.3 en vez de 7.0.2

`typescript-eslint@8.68.0` (y su dependencia `@typescript-eslint/parser`) declaran:

```json
"peerDependencies": { "typescript": ">=4.8.4 <6.1.0" }
```

Esto **excluye explícitamente** TypeScript 7.x. Adicionalmente, `ts-jest@29.4.12`
(usado para correr los tests de `apps/api` con soporte completo de decoradores)
declara:

```json
"peerDependencies": { "typescript": ">=4.3 <7" }
```

También excluye la rama 7. TypeScript 7 es la reescritura nativa del compilador
("tsgo") publicada muy recientemente: el ecosistema de linting y testing aún no ha
actualizado sus rangos de peer dependencies para soportarla. Se elige **TypeScript
6.0.3**, la última versión estable (no release candidate, no dev build) que
satisface ambos rangos simultáneamente.

### NestJS: 11.2.3 en vez de 12.0.1

Tres paquetes que el propio prompt exige como parte del baseline de seguridad y
observabilidad declaran soporte solo hasta NestJS 11:

| Paquete                   | Uso requerido                               | Peer declarado                                                       | Rompe con Nest 12 |
| ------------------------- | ------------------------------------------- | -------------------------------------------------------------------- | ----------------- |
| `@nestjs/throttler@6.5.0` | Rate limiting (sección 24 del prompt)       | `@nestjs/core: ^7\|\|^8\|\|^9\|\|^10\|\|^11`                         | Sí                |
| `@nestjs/terminus@11.1.1` | Health checks                               | `@nestjs/core: ^10\|\|^11`                                           | Sí                |
| `nestjs-zod@5.5.0`        | Integración Zod/Standard Schema (sección 7) | `@nestjs/common: ^10\|\|^11`, `@nestjs/swagger: ^7.4.2\|\|^8\|\|^11` | Sí                |

Se elige **NestJS 11.2.3** (última patch estable de la rama 11), con
`@nestjs/cli@11.0.24` y `@nestjs/swagger@11.4.7` alineados a la misma major.

## Alternatives considered

- **Forzar NestJS 12 / TypeScript 7 con `--force` o `--legacy-peer-deps`**:
  explícitamente prohibido por las reglas del proyecto (sección 0). Oculta el
  problema en vez de resolverlo y puede producir fallos en tiempo de ejecución no
  detectados por el type-checker o por el linter.
- **Escribir un pipe de validación Zod custom y un guard de throttling custom**
  para evitar la dependencia de `nestjs-zod`/`@nestjs/throttler` y así poder usar
  Nest 12: descartado por sobreingeniería — reimplementa funcionalidad que un
  paquete mantenido por la comunidad/el equipo de Nest ya resuelve, solo para
  perseguir un número de versión mayor sin beneficio funcional inmediato.
- **Usar Nest 12 solo para módulos nuevos y Nest 11 en otros**: no aplica — es una
  única aplicación (`apps/api`), no se puede mezclar majors del framework dentro del
  mismo proceso.

### `@nestjs/config`: 4.0.4 en vez de 12.0.0

`@nestjs/config@12.0.0` declara `"type": "module"` sin condición `"require"` en
su `exports` map — es decir, es un paquete **ESM-only**. `apps/api` corre sus
tests con Jest/ts-jest en modo CommonJS (docs/adr/007-testing-strategy.md), que
por defecto no transforma `node_modules`; al importar `AppModule` (que importa
`ConfigModule`), Jest falla con `SyntaxError: Unexpected token 'export'`. La
numeración de versiones de `@nestjs/config` es independiente de la de
`@nestjs/core` (nunca publicó una serie 5–11); su última versión previa al
cambio a ESM-only es **4.0.4**, cuyo peer (`@nestjs/common: ^10.0.0 ||
^11.0.0`) sigue siendo compatible con nuestra rama 11. Se usa esa versión en
vez de forzar a Jest a transformar un paquete de `node_modules` (lo que además
seguiría rompiendo cualquier consumidor CJS del árbol de dependencias de ese
paquete).

## Consequences

- Cuando `@nestjs/throttler`, `@nestjs/terminus` y `nestjs-zod` publiquen soporte
  para `@nestjs/core@^12`, esta ADR debe revisarse y, si no hay otras
  incompatibilidades, migrar a Nest 12 en una tarea explícita (no como parte de un
  cambio de feature).
- TypeScript 6.0.3 sigue siendo una versión moderna (posterior a la línea 5.x muy
  extendida en la industria) con la mayoría de las mejoras de tipos recientes;
  ninguna funcionalidad requerida por este proyecto depende exclusivamente del
  compilador nativo de TS 7.
- `docs/DEPENDENCY_POLICY.md` debe registrar estos tres paquetes como "bloqueadores
  de upgrade" para que una futura actualización de NestJS no se haga sin antes
  revisar sus `peerDependencies`.

## Trade-offs

Se renuncia temporalmente a las mejoras de rendimiento de compilación de
TypeScript 7 (compilador nativo) y a las novedades de NestJS 12, a cambio de una
combinación de dependencias verificada como coherente por sus propios autores.
