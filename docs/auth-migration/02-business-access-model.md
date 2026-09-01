<!--
Fase 2 — Auditoría del modelo de negocio (PROMPT MAESTRO §20-21). READ ONLY:
ningún archivo de código fue modificado para producir este documento.
Ejecutado 2026-08-31 contra el commit `3453e77` de `main`. Cruza lo que ya
documenta `docs/business/ROLE_PERMISSION_MATRIX.md` (Fase 1 del negocio,
preexistente) contra lo realmente implementado en `apps/api/src`, con
evidencia archivo+línea. Ver también [[better-auth-migration-master-prompt]].
-->

# Fase 2 — Modelo de acceso de negocio (Actor × Recurso × Acción × Scope)

## Fuente de verdad de negocio

El negocio ya documentó su modelo de autorización deseado antes de esta
migración, en `docs/business/`:

- `ROLE_PERMISSION_MATRIX.md` — matriz de capacidades por rol (§5.1-5.9).
- `AUTHORIZATION_DECISIONS_UPDATE.md` — decisiones ya confirmadas.
- `DOMAIN_RELATIONSHIPS.md`, `DOMAIN_MODEL.md`, `BUSINESS_RULES_RED_COOPAGOS.md`,
  `USE_CASES.md`, `DOMAIN_GLOSSARY_RED_COOPAGOS.md`.

Esta fase **no reinventa** esa matriz: verifica, endpoint por endpoint, si el
código de `apps/api/src/modules/*` la implementa tal como está escrita, y
documenta cada desviación con evidencia. Nomenclatura: se usa
`ADMIN_PORTAL`/`ADMIN_COMMERCE` (código real), no `PORTAL_ADMIN`/`COMMERCE_ADMIN`
(ver resolución de AUTH-06 en `01-auth-audit.md`).

## Actores

| Actor | Definición | Autenticado vía |
|---|---|---|
| `SUPERADMIN` | Scope `GLOBAL` | Backoffice (JWT) |
| `ADMIN_PORTAL` | Scope `PORTAL`, un `scopePortalId` | Backoffice (JWT) |
| `ADMIN_COMMERCE` | Scope `COMMERCE`, un `scopeCommerceId` | Backoffice (JWT) |
| `VIEWER` | Scope `GLOBAL`/`PORTAL`/`COMMERCE` (el único rol sin scope fijo — `role-assignment.entity.ts:47-51`, el segundo `CHECK` no restringe `VIEWER` a un `scope_type`) | Backoffice (JWT) |
| Público (pagador) | Sin `AppUser`, sin login | Ninguno — Portal Público, fuera del alcance de esta auditoría (`ROLE_PERMISSION_MATRIX.md` §1) |

## Matriz Actor × Recurso × Acción × Scope × Allowed (verificada contra código)

Leyenda de **Estado**: ✅ coincide con el negocio · ⚠️ **gap real** (bug o
laguna de autorización) · 🟡 gap conocido/documentado como pendiente por el
propio negocio (no es un hallazgo nuevo) · — no implementado todavía (fuera
de alcance de auth).

### Portal

| Acción | Ruta | `@Roles` (código) | Scope check | Negocio (§5.2) | Estado |
|---|---|---|---|---|---|
| Crear | `POST /portals` | `SUPERADMIN` (`portals.controller.ts:18`) | n/a | SUPERADMIN únicamente | ✅ |
| Listar | `GET /portals` | `SUPERADMIN, ADMIN_PORTAL, VIEWER` (`:25`) | `portals.service.ts` filtra por scope (no citado línea por línea en esta pasada) | `ADMIN_COMMERCE` sin acceso; resto según scope | ✅ (ADMIN_COMMERCE correctamente excluido a nivel de ruta) |
| Ver detalle | `GET /portals/:id` | `SUPERADMIN, ADMIN_PORTAL, VIEWER` (`:32`) | igual que arriba | igual | ✅ |
| Editar | `PATCH /portals/:id` | `SUPERADMIN, ADMIN_PORTAL` (`:39`) | scope propio | `ADMIN_PORTAL` 🔒 propio | ✅ |
| Activar/desactivar | `PATCH /portals/:id/status` | `SUPERADMIN, ADMIN_PORTAL` (`:50`) | scope propio | igual | ✅ |
| Publicar/despublicar | `PATCH /portals/:id/publish\|unpublish` | `SUPERADMIN, ADMIN_PORTAL` (`:61`, `:69`) | scope propio | "SUPERADMIN y ADMIN_PORTAL del portal correspondiente" | ✅ |
| Eliminar | — | no existe endpoint | — | 🟡 pendiente de negocio (§9.2) | 🟡 (sin cambios — correcto no implementarlo hasta que se confirme) |

