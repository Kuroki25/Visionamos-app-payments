# ADR 011: Modelo de autorización Role + Scope (Red Coopagos)

**Status:** Aceptado
**Fecha:** 2026-08-30

## Context

ADR 006 estableció la mecánica de transporte de autenticación (JWT en cookies
`httpOnly`, CSRF double-submit, Argon2id, rotación de refresh token) con un
modelo de roles plano `admin | member` — suficiente para demostrar el
mecanismo, pero no para el negocio real. `docs/business/ROLE_PERMISSION_MATRIX.md`
exige autorización evaluada como **PERMISO + ALCANCE (SCOPE) + RECURSO**, no
solo el nombre del rol: `SUPERADMIN` (alcance global), `ADMIN_PORTAL` (un
portal concreto), `ADMIN_COMMERCE` (un comercio concreto), `VIEWER` (solo
lectura, alcance variable). Un `ADMIN_PORTAL` nunca debe poder leer/escribir
otro portal cambiando un id en la URL (BOLA — API1) ni acceder a una función
fuera de su rol (BFLA — API5).

Este ADR cubre exclusivamente el modelo de autorización (qué reemplaza a la
columna `role` plana y cómo se valida el scope). La mecánica de tokens/cookies
de ADR 006 no cambia, salvo la eliminación de `POST /auth/register`
(documentada ahí).

## Decision

### `role_assignments` como tabla de estado, no de historial

Un `AppUser` tiene como máximo **una** fila activa en `role_assignments`
(`UNIQUE(user_id)`) — implementa literalmente la regla de negocio "un
`ADMIN_PORTAL`/`ADMIN_COMMERCE` tiene un único scope operativo activo a la
vez" (`ROLE_PERMISSION_MATRIX.md` §7). Reasignar un scope es un `UPDATE`
in-place dentro de una transacción, no un insert de una fila nueva — el
historial de "quién tuvo qué scope y cuándo cambió" vive en `audit_events`
(`previous_value`/`new_value`), no en `role_assignments` mismo. Esto evita
que cada chequeo de autorización (que corre en el camino caliente de cada
request) tenga que filtrar `WHERE revoked_at IS NULL` contra una tabla que
crece indefinidamente.

`role` y `scope_type` son enums nativos de PostgreSQL, no tablas lookup: son
cuatro roles fijos, acoplados al código (cada guard/servicio tiene lógica
específica por rol) — una tabla editable por negocio implicaría que se puede
añadir un rol sin desplegar código, lo cual es falso en este dominio. Dos
`CHECK` en la tabla refuerzan a nivel de base de datos que
`scope_type`/`scope_portal_id`/`scope_commerce_id` son consistentes entre sí
y con `role` (p. ej. `ADMIN_PORTAL` exige `scope_type='PORTAL'` y
`scope_portal_id NOT NULL`) — la misma regla se valida también en Zod
(`ReassignScopeSchema.refine`) como defensa en profundidad, no como sustituto.

### Scope embebido en el JWT, no resuelto por request

`AccessTokenPayload` se extiende con `scopeType`, `scopePortalId`,
`scopeCommerceId` junto al `role` ya existente — sigue el mismo patrón que
ADR 006 ya estableció para `role` (embebido, no resuelto contra la base de
datos en cada request). `JwtAuthGuard` sigue verificando solo firma y
expiración.

**Trade-off aceptado:** una reasignación de scope o una desactivación de
usuario tarda hasta `JWT_ACCESS_TTL` (15 min por defecto) en reflejarse en un
access token ya emitido. Se acota extendiendo `AuthService.rotateRefreshToken`
para resolver `role_assignments` en fresco contra la base de datos en cada
`POST /auth/refresh` y rechazar con 401 si el usuario ya no está `ACTIVE` —
la ventana de exposición máxima es un ciclo de acceso, no indefinida.

### Sin `ScopeGuard` genérico — un servicio inyectable, no un decorador de metadata

Se evaluó (y se descarta) un guard genérico tipo `@RequireScope('commerce')`
que resuelva automáticamente la cadena `recurso → comercio → portal`. Cada
recurso tiene un camino de resolución distinto (`Commerce` conoce su
`portalId` directo; `Service` requiere `Service → Commerce → Portal`;
`FormField` requiere una cadena de cuatro saltos) — un guard genérico solo
desplazaría el mismo condicional detrás de una capa de metadata por ruta, sin
eliminar código real, y dificultaría seguir el flujo de autorización con el
debugger. Esto es una extensión directa de la decisión que ADR 006 ya tomó
para BOLA a nivel de objeto ("no se resuelve con un guard genérico — se valida
explícitamente en el controller").

En su lugar, `ScopeAuthorizationService` (`modules/role-assignments/`) expone
primitivas puras y testeables (`assertScope`, `assertCanAssignRole`) que cada
controller/service llama **después** de cargar el recurso real de la base de
datos — nunca confiando en un `portalId`/`commerceId` que venga en la URL o
el body sin verificar contra la fila cargada. `@Roles(...)` (sin cambios)
sigue cubriendo la autorización declarativa a nivel de función (BFLA).

## Alternatives considered

- **Guard genérico `@RequireScope()` con resolución automática por
  convención**: descartado — ver justificación arriba; añade indirección sin
  reducir código real.
- **Tabla `roles` editable + `permissions`/`role_permissions` (RBAC completo
  estilo Casbin/CASL)**: descartado por sobreingeniería (sección 14/38) — el
  negocio confirma exactamente 4 roles fijos con reglas de scope explícitas,
  no un sistema de permisos configurable dinámicamente.
- **Resolver el scope contra la base de datos en cada request** (en vez de
  embeberlo en el JWT): más "fresco", pero penaliza con una consulta extra
  *todo* endpoint autenticado — incluyendo, a futuro, lecturas de catálogo de
  alto volumen — para cerrar una ventana de staleness que ya queda acotada a
  un ciclo de acceso vía la revalidación en `/auth/refresh`. No se justifica
  el costo.
- **`role_assignments` como historial append-only** (una fila nueva por
  reasignación, `revoked_at`): descartado como estructura de estado — cada
  chequeo de autorización tendría que filtrar la fila activa entre un
  historial creciente. El historial de auditoría ya lo cubre `audit_events`
  sin duplicar la responsabilidad.

## Consequences

- Toda ruta de catálogo/usuarios que necesite validar pertenencia
  organizacional sigue el mismo patrón ya establecido en
  `UsersController.findOne` (BOLA validado explícitamente, no vía guard) —
  un desarrollador que entienda ese ejemplo entiende el resto del sistema.
- Añadir un nuevo tipo de recurso con su propia cadena de scope (p. ej.
  `Transaction` en el futuro módulo de pagos) no requiere tocar
  `ScopeAuthorizationService` en su forma — solo llamar `assertScope` con el
  `portalId`/`commerceId` ya resuelto de esa cadena.
- Reasignar el scope de un usuario, desactivarlo, crear un usuario o publicar
  un recurso quedan todos registrados en `audit_events` (BR-046) con actor,
  acción, recurso y snapshot antes/después cuando aplica.

## Trade-offs

Ver "Trade-off aceptado" arriba (staleness de hasta un `JWT_ACCESS_TTL` en el
peor caso). Se documenta como aceptado explícitamente, no como una omisión.
