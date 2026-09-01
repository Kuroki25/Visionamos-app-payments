<!--
Fase 4 — Estrategia de base de datos/migraciones (PROMPT MAESTRO §22-24).
Planificación, no ejecución: ninguna migración se corrió, ninguna tabla se
tocó. Ejecutado 2026-08-31, construido sobre las decisiones ya fijadas en
`docs/adr/013-better-auth-migration.md` (Fase 3). Docker no estaba corriendo
en esta sesión (`docker ps` → "cannot connect to the Docker daemon"), así que
el conteo real de filas en el Postgres de desarrollo sigue NO VERIFICADO —
ver "Pendiente de ejecutar antes de Fase 10" al final.
-->

# Fase 4 — Estrategia de base de datos y migraciones

## 1. Esquema nuevo (propiedad de Better Auth)

Cuatro tablas nuevas, generadas/migradas por el propio CLI de Better Auth
(`npx @better-auth/cli generate` / `migrate`), no por TypeORM. Columnas
listadas a continuación **según documentación/comunidad consultada el
2026-08-31 (`better-auth.com/docs/concepts/database`, corroborado por
búsqueda adicional) — la página oficial delega el detalle exacto de columnas
a un componente interactivo que esta auditoría no pudo renderizar, así que
esta lista se marca NO VERIFICADO en el detalle fino (tipos SQL exactos,
longitudes, nullability). La fuente de verdad real es la salida de
`npx @better-auth/cli generate` corrida contra `better-auth@1.7.2` real en
Fase 5 — este listado es la base de planificación, no el schema final.**

| Tabla | Campos (según fuente consultada) |
|---|---|
| `user` | `id` (PK), `name`, `email` (unique), `emailVerified` (bool), `image`, `createdAt`, `updatedAt` |
| `session` | `id` (PK), `token` (unique), `expiresAt`, `ipAddress`, `userAgent`, `userId` (FK → `user`), `createdAt`, `updatedAt` |
| `account` | `id` (PK), `accountId`, `providerId`, `userId` (FK → `user`), `accessToken`, `refreshToken`, `idToken`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `scope`, `password`, `createdAt`, `updatedAt` |
| `verification` | `id` (PK), `identifier`, `value`, `expiresAt`, `createdAt`, `updatedAt` |

Con `advanced.database.generateId: "uuid"` (ADR 013), `id` en las cuatro
tablas es `uuid`, consistente con el resto del schema.

## 2. Tabla de perfil de negocio (`users`, hoy `AppUser`)

**Decisión de esta fase**: se conserva el nombre físico `users` y la entidad
`AppUser` — no se renombra a algo como `app_user_profiles`. Justificación:
`role_assignments.user_id`, `audit_events.actor_user_id`, todos los DTOs,
tests, y cada referencia en código a `UsersService`/`AppUser` seguirían
funcionando sin tocarse; renombrar la tabla física no aporta nada que un
comentario en el entity no resuelva igual de bien, y contradice "no
reescribir todo de una vez" (prompt maestro).

Cambios necesarios en `users` (tabla existente, `apps/api/src/migrations/`):

- **Quitar** la columna `password_hash` — dejó de tener dueño una vez que
  Better Auth gestiona la contraseña en `account.password`. Ver §4 sobre
  *cuándo* (no en esta fase — se difiere a Fase 10, ver §5).
- **`id` deja de autogenerarse** — hoy `@PrimaryGeneratedColumn('uuid')`
  (`user.entity.ts`); pasa a ser un valor explícito asignado en el momento
  de creación = el mismo `id` que Better Auth genera para la fila `user`
  correspondiente (perfil 1:1, ADR 013).
- **Nueva `FOREIGN KEY (id) REFERENCES "user"(id) ON DELETE CASCADE`** — un
  perfil de negocio no tiene sentido sin su identidad de auth, mismo
  principio que ya usa `role_assignments.user_id → users(id) ON DELETE
  CASCADE` hoy (ADR 011, docblock de `RoleAssignmentEntity`).
- Todo lo demás de `users` (`full_name`, `status`, timestamps) no cambia.

## 3. FKs existentes — sin cambios de valor, solo de cadena conceptual

- `role_assignments.user_id → users(id)`: **sin cambios de dato**. Sigue
  apuntando a `users(id)`, que a su vez ahora referencia `user(id)` de
  Better Auth — una cadena de dos FKs en vez de una, pero ningún UUID
  existente en `role_assignments` necesita reescribirse.
