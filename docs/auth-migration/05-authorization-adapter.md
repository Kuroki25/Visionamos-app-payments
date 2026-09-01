<!--
Fase 6 — Capa de autorización / AuthenticationPort concreto (PROMPT MAESTRO
§26). Ejecutado 2026-08-31. Sigue sin Docker (mismo bloqueo que Fases 4-5) —
todo lo de aquí se probó con sesiones simuladas, no contra un login real.
-->

# Fase 6 — El adapter de autenticación (`BetterAuthSessionGuard`)

## Qué se hizo

`apps/api/src/infra/better-auth/better-auth-session.guard.ts` — el
`AuthenticationPort` concreto que exige
el prompt maestro (§4/§5) y que `docs/adr/013-better-auth-migration.md` ya
había diseñado en la sección "Integración con NestJS". Es un reemplazo
directo de `JwtAuthGuard`, y **solo** de `JwtAuthGuard`:

- Mismo opt-out `@Public()` (reutiliza `IS_PUBLIC_KEY` del decorador
  existente, no define uno nuevo).
- Mismo `request.user: AuthenticatedRequestUser` (`{ sub, role, scopeType,
  scopePortalId, scopeCommerceId }`) — `RolesGuard`, `CsrfGuard`,
  `ScopeAuthorizationService`, `@CurrentUser()`, y los nueve módulos de
  negocio no requieren ningún cambio para seguir funcionando detrás de este
  guard.
- Mismo principio deny-by-default: cualquier cosa que no sea una sesión
  válida + perfil `ACTIVE` + `role_assignments` presente lanza
  `UnauthorizedException`, igual que `JwtAuthGuard` hoy.

Diferencia deliberada (ya anticipada en el ADR): Better Auth solo resuelve
identidad (`session.userId`) — no sabe nada de `role`/`scope`. El guard,
tras resolver la sesión vía `auth.api.getSession({ headers:
fromNodeHeaders(request.headers) })` (`fromNodeHeaders` es el helper oficial
de `better-auth/node`, verificado contra el paquete real en Fase 5), hace
dos lecturas a `users`/`role_assignments` — la consulta extra por request
que el ADR ya marcó como trade-off pendiente de medir (Fase 8).

`BetterAuthModule` (`better-auth.module.ts`) ahora también:
- Importa `TypeOrmModule.forFeature([UserEntity, RoleAssignmentEntity])`
  para que el guard pueda inyectar ambos repositorios.
- Registra y exporta `BetterAuthSessionGuard` como provider, listo para que
  Fase 10 lo añada al `APP_GUARD` chain de `app.module.ts` en lugar de
  `JwtAuthGuard` — **no se tocó `app.module.ts` en esta fase**, el guard
  sigue sin recibir tráfico real.

`BETTER_AUTH_INSTANCE` se movió a su propio archivo
(`better-auth.token.ts`) — no es solo prolijidad: `better-auth.module.ts`
importa `better-auth.factory.ts`, que a su vez importa el paquete real
`better-auth` (ESM-only). Cualquier código que solo necesite el token de DI
(como el guard, o un test) ahora puede importarlo sin arrastrar esa cadena.

## Un problema real encontrado y resuelto: Jest no puede cargar `better-auth`

Al escribir el test unitario del guard, la suite `pnpm test` falló con
`SyntaxError: Cannot use import statement outside a module` — Jest no
transforma `node_modules` por defecto, y `better-auth`/`better-auth/node`
son paquetes ESM-only (`.mjs`). **No es un problema del código de
producción** — Fase 5 ya había verificado en tres niveles distintos
(`require` directo de Node, `ts-node`, y el `.js` compilado por `nest
build`) que el interop ESM↔CJS funciona perfectamente en runtime real, con
Node 24. Es específicamente el loader propio de Jest el que es más
estricto.

Dos soluciones posibles:
- Ampliar `transformIgnorePatterns` en la config de Jest compartida
  (`package.json`) para que transforme los paquetes de Better Auth — cambio
  de configuración global por algo que hoy solo usa un módulo aislado.
- Separar el token de DI a su propio archivo sin imports pesados (ver
  arriba) + `jest.mock('better-auth/node', ...)` solo donde
  hace falta (un único punto, el spec del guard).