### Category (categorías, específicas por portal)

| Acción | Ruta | `@Roles` | Scope check (código) | Negocio (§5.3) | Estado |
|---|---|---|---|---|---|
| Crear | `POST /portals/:portalId/categories` | `SUPERADMIN, ADMIN_PORTAL` (`categories.controller.ts:20`) | `assertScope(actor, {portalId})` (`categories.service.ts:29`) | SUPERADMIN / ADMIN_PORTAL propio; resto ❌ | ✅ (ADMIN_COMMERCE ya bloqueado por `@Roles`, coincide) |
| Listar por portal | `GET /portals/:portalId/categories` | **sin `@Roles`** (cualquier autenticado) | `assertScope(actor, {portalId})` — **sin `commerceId`** (`categories.service.ts:35`) | `ADMIN_COMMERCE`: 👁 propio ámbito · `VIEWER`: 👁 según scope | ⚠️ **GAP-01** |
| Ver detalle | `GET /categories/:id` | sin `@Roles` | `assertScope(actor, {portalId: category.portalId})` — **sin `commerceId`** (`categories.service.ts:42`) | igual | ⚠️ **GAP-01** |
| Editar | `PATCH /categories/:id` | `SUPERADMIN, ADMIN_PORTAL` (`:43`) | scope propio | SUPERADMIN / ADMIN_PORTAL propio | ✅ |
| Activar/desactivar | — | no existe endpoint separado (solo vía `update` si el DTO lo permitiera — **no verificado si `UpdateCategoryDto` incluye `status`** en esta pasada) | — | negocio pide acción explícita | 🟡 sin verificar en profundidad, fuera del foco de auth |
| Eliminar | — | no existe | — | 🟡 pendiente negocio (§9.2) | 🟡 |

**GAP-01 — CORREGIDO (2026-08-31).** Fix aplicado en la misma sesión, decisión
del usuario: `categories.service.ts` ahora inyecta `CommerceEntity`
(`categories.module.ts`, `TypeOrmModule.forFeature([CategoryEntity,
CommerceEntity])`) y las cuatro llamadas a `assertScope` pasan por un nuevo
helper `assertPortalScope`: para actores con `scopeType === 'PORTAL'`/`GLOBAL`
delega en `ScopeAuthorizationService.assertScope` sin cambios; para
`scopeType === 'COMMERCE'` carga el comercio propio del actor
(`scopeCommerceId`) y verifica que su `portalId` coincida con el portal
solicitado, el mismo patrón "cargar el recurso real, luego comparar" que ya
usa `commerces.service.ts`. Regresión cubierta con 4 tests e2e nuevos en
`apps/api/test/catalog.e2e-spec.ts` (`describe('Category — commerce-scoped
read (GAP-01 regression)')`): `ADMIN_COMMERCE` ahora puede listar/ver
categorías de su propio portal (200, antes 403) y sigue recibiendo 403 al
intentar leer categorías de un portal ajeno (BOLA cross-portal, sin cambios).
Verificado con evidencia real de comandos ejecutados, no afirmado:
`pnpm exec eslint` limpio, `pnpm exec tsc --noEmit` limpio, `pnpm test` → 35/35,
`pnpm test:integration` → 70/70 (66 preexistentes + 4 nuevos), todos en
`apps/api`. Sin cambios en `create`/`update` de categorías (ya bloqueados a
`ADMIN_COMMERCE` por `@Roles`, sin efecto práctico ahí).