- `audit_events.actor_user_id → users(id) ON DELETE RESTRICT`: igual, sin
  cambios de dato.
- `refresh_tokens`: se retira (ADR 013) — no participa de esta migración,
  se elimina en Fase 10 tras cutover probado, no antes.

## 4. Script de migración de datos (por cada `AppUser` existente)

Orden dentro de una única transacción por usuario (atomicidad por fila, no
un solo `BEGIN` gigante para toda la tabla — si un usuario falla, no bloquea
la migración del resto):

1. Insertar en `user` (Better Auth): mismo `id`, `email`, `name = full_name`,
   `emailVerified = true` (**decisión a confirmar con el usuario en Fase 5**:
   todos los `AppUser` existentes fueron creados administrativamente sin
   flujo de verificación de correo — tratarlos como ya verificados evita que
   Better Auth intente reenviar un correo de verificación a cuentas que ya
   llevan tiempo operando), `createdAt`/`updatedAt` preservados del original.
2. Insertar en `account`: `providerId: 'credential'`, `accountId: <mismo
   id>`, `userId: <mismo id>`, `password: <password_hash existente, sin
   recalcular>` (patrón oficial, ADR 013 §"Contraseñas").
3. **No tocar todavía** `users.password_hash` ni añadir la FK de §2 — eso
   ocurre en un paso de validación posterior (§5), no en el mismo script.

## 5. Orden de ejecución de extremo a extremo (Fase 4 → Fase 10)