**Se eligió la segunda** — más quirúrgico, no toca configuración
compartida por un módulo que todavía no está en producción. Si Fase 7+
necesita tocar más superficie de Better Auth en tests, puede que valga la
pena revisar `transformIgnorePatterns` entonces, con más módulos como
evidencia de que vale la pena el cambio global — no se adelanta esa
decisión aquí sin necesidad real todavía.

## Verificación real

| Verificación | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | Limpio |
| `pnpm exec eslint src/infra/better-auth/` | Limpio |
| `pnpm test` (unit, incluye `better-auth-session.guard.spec.ts`, 5 casos nuevos) | 40/40 |
| `pnpm test:integration` (e2e) | 70/70 — sin cambios, el guard no está conectado a ninguna ruta real todavía |
| `pnpm build` | Compila sin error |

Los 5 casos del guard, contra un `auth.api.getSession` **simulado** (no hay
Postgres real disponible, Docker sigue sin conectar):
1. Una ruta `@Public()` nunca llama a Better Auth.
2. Sesión nula/inválida → `UnauthorizedException`.
3. Perfil `INACTIVE` con sesión válida → `UnauthorizedException` (igual
   que hoy revalida `AuthService.rotateRefreshToken`, Fase 1).
4. Usuario sin `role_assignments` → `UnauthorizedException` (mismo caso
   "corrupción de datos, no un 404 normal" que ya documenta
   `UsersService.loadUserWithAssignment`).
5. Camino feliz: `request.user` queda construido desde
   `role_assignments`, no desde lo que devuelva la sesión — ninguna
   posibilidad de que Better Auth inyecte un `role`/`scope` que no venga de
   la tabla de autorización real.

## Explícitamente NO hecho en esta fase

- **`app.module.ts` no cambió** — `BetterAuthSessionGuard` no reemplaza a
  `JwtAuthGuard` en ningún request real todavía. Eso es Fase 10 (cutover
  controlado, posible flag `AUTH_PROVIDER`), no esta fase.
- ~~Ningún test contra una sesión real de Better Auth~~ — **cerrado en la
  misma sesión** una vez el usuario levantó Docker:
  `docs/auth-migration/06-real-migration-run.md` §4 corrió el camino exacto
  que este guard usa (`auth.api.getSession` + `fromNodeHeaders`) contra una
  sesión real de un usuario real migrado, con resultado correcto. No es un
  test automatizado permanente (depende de Postgres real con datos
  sembrados, no del SQLite en memoria de `test:integration`) — queda como
  evidencia documentada, no como test repetible en CI.
- **No se tocó `RolesGuard`, `CsrfGuard`, ni ningún controller/service** —
  cero cambios de comportamiento en la app tal como corre hoy.

---

## GATE 6

| Pregunta | Respuesta con evidencia |
|---|---|
| ¿El adapter traduce sesión → `AuthenticatedRequestUser` sin que el resto de la app lo note? | Sí — mismo tipo, mismo decorador `@CurrentUser()`, mismo comportamiento deny-by-default, probado con 5 casos unitarios |
| ¿Se filtró algún concepto de Better Auth (session, user de auth) al resto de los módulos de negocio? | No — el guard es la única frontera; `role`/`scope` siguen viniendo exclusivamente de `role_assignments` |
| ¿Se tocó el guard chain real? | No — `app.module.ts` sin cambios, `BetterAuthSessionGuard` no recibe tráfico |
| ¿Se probó contra un login real? | Sí, en la misma sesión tras levantar Docker — `06-real-migration-run.md` §4 |

### GATE 6: **PASS (adapter construido y probado con sesiones simuladas; integración en vivo diferida a Fase 10)**

No bloquea seguir documentando/diseñando fases posteriores. Si el usuario
quiere ver el guard funcionando contra tráfico real antes de eso, hace falta
Docker arriba y, probablemente, adelantar parte de la Fase 10 (registrar el
guard en `app.module.ts`, aunque sea detrás de una bandera) fuera de su
orden estricto en el prompt maestro — decisión del usuario, no asumida aquí.