Texto original del hallazgo (para trazabilidad, ya resuelto):
`ScopeAuthorizationService.assertScope` solo permite a un actor con
`scopeType === 'COMMERCE'` cuando `target.commerceId` está presente y coincide
(`scope-authorization.service.ts:43`: `user.scopeType === 'COMMERCE' &&
target.commerceId && user.scopeCommerceId === target.commerceId`). Todos los
demás módulos que sí necesitan cubrir actores `COMMERCE` resuelven primero el
`commerceId` real antes de llamar `assertScope` — `commerces.service.ts:65-68`
(rama dedicada para `scopeType === 'COMMERCE'`), `services.service.ts:33/40/48/55`
(siempre carga el `Commerce` y pasa `commerceId: commerce.id`), y todo el
subárbol de `forms/*` vía `FormScopeResolverService.resolveFrom*`
(`form-scope-resolver.service.ts:55-61`, siempre retorna `{portalId,
commerceId}` juntos). **`categories.service.ts` es la única excepción**: sus
cuatro llamadas a `assertScope` (`:29`, `:35`, `:42`, `:48`) pasan únicamente
`{portalId}`, nunca resuelven ni pasan un `commerceId`. Efecto real: **todo
actor con `scopeType === 'COMMERCE'` — es decir, todo `ADMIN_COMMERCE` y todo
`VIEWER` asignado a un comercio — recibe 403 en `GET
/portals/:portalId/categories` y `GET /categories/:id` sin excepción**,
aunque `ROLE_PERMISSION_MATRIX.md §5.3` documenta 👁 (solo lectura) para
ambos. No afecta `create`/`update` (ya bloqueados por `@Roles` para esos
actores, correctamente). Es autorización de negocio, no un problema del
mecanismo de auth (JWT/cookies) — **no se corrige en esta fase** (Fase 2 es
solo auditoría), queda registrado para decidir en Fase 3/6 si se corrige antes,
durante o después de la migración a Better Auth (es independiente de qué
proveedor de auth se use).

### Commerce (comercio aliado)

| Acción | Ruta | `@Roles` | Scope check | Negocio (§5.4) | Estado |
|---|---|---|---|---|---|
| Crear | `POST /portals/:portalId/commerces` | `SUPERADMIN, ADMIN_PORTAL` | `assertScope(actor,{portalId})` (`commerces.service.ts:51`) | SUPERADMIN / ADMIN_PORTAL propio | ✅ |
| Listar por portal | `GET /portals/:portalId/commerces` | sin `@Roles` | rama dedicada `scopeType==='COMMERCE'` → solo su propio comercio; resto `assertScope` (`:64-72`) | `ADMIN_COMMERCE`: 🔒 propio | ✅ |
| Ver detalle | `GET /commerces/:id` | sin `@Roles` | `assertScope(actor,{portalId, commerceId})` (`:76`) | según scope | ✅ |
| Editar | `PATCH /commerces/:id` | `SUPERADMIN, ADMIN_PORTAL` (`:41`) | scope propio, **sin `ADMIN_COMMERCE`** | negocio: `ADMIN_COMMERCE` 🔒 propio (edición) | 🟡 **GAP-02** |
| Activar/desactivar | `PATCH /commerces/:id/status` | `SUPERADMIN, ADMIN_PORTAL` (`:52`) | igual, sin `ADMIN_COMMERCE` | negocio: "🔒 propio *si se autoriza operativamente*" (condicional) | 🟡 **GAP-02** |
| Publicar/despublicar | `PATCH /commerces/:id/publish\|unpublish` | `SUPERADMIN, ADMIN_PORTAL` (`:63`,`:71`) | scope propio | `ADMIN_COMMERCE` ❌ | ✅ |
| Eliminar | — | no existe | — | 🟡 pendiente negocio, política superior | 🟡 |

**GAP-02 (ya documentado, no es un hallazgo nuevo):** el propio código lo
señala explícitamente — `commerces.service.ts:80` (docblock de `update`):
*"SUPERADMIN and ADMIN_PORTAL (own) only — ADMIN_COMMERCE has no confirmed
write access to its own commerce fields in this phase (docs/adr/011 §5,
deliberately conservative)"*. Coincide exactamente con
`ROLE_PERMISSION_MATRIX.md §9`, pendiente #3: *"Confirmar si ADMIN_COMMERCE
puede desactivar su propio comercio o solo editar su contenido"*. Es una
decisión de negocio explícitamente abierta, no un defecto — se lista aquí
solo para trazabilidad completa del modelo de acceso.

### Service (servicio cobrable de un comercio)