Secuencia recomendada, cada paso solo aditivo hasta el final (nada
destructivo hasta que el paso anterior esté probado — prompt maestro: "no
borrar legacy sin migración probada"):

1. **Fase 5**: instalar Better Auth, correr su CLI para crear `user`/
   `session`/`account`/`verification` — tablas nuevas, no rompen nada
   existente (`users`, `role_assignments`, etc. siguen intactas y en uso).
2. **Fase 5/6**: correr el script de §4 contra cada `AppUser` existente
   (entorno de desarrollo primero, nunca directo a producción).
3. **Validación de integridad** (antes de tocar `users`): confirmar con una
   consulta que cada fila de `users` tiene su contraparte en `user` y en
   `account` con `providerId='credential'` — cero huérfanos. Ejemplo de la
   forma de la consulta (no ejecutada en esta fase, no hay Postgres real
   corriendo en esta sesión):
   ```sql
   SELECT u.id FROM users u
   LEFT JOIN "user" bu ON bu.id = u.id
   LEFT JOIN account a ON a.user_id = u.id AND a.provider_id = 'credential'
   WHERE bu.id IS NULL OR a.id IS NULL;
   -- debe devolver 0 filas antes de continuar
   ```
4. **Fase 7-9**: implementar el adapter propio (ADR 013), probar login/
   logout/refresh-equivalente contra Better Auth en paralelo al sistema
   viejo (posible flag `AUTH_PROVIDER`, prompt maestro Fase 10), sin haber
   quitado nada legacy todavía.
5. **Fase 10 (cutover), no antes**: recién aquí — con el nuevo sistema
   probado end-to-end — se ejecuta lo destructivo, en este orden: (a) añadir
   la `FOREIGN KEY (id) REFERENCES "user"(id)` a `users`, (b) `DROP COLUMN
   password_hash`, (c) `DROP TABLE refresh_tokens`. No antes.

## 6. Entorno de test (SQLite en memoria)

Fase 1 confirmó que los tests e2e corren contra `better-sqlite3` con
`synchronize: true` (`database.module.ts:32-40`), no contra las migraciones
TypeORM reales. `synchronize: true` recreará automáticamente la nueva forma
de `users` (sin `password_hash`, con la FK) a partir del entity actualizado
— eso no cambia. **Pregunta abierta para Fase 5, no resuelta aquí**: las
tablas de Better Auth no se crean vía `synchronize` de TypeORM (son de un
adapter distinto) — hay que decidir en Fase 5, con el paquete ya instalado,
si el adapter de Better Auth soporta SQLite en el mismo `:memory:` que usan
hoy los tests (documentado como uno de los adapters soportados por Better
Auth en términos generales, pero no verificado específicamente para este
setup) o si el entorno de test necesita su propia estrategia de bootstrap
para esas cuatro tablas.

## 7. Historial de migraciones — resuelve la pregunta abierta del ADR 013

El ADR 013 dejó sin decidir "un historial de migraciones vs. dos". Con el
análisis de este documento, la respuesta tiene más matices de los que
parecía: **Better Auth y TypeORM nunca necesitan tocar la misma tabla en la
misma migración** — Better Auth es dueño exclusivo de sus cuatro tablas
nuevas; TypeORM sigue siendo dueño exclusivo de todo lo demás, incluyendo el
`ALTER TABLE users` de §2/§5. La única tabla que "conecta" ambos mundos es
`users`, y la conexión es una FK simple que vive del lado TypeORM,
ejecutada *después* de que las tablas de Better Auth ya existen.

**Decisión**: dos historiales de migración, cada uno dueño de un conjunto de
tablas disjunto — el CLI de Better Auth gestiona las suyas, TypeORM sigue
gestionando las suyas (incluida la FK de conexión). No se pliega el SQL de
Better Auth a mano dentro de una migración TypeORM (alternativa que el ADR
013 dejaba como preferencia tentativa) — hacerlo significaría mantener a
mano una copia de un schema que su propio CLI ya versiona y regenera mejor,
sin ganar nada real a cambio. **Se actualiza `docs/adr/013-better-auth-migration.md`
§"Migraciones de base de datos" para reflejar esta conclusión** (ver ese
archivo).

## 8. Riesgos de migración de datos

- Ningún usuario de producción real confirmado todavía — Fase 1 ya lo
  marcó NO VERIFICADO. **Sigue NO VERIFICADO en esta sesión**: Docker no
  estaba corriendo (`docker ps` → no se pudo conectar al daemon), así que no
  se pudo correr `SELECT count(*) FROM users` contra el Postgres real de
  desarrollo. Ver "Pendiente" abajo.
- Si `emailVerified = true` para todos los usuarios migrados resulta
  incorrecto para el negocio (p. ej. si se quiere forzar verificación real
  a futuro), es una decisión a tomar en Fase 5, no asumida aquí de forma
  irreversible — no toca ningún dato hasta ese momento.
- El `DROP COLUMN password_hash` (§5, paso 5b) es irreversible sin backup —
  motivo explícito por el que se pospone hasta después de un cutover
  probado, nunca antes.

## Pendiente de ejecutar antes de Fase 10 (no bloquea GATE 4)

- ~~Levantar el stack y correr `SELECT count(*) FROM users;`~~ — **hecho**,
  ver `docs/auth-migration/06-real-migration-run.md`: 5 usuarios reales
  (datos de `seed-demo.ts`), los 5 migrados sin huérfanos.
- ~~Confirmar `emailVerified = true` por defecto~~ — **aplicado** en el
  script real (`migrate-users-to-better-auth.ts`); no hubo objeción del
  usuario al ejecutarlo, pero sigue siendo revisable si en el futuro se
  añaden usuarios con expectativa real de verificación de email.
- ~~Confirmar el schema exacto de las cuatro tablas~~ — **hecho**, el DDL
  real generado por `npx auth generate` está en
  `06-real-migration-run.md` §1, con una corrección real a la lista de
  columnas de este documento (`account.issuer`, que la lista original no
  tenía).

---

## GATE 4

| Pregunta | Respuesta con evidencia |
|---|---|
| ¿Qué tablas son nuevas y quién las gestiona? | `user`/`session`/`account`/`verification`, CLI de Better Auth |
| ¿Qué tabla existente cambia y cómo? | `users`: quita `password_hash`, `id` deja de autogenerarse, gana FK a `user(id)` |
| ¿Se pierde algún dato? | No hasta Fase 10 — todo el plan hasta ahí es aditivo; el único paso destructivo (`DROP password_hash`, `DROP refresh_tokens`) queda explícitamente pospuesto a después de un cutover probado |
| ¿Se resuelve la pregunta de uno/dos historiales de migración? | Sí — dos historiales, dueños de conjuntos de tablas disjuntos, sin plegar a mano el schema de Better Auth |
| ¿Hay un conteo real de usuarios a migrar? | Sí — 5, verificado y migrado en `06-real-migration-run.md` |

### GATE 4: **PASS (plan, no ejecutado)**

El plan de datos es concreto y aditivo-primero, con un paso de validación de
integridad explícito antes de tocar nada existente, y con lo destructivo
pospuesto a Fase 10 tal como exige el prompt maestro. Un pendiente real
(conteo de usuarios) queda registrado, no bloquea seguir a Fase 5 porque no
cambia la estrategia — solo confirma su magnitud.
