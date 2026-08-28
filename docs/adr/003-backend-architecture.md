# ADR 003: Arquitectura del backend (modular monolith + vertical slice)

**Status:** Aceptado
**Fecha:** 2026-08-27

## Context

`apps/api` necesita una arquitectura que dé fronteras claras entre dominios de
negocio, sea fácil de testear y desplegar, y no introduzca complejidad operacional
(microservicios, colas, CQRS/Event Sourcing) sin un problema real que lo justifique.

## Decision

`apps/api` es un **modular monolith** organizado por dominio (`src/modules/<dominio>`),
no por capas técnicas globales. Cada módulo sigue, por defecto, un flujo vertical
simple:

```
HTTP request → Controller → Application service (use case) → Domain → Port → Infrastructure adapter
```

Un módulo solo se divide internamente en `domain/ application/ infrastructure/
presentation/` cuando su complejidad real lo justifica (reglas de negocio no
triviales, múltiples adaptadores de infraestructura). Los módulos CRUD simples no
adoptan las cuatro carpetas por defecto.

`src/infrastructure/` a nivel de aplicación aloja adaptadores compartidos entre
módulos (p. ej. cliente de base de datos); `src/config/` aloja la configuración
tipada y validada (ver ADR 005).

## Alternatives considered

- **Arquitectura por capas técnicas globales** (`controllers/`, `services/`,
  `repositories/` a nivel de toda la app): descartada — dificulta ver el flujo
  completo de una feature de negocio y favorece acoplamiento accidental entre
  dominios no relacionados.
- **Microservicios desde el inicio**: descartado — no hay un problema de escala,
  equipo o despliegue independiente que lo justifique hoy. El modular monolith deja
  la puerta abierta a extraer un módulo a un servicio propio el día que un límite
  real (no especulativo) aparezca.
- **CQRS/Event Sourcing generalizado**: descartado — añade una capa de indirección
  (comandos, eventos, proyecciones) que no aporta valor a operaciones CRUD/reglas de
  negocio simples; se reconsiderará módulo por módulo si aparece un caso de uso que
  realmente lo necesite (p. ej. auditoría estricta de cambios de estado).

## Consequences

- Un desarrollador nuevo puede entender una feature completa leyendo un único
  directorio (`src/modules/<dominio>`), sin saltar entre carpetas técnicas dispersas.
- El dominio (reglas de negocio) no importa directamente clases de infraestructura
  (DIP pragmático, sección 14 del prompt): cuando un módulo tiene puertos, la
  infraestructura implementa el puerto, no al revés.
- Extraer un módulo a un servicio independiente en el futuro implica mover una
  carpeta con fronteras ya claras, no reescribir la aplicación.

## Trade-offs

Sin un enforcement automatizado (regla de ESLint de import boundaries a nivel de
`apps/api/src/modules/*`), nada impide que un desarrollador importe directamente
entre módulos de dominios distintos; se documenta como regla de code review hasta
que el volumen de módulos justifique una regla de lint dedicada.