| Acción | Ruta | `@Roles` | Scope check | Negocio (§5.5) | Estado |
|---|---|---|---|---|---|
| Crear | `POST /commerces/:commerceId/services` | `SUPERADMIN, ADMIN_PORTAL, ADMIN_COMMERCE` (`services.controller.ts:17`) | `assertScope(actor,{portalId,commerceId})` (`services.service.ts:33`) | los tres, `ADMIN_COMMERCE` 🔒 propio | ✅ |
| Listar por comercio | `GET /commerces/:commerceId/services` | sin `@Roles` | `:40` | según scope | ✅ |
| Ver detalle | `GET /services/:id` | sin `@Roles` | `:48` | según scope | ✅ |
| Editar | `PATCH /services/:id` | `SUPERADMIN, ADMIN_PORTAL, ADMIN_COMMERCE` (`:43`) | `:55` | los tres, `ADMIN_COMMERCE` 🔒 propio | ✅ |
| Reglas de pago | — | no existe endpoint separado | — | negocio lo pide (§5.5) | — no implementado (payment rules no construidas todavía, consistente con ausencia de módulo de métodos de pago) |
| Eliminar | — | no existe | — | 🟡 pendiente negocio | 🟡 |

### Formularios dinámicos (FormDefinition → FormVersion → FormField, FormSubmission)

| Acción | Ruta | `@Roles` | Scope check | Negocio (§5.6) | Estado |
|---|---|---|---|---|---|
| Crear definición | `POST /services/:serviceId/form-definition` | `SUPERADMIN, ADMIN_PORTAL, ADMIN_COMMERCE` (`form-definitions.controller.ts:15`) | vía `FormScopeResolverService` (`form-definitions.service.ts:36`) | los tres | ✅ |
| Ver definición | `GET /services/:serviceId/form-definition` | sin `@Roles` | `:58` | según scope | ✅ |
| Crear versión | `POST /form-definitions/:id/versions` | `SUPERADMIN, ADMIN_PORTAL, ADMIN_COMMERCE` | `form-versions.service.ts:48` | los tres | ✅ |
| Listar/ver versión | `GET .../versions`, `GET /form-versions/:id` | sin `@Roles` | `:69`, `:81` | según scope | ✅ |
| Cambiar status de versión (borrador↔retirado, no publicar) | `PATCH /form-versions/:id` | `SUPERADMIN, ADMIN_PORTAL, ADMIN_COMMERCE` | `:105` | los tres pueden trabajar el formulario | ✅ |
| **Publicar** versión | `PATCH /form-versions/:id/publish` | `SUPERADMIN, ADMIN_PORTAL` — **sin `ADMIN_COMMERCE`** (`form-versions.controller.ts:52`) | `:116` | *"El ADMIN_COMMERCE... no puede publicar... salvo cambio futuro de negocio"* | ✅ (coincide exactamente) |
| **Despublicar** versión | `PATCH /form-versions/:id/unpublish` | `SUPERADMIN, ADMIN_PORTAL` (`:60`) | `:151` | igual | ✅ |
| Agregar/editar/borrar campo | `POST\|PATCH\|DELETE` sobre `form-fields` | `SUPERADMIN, ADMIN_PORTAL, ADMIN_COMMERCE` (`form-fields.controller.ts:17,37,48`) | `form-fields.service.ts:50`, `:81` | los tres, `ADMIN_COMMERCE` 🔒 propio | ✅ |
| Listar campos | `GET form-versions/:id/fields` | sin `@Roles` | scope check dentro del service (no listado en el grep de `assertScope` para `findAllForVersion` — **no verificado línea por línea si filtra por scope o solo por pertenencia**) | según scope | 🟡 sin verificar en profundidad esta ruta puntual |
| Capturar respuesta (submission) | `POST .../submissions` | `SUPERADMIN, ADMIN_PORTAL, ADMIN_COMMERCE` — **`VIEWER` excluido explícitamente** (`form-submissions.controller.ts:12,19`) | `form-submissions.service.ts:44` | negocio no cubre submissions administrativas explícitamente en §5.6 (es una capacidad interna, "captura administrativa", no reemplaza el flujo público real) | ✅ diseño consistente y documentado en el propio código |
| Listar respuestas | `GET .../submissions` | `SUPERADMIN, ADMIN_PORTAL, ADMIN_COMMERCE` (`:30`) | `:65` | igual | ✅ |

### AppUser (usuarios administrativos)

| Acción | Ruta | `@Roles` | Scope check | Negocio (§5.1) | Estado |
|---|---|---|---|---|---|
| Crear | `POST /users` | `SUPERADMIN, ADMIN_PORTAL, ADMIN_COMMERCE` (`users.controller.ts:18`) | `ScopeAuthorizationService.assertCanAssignRole` (matriz completa, `scope-authorization.service.ts:55-89`) | matriz §5.1 completa (quién crea qué rol/scope) | ✅ verificado línea por línea, coincide exactamente con la matriz de negocio |
| Listar | `GET /users` | los tres (`:25`) | `UsersService.findAll` — `WHERE` por scope, no filtro en memoria (Fase 1, `users.service.ts:115-135`) | "Ver usuarios de su ámbito 🔒" | ✅ |
| Ver uno | `GET /users/:id` | sin `@Roles` (propio usuario o dentro de scope de un admin) | `isWithinManagedScope` (Fase 1, `users.service.ts:230-254`) | igual | ✅ |
| Editar nombre | `PATCH /users/:id` | sin `@Roles` | igual, `UpdateUserSchema` solo acepta `fullName` (Fase 1) | "Editar usuario de su ámbito 🔒" | ✅ |
| Activar/desactivar | `PATCH /users/:id/status` | los tres (`:48`) | dentro del scope del actor | igual | ✅ |
| Eliminar definitivamente | — | no existe | — | 🟡 pendiente negocio (§9.1, marcado explícitamente 🟡 incluso para SUPERADMIN) | 🟡 |

### RoleAssignment (reasignación de rol/scope)

| Acción | Ruta | `@Roles` | Scope check | Negocio (§7) | Estado |
|---|---|---|---|---|---|
| Reasignar rol/scope de un usuario existente | `PATCH /users/:userId/role-assignment` | **`SUPERADMIN` únicamente** (`role-assignments.controller.ts:16`) | ninguno adicional — `RoleAssignmentsService.reassign` no valida el scope del actor porque solo `SUPERADMIN` puede llegar ahí (`role-assignments.service.ts:38-78`) | Negocio **recomienda** (§7, "Autoridades recomendadas"): además de `SUPERADMIN`, `ADMIN_PORTAL` reasigna `ADMIN_COMMERCE`/`VIEWER` dentro de su portal, `ADMIN_COMMERCE` reasigna sus `VIEWER` dentro de su comercio | ⚠️ **GAP-03** |

**GAP-03 (hallazgo nuevo de esta auditoría):** `docs/business/ROLE_PERMISSION_MATRIX.md`
§7 formula una recomendación explícita de negocio para que `ADMIN_PORTAL` y
`ADMIN_COMMERCE` puedan reasignar scope dentro de su propio ámbito (creación
de usuarios ya lo permite vía `assertCanAssignRole`, pero **reasignar un
usuario ya existente es una operación distinta** — `PATCH
/users/:userId/role-assignment` — y hoy está cerrada a `SUPERADMIN`
exclusivamente, sin excepción). `ADR 011` no documenta esto como una decisión
consciente de restringir la recomendación del negocio — solo describe la
mecánica transaccional de `reassign` (§"role_assignments como tabla de
estado"), sin mencionar por qué se excluyó a `ADMIN_PORTAL`/`ADMIN_COMMERCE`.
**No se asume la causa** (pudo ser simplificación deliberada de MVP o un
descuido) — es una pregunta para el usuario, no una corrección automática.

### AuditEvent

| Acción | Ruta | `@Roles` | Negocio | Estado |
|---|---|---|---|---|
| Listar eventos | `GET /audit-events` | `SUPERADMIN` únicamente (`audit.controller.ts:21`) | negocio no define una matriz explícita para auditoría; el propio código anota que una vista con scope para `ADMIN_PORTAL` es "extensión futura no confirmada por el negocio" (`audit.controller.ts:14`, ya visto en Fase 1) | ✅ consistente, gap ya reconocido y no bloqueante |

### Transaction / TransactionEvent

| Acción | Ruta | `@Roles` | Negocio (§5.8) | Estado |
|---|---|---|---|---|
| Listar / ver detalle / eventos | `GET /transactions`, `GET /transactions/:id`, `GET /transactions/:id/events` | sin `@Roles` (según scope, filtrado en el service — no releído línea por línea en esta pasada) | "Listar/Ver detalle 🔒 según rol y scope" | ✅ por diseño (controller documenta explícitamente por qué es 100% read-only, `transactions.controller.ts:8-15`) |
| Crear manualmente | — | no existe ninguna ruta de escritura | "❌ para los cuatro roles, sin excepción" (§5.8) | ✅ — coincide exactamente; ver ADR 012 (la creación real depende del futuro flujo de pago público, fuera de este alcance) |
| Editar monto / cambiar estado arbitrario | — | no existe | "❌ para los cuatro roles" | ✅ |
| Corrección financiera | — | no existe todavía | negocio: `SUPERADMIN`/`ADMIN_PORTAL` dentro de su scope | — no implementado (consistente con ADR 012, capacidad de pagos aún no construida) |

### Métodos de pago y Reportes (§5.7, §5.9)

No existe ningún módulo `payment-methods` ni `reports` en
`apps/api/src/modules` (`find apps/api/src/modules -iname "*payment*" -o
-iname "*method*" -o -iname "*report*"` → sin resultados). El negocio ya
marca partes de §5.7 como 🟡 ("modelo exacto de habilitación pendiente de
confirmación") — no hay nada que auditar todavía en código porque no está
construido; no es un gap de autorización, es alcance no implementado.

## Resumen de hallazgos de esta fase

| # | Hallazgo | Tipo | Severidad | Estado |
|---|---|---|---|---|
| GAP-01 | `categories.service.ts` nunca resolvía `commerceId` al llamar `assertScope` → `ADMIN_COMMERCE`/`VIEWER`-COMMERCE recibían 403 en `GET` de categorías, contra lo documentado (§5.3, 👁) | Bug real de autorización (nuevo, no documentado antes) | MEDIUM (rompía una capacidad de lectura ya confirmada por negocio, no una escalación de privilegio) | **CORREGIDO** (2026-08-31, ver detalle arriba) |
| GAP-02 | `ADMIN_COMMERCE` no puede editar/activar-desactivar su propio comercio | Ya documentado en código y en `ROLE_PERMISSION_MATRIX.md §9` pendiente #3 | INFO | Ninguna — es una decisión de negocio ya reconocida como abierta, no se re-litiga aquí |
| GAP-03 | Reasignación de rol/scope (`PATCH /users/:userId/role-assignment`) es `SUPERADMIN`-only; negocio recomienda extenderla a `ADMIN_PORTAL`/`ADMIN_COMMERCE` dentro de su scope (§7) | Laguna entre recomendación de negocio e implementación | LOW-MEDIUM (no es un agujero de seguridad — es *más* restrictivo que lo recomendado, no menos) | Pregunta para el usuario: ¿implementar antes de Better Auth, durante, o dejarlo fuera de alcance de esta migración? |

Ningún hallazgo de esta fase es una vulnerabilidad de escalación de
privilegios — GAP-01 y GAP-03 son ambos casos donde el sistema es **más
restrictivo** de lo que el negocio documentó, nunca menos. No hay ninguna vía
encontrada en esta pasada donde un actor obtenga más acceso del que
`ROLE_PERMISSION_MATRIX.md` autoriza.

## Alcance no cubierto en esta pasada (no bloquea GATE 2)

- `UpdateCategoryDto` — no se verificó si acepta cambiar `status`.
- Filtro de scope exacto en `findAllForVersion` de `form-fields.service.ts`.
- `portals.service.ts`, `transactions.service.ts` — no releídos línea por
  línea en esta fase (ya cubiertos parcialmente en Fase 1 para transactions).

---

## GATE 2

| Pregunta | Respuesta con evidencia |
|---|---|
| ¿Existe un modelo de negocio documentado de antemano? | Sí — `docs/business/ROLE_PERMISSION_MATRIX.md` y relacionados, ya en el repo antes de esta migración |
| ¿El código implementado coincide con ese modelo? | Mayormente sí; tres desviaciones documentadas (GAP-01 real, GAP-02 y GAP-03 ya sea conocido o de "más restrictivo que lo recomendado") |
| ¿Hay alguna vía de escalación de privilegios encontrada? | No, ninguna en esta pasada |
| ¿Quedan capacidades de negocio sin implementar? | Sí, ya reconocidas por el propio negocio como 🟡 pendientes o fuera de alcance (eliminación física, métodos de pago, reportes, corrección financiera) — ninguna es sorpresa nueva |

### GATE 2: **PASS**

El modelo de negocio está suficientemente entendido y verificado contra el
código para diseñar la arquitectura objetivo (Fase 3). GAP-01 y GAP-03 quedan
como preguntas abiertas para el usuario — no bloquean diseñar el ADR de
Better Auth, porque son ortogonales a qué proveedor de autenticación se use
(son autorización de negocio, no mecanismo de auth), pero si el usuario
quiere corregirlos, conviene decidir *cuándo* (antes/durante/después de la
migración) antes de tocar código de autorización en Fase 6.
