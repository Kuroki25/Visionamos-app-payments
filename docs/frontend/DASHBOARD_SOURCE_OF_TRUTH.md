# Dashboard Web — Source of Truth

Fuente de verdad **técnica y visual** única para `apps/dashboard-web`
(panel administrativo de Red Coopagos). Reemplaza y consolida
`DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md` (arquitectura, pre-handoff) y el
análisis de handoff de Claude Design — ver §10 "Historial de este
documento". No se crean documentos adicionales sin necesidad real.

**Última validación real de extremo a extremo**: 2026-09-02, contra
`apps/api` + PostgreSQL reales corriendo localmente (Docker,
`docker-compose.yml`), datos de `pnpm --filter api seed:demo`, y la
suite `apps/dashboard-web/e2e/*.spec.ts` (7/7 verde). Ver §9 para el
detalle de qué se verificó realmente vs. qué quedó inferido.

## 1. Propósito

`dashboard-web` es el frontend administrativo de Red Coopagos: gestión de
usuarios, portales, comercios (aliados), transacciones y configuración.
Es un **cliente** de `apps/api` (NestJS) — nunca un segundo backend, nunca
una segunda fuente de autenticación. Next.js 16 (App Router) + React 19 +
TypeScript estricto + Tailwind CSS v4. Better Auth (en NestJS) es la única
autenticación. TypeORM + PostgreSQL son la persistencia real del backend.

## 2. Estado y versiones verificadas

| Pieza | Versión |
|---|---|
| Next.js | 16.3.3 (App Router) |
| React | 19.2.8 |
| TypeScript | 6.0.3 (`strict`, `exactOptionalPropertyTypes: true`) |
| Tailwind CSS | 4.3.3 (CSS-based `@theme`, sin `tailwind.config.js`) |
| better-auth | 1.7.2 (idéntico al de `apps/api`) |
| Vitest / Testing Library | 4.1.11 / 16.3.3 |
| Playwright | 1.62.1 |

`middleware.ts` está deprecado en esta versión de Next.js; el convenio es
`proxy.ts`/`export function proxy()`. **No existe `proxy.ts` en el
repo, deliberadamente** — ver §7.3.

## 3. Documentos obsoletos — NO seguir

`docs/architecture/CURRENT_ARCHITECTURE.md`, `DEPENDENCY_RULES.md` y
`TARGET_ARCHITECTURE.md` son pre-implementación (2026-08-23): nombran apps
inexistentes, puertos incorrectos y decisiones ya resueltas distinto
(TypeORM, Better Auth). Este documento es la autoridad vigente.

## 4. Arquitectura real (verificada contra el código, no supuesta)

```
src/
  app/
    (auth)/login/           # Login real — Better Auth, fuera del guard de sesión
    (dashboard)/             # Todo lo protegido — layout.tsx exige sesión real
      page.tsx                  # Inicio
      transacciones/
      portales/
        page.tsx
        [portalId]/
          page.tsx              # Portal detail
          aliados/[aliadoId]/
            page.tsx            # Aliado detail (6 tabs)
      usuarios/
      configuracion/
    globals.css              # Design tokens (@theme + .dark)
    layout.tsx                # Root — next/font Inter
  components/
    layout/                  # AppShell, Sidebar, Header, nav-config — chrome cross-página
    ui/                      # Primitivas propias de este app (StatCard, TxTable, Modal,
                              # toasts, confirm dialog, icons.tsx, ForbiddenNotice, ...)
                              # — @repo/ui sigue siendo la fuente para Button/Input/Badge/
                              # Card/Alert genéricos, no duplicados aquí.
  features/                  # Slices verticales: dashboard-overview, transacciones,
                              # portales, portal-detail, aliado-detail, usuarios,
                              # configuracion, login
  lib/
    api/{client,server,config,errors}.ts
    auth/{client,session.server,error-message}.ts
    {format,tone,metrics,transactions,portals,users,commerces,aliado-detail}.ts
  content/es/                # Copy estático centralizado, por pantalla/dominio
  types/                     # Solo cross-cutting sin dueño natural (vacío hoy)
e2e/                        # Playwright — REAL E2E, ver §9
```

Grupos de rutas `(auth)` y `(dashboard)` ya existen — no son DEFER. Se
crearon exactamente cuando la primera página real de cada uno lo
justificó (dashboard: handoff de Claude Design; auth: necesidad real de
probar Better Auth de punta a punta).

## 5. Reglas de dependencias (impuestas en el código, no solo documentadas)

```
app (rutas) → features → components/ui, components/layout, lib, content
```

- `features/*` puede importar `lib/*`, `components/ui`, `content`, tipos
  cross-cutting. **`features/*` NUNCA importa otra `features/*` ni
  `components/layout`** — regla real, no aspiracional: se violó una vez
  durante la implementación (una feature importaba `TxTable`/`StatCard`
  de otra) y se corrigió promoviendo esos componentes a `components/ui/` +
  `lib/` antes de que el patrón se repitiera. Ver los README de
  `components/ui/`, `components/layout/` y `features/` para el criterio
  exacto de cuándo algo se promueve.
- `lib/api` y `lib/auth` no importan de `features/*` ni `components/*`.
- Sin imports relativos profundos — este app usa imports relativos
  cortos consistentes (no se configuró el alias `@/*` en tiempo de
  ejecución de los componentes existentes; no cambiar este patrón sin
  necesidad real).

## 6. Better Auth — implementado y verificado real

Better Auth vive **exclusivamente en NestJS**
(`apps/api/src/infra/better-auth/`). Este frontend es un cliente.

- `lib/auth/client.ts` — `createAuthClient` (Client Components):
  `signIn.email`, `signOut`, `useSession`, `changePassword`.
- `lib/auth/session.server.ts` — `getCurrentUser()` vía `GET /auth/me`
  (Server Components, cookies reenviadas por `lib/api/server.ts`).
- `lib/auth/error-message.ts` — Better Auth devuelve mensajes reales en
  **inglés** (`"Invalid email or password"`, `"Invalid password"` —
  confirmado contra el servidor real, no supuesto). Este archivo traduce
  los casos conocidos a español y **deja pasar sin alterar** cualquier
  mensaje no reconocido — nunca inventa ni oculta el detalle real.

**No introducir**: JWT legacy, segunda instancia de Better Auth, mock
permanente de sesión, `auth_token`/Bearer legacy. Ninguno existe hoy.

### 6.1 `/login` y logout — reales, verificados con Playwright contra el backend vivo

`/login` (`app/(auth)/login/page.tsx`) porta el diseño de Claude Design
("RedCoop Login.dc.html", fuera del alcance del handoff visual original —
se construyó porque no había otra forma de probar Better Auth de extremo
a extremo a través del navegador). Login real via `signIn.email()`.
"¿Olvidaste tu contraseña?" es honestamente no funcional (sin proveedor
de email confirmado en el backend) — no simula el éxito falso del mock.

Logout: botón nuevo en el pie del `Sidebar` (el diseño nunca mostró uno —
no tenía login). `signOut()` real invalida la cookie de sesión
server-side, verificado (la cookie desaparece del navegador, y una ruta
protegida tras logout vuelve a redirigir a `/login`).

## 7. Autorización

### 7.1 Modelo

Frontend: UX basada en `role`/`scopeType`/`scopePortalId`/
`scopeCommerceId` (expuestos por `GET /auth/me`). Backend: autoridad real
(`BetterAuthSessionGuard`, `RolesGuard`, `ScopeAuthorizationService`,
`CsrfGuard`). Ocultar un botón no es seguridad — verificado en la
práctica: el botón "Nuevo portal" es visible para VIEWER (no se oculta
por rol en la UI) y el backend lo rechaza igual con un 403 real.

### 7.2 RBAC/scopes — verificado con E2E real, no inferido de leer el código

| Escenario | Resultado real observado |
|---|---|
| `ADMIN_PORTAL` (Avanza) → `GET /portals` | Solo ve "Avanza" — scoping real server-side, no client-side |
| `ADMIN_PORTAL` (Avanza) → detalle del portal de Otrahuilca | 403 real → `ForbiddenNotice` (antes: crasheaba, ver §11) |
| `ADMIN_COMMERCE` (Universidad Avanza) → su propio comercio | Acceso real correcto |
| `ADMIN_COMMERCE` (Universidad Avanza) → otro comercio del **mismo** portal | 403 real — el scope de `ADMIN_COMMERCE` es más granular que el portal, confirmado |
| `VIEWER` → lectura de `/portales` | OK |
| `VIEWER` → `POST /portals` (vía el modal, que sigue visible) | 403 real, mensaje real mostrado en el modal |

Roles reales (`@repo/contracts`, `roles.ts`): `SUPERADMIN`,
`ADMIN_PORTAL`, `ADMIN_COMMERCE`, `VIEWER`. El catálogo de 5 roles del
mock de Claude Design (incluye un rol genérico "Administrador" y
"Comercio") **no es real** — `content/es/roles.ts` mapea los 4 reales.

`SUPERADMIN` no se probó con login real fresco (contraseña sembrada
desconocida — no está en `apps/api/.env`, que ya no trae
`SUPERADMIN_PASSWORD`, y el script de seed es idempotente: no la
resetea). Su enforcement se verificó indirectamente: `ADMIN_PORTAL`
recibió un 403 real intentando `POST /portals` (`@Roles('SUPERADMIN')`),
confirmando que `RolesGuard` funciona; el camino de éxito de SUPERADMIN
queda **INFERIDO**, no verificado con una sesión propia.

### 7.3 `proxy.ts` — sigue sin existir, deliberadamente

La verificación de sesión real vive en `(dashboard)/layout.tsx`
(`getCurrentUser()`, Server Component) — exactamente el mecanismo que
este documento ya prescribía. No añade nada que `proxy.ts` mejoraría, y
NestJS re-verifica cada request real de todas formas.

## 8. Integración con la API

Dos clientes, nunca `fetch` suelto en componentes (verificado — cero
`fetch(` fuera de `lib/api/`):

- **`lib/api/client.ts`** (browser, Client Components/mutaciones):
  `credentials: 'include'`.
- **`lib/api/server.ts`** (`server-only`, Server Components): reenvía
  solo cookies con prefijo `better-auth`. `cache: 'no-store'` por
  defecto.

Ambos traducen toda respuesta no-2xx a `ApiError` (`lib/api/errors.ts`),
construida 1:1 desde el `ProblemDetails` real (RFC 9457) del backend.

### 8.1 CSRF — bug real encontrado y corregido (no hipotético)

El backend tiene un `CsrfGuard` global (double-submit cookie,
`apps/api/src/modules/auth/guards/csrf.guard.ts`): toda mutación
(POST/PATCH/PUT/DELETE) exige que el header `X-CSRF-Token` coincida con
la cookie `csrf_token` (no `httpOnly`, para que JS del mismo origen pueda
leerla). `lib/api/client.ts` **no lo enviaba** — verificado contra el
servidor real que esto habría producido 403 en **toda** mutación de este
app.

Corrección real en `lib/api/client.ts`:

1. Todo método no seguro (no GET/HEAD/OPTIONS) envía `X-CSRF-Token` leído
   de `document.cookie`.
2. **"Priming request"**: verificado contra el servidor real que
   `GET /api/v1/*` sí emite la cookie `csrf_token` pero `GET /api/auth/*`
   (Better Auth, montado fuera de la cadena de middleware de Nest) **no**
   — y como toda lectura de este app pasa por `lib/api/server.ts`
   (server-side, sus cookies nunca llegan al navegador), el navegador
   nunca tocaba `/api/v1/*` directo antes de la primera mutación. Sin el
   priming, la primera mutación de cada sesión habría fallado una vez
   (la respuesta 403 sí emite la cookie, dejando la segunda mutación en
   adelante funcionando). `ensureCsrfCookie()` hace un `GET /health`
   antes de la mutación real cuando falta la cookie.

No se debilitó CSRF/CORS/guards para hacer pasar nada — se corrigió el
cliente para cumplir el contrato real del backend.

### 8.2 Status codes — manejo verificado

| Código | Manejo real |
|---|---|
| 200/201/204 | `apiClient`/`serverApiClient` normal; 204 → `undefined` |
| 401 | `getCurrentUser()` → `null` → redirect a `/login` (verificado, no simulado) |
| 403 | `ApiError.isForbidden` — estado manejado por página (`ForbiddenNotice` en detail pages; `[]`/fallback en listados; mensaje real en formularios) — **nunca** igual a 401 |
| 404 | `notFound()` de Next (Portal/Aliado detail) |
| 400/422 | `ApiError.fieldErrors`, mostrado en el formulario correspondiente |
| 500+/red caída | `NetworkError` — nunca se confunde con "no autenticado" |

Ningún caso produce pantalla en blanco, stack trace o JSON crudo —
verificado explícitamente para 403 en Portal/Aliado detail: antes de
esta fase, un 403 ahí propagaba sin capturar hasta el error boundary
genérico de Next ("This page couldn't load") — bug real, corregido
(`components/ui/ForbiddenNotice.tsx`).

### 8.3 Contratos

`@repo/contracts` es la fuente de tipos compartida real (mismos schemas
Zod que usa `apps/api`). Verificado en la práctica, no solo por
compilación: el `Portal` real solo tiene `name` (no "tipo de servicio" ni
"descripción" del mock); `User` no tiene teléfono/ciudad/dirección;
`PATCH /users/:id` solo acepta `fullName`; `Commerce` requiere
`legalName`/`contactName` que el mock no pedía. Cada divergencia
mock-vs-real está documentada en el archivo `lib/*.ts` correspondiente,
no oculta con casts.

## 9. Visual Contract

Claude Design (`RedCoop Dashboard.dc.html`, `TxTable.dc.html`,
`RedCoop Login.dc.html`) es la fuente de verdad **visual**: UI, colores,
tipografía, spacing, radius, shadows, layouts, navegación, estados
visuales. Este documento es la fuente de verdad **técnica**. No compiten.
Un bug funcional o de seguridad no autoriza un rediseño de la UI
aprobada.

### 9.1 Design tokens — dónde viven

`app/globals.css`, bloque `@theme` (claro) + selector `.dark` (oscuro).
Nombres: `--color-bg/sidebar/surface/surface-subtle/border/grid-line/fg
(+soft/+faint)/accent(+soft)/success(+soft)/danger(+soft)/orange(+soft)`,
`--radius-card/card-sm/control/control-sm`, `--shadow-card/card-hover/
dropdown/panel/modal/toast`. `--font-sans` referencia `--font-inter`
(`next/font/google`, auto-hospedado). Modo oscuro es un toggle manual
(`components/layout/use-dark-mode.ts`, `.dark` en `<html>`), no
`prefers-color-scheme` — el mock tiene un switch explícito, no sigue el
SO.

**Excepción documentada**: `/login` usa hex literales, no los tokens —
ver el comentario en `app/(auth)/login/page.tsx` (el login no tiene
variante oscura en el diseño; usar los tokens compartidos lo re-tematizaría
sin que el diseño lo especifique, si el usuario dejó `.dark` activo desde
el dashboard antes de cerrar sesión).

No dispersar hex nuevos donde ya existe un token — verificado por grep:
cero hex fuera de `globals.css` y `features/login` (con la excepción
documentada arriba).

### 9.2 Rutas reales (verificar contra el repo, no asumir esta lista)

```
/login                                          (auth) — público
/                                                Inicio
/transacciones
/portales
/portales/[portalId]
/portales/[portalId]/aliados/[aliadoId]
/usuarios
/configuracion
```

### 9.3 Funcionalidades sin soporte backend — "Próximamente" honesto

| Función | Por qué |
|---|---|
| Notificaciones (sidebar + Configuración) | Sin módulo de notificaciones en el backend |
| Configuración → Portales/Dashboard/Integraciones/Avanzado | Ya eran placeholder en el propio mock |
| Aliado detail → Movimientos | `Commerce` documenta el saldo/liquidación como "concepto explícitamente pendiente" — no hay nada real de qué partir |
| Aliado detail → Informes | Sin módulo de informes/documentos en el backend |
| Login → "¿Olvidaste tu contraseña?" | Sin proveedor de email confirmado |

Ninguno inventa datos, saldos ni endpoints — todos muestran un mensaje
honesto en vez de simular éxito.

## 10. Textos (`content/es/`)

Todo copy estático centralizado por pantalla/dominio
(`nav`, `login`, `errors`, `roles`, `transactions`, `portales`,
`usuarios`, `configuracion`, `aliadoDetail`, `portalDetail`, ...). Nunca
nombres/datos que vienen del backend. Sin librería de i18n (deliberado).

## 11. Testing

### 11.1 Categorías y qué cubre cada una hoy

| Categoría | Dónde | Qué verifica |
|---|---|---|
| UNIT | `src/**/*.test.ts(x)` (40 tests) | Funciones puras de mapeo (`Transaction`→fila, `Commerce`→fila, formato, tono, `translateAuthErrorMessage`) y un componente presentacional |
| **E2E REAL** | `e2e/*.spec.ts` (7 tests) | Login real, sesión real (cookie `httpOnly`), refresh, nav directa, back/forward, logout real, RBAC/scope real (4 escenarios contra el backend real) — ver §11.2 |
| MOCKED/VISUAL | Harness temporal `app/qa-preview/**` usado durante desarrollo para capturas | **Se borra siempre antes de terminar cada pantalla** — nunca convive con código real ni con REAL E2E. No queda ningún rastro en el repo hoy (verificar con `git status`/`find` si se sospecha lo contrario) |
| INTEGRATION | No existe hoy en este app (sí en `apps/api`) | — |
| ACCESSIBILITY | Verificación manual con Playwright (teclado, `getByRole`) durante esta fase — no es una suite permanente | Ver §12 |
| RESPONSIVE | Verificación manual con Playwright (3 viewports) durante esta fase — no es una suite permanente | Ver §13 |
| VISUAL REGRESSION | No implementado como snapshots de Playwright — ver §14 (recomendación, no gap crítico) | — |

**Regla permanente**: un bug real corregido en este proyecto obtiene un
test de regresión cuando es razonablemente automatizable. Ejemplos ya
aplicados: `formatDateEs`/timezone (`lib/format.test.ts`),
`translateAuthErrorMessage` (`lib/auth/error-message.test.ts`). El bug
de CSRF y el de 403-sin-manejar quedan cubiertos por
`e2e/rbac.spec.ts` (E2E real, no solo unit) porque requieren el backend
real para significar algo.

### 11.2 E2E real — qué credenciales usa y por qué es seguro re-ejecutarla

`e2e/fixtures.ts` referencia los usuarios de
`apps/api/src/scripts/seed-demo.ts` (contraseña compartida, ya literal
en ese script committeado — no es un secreto nuevo). Requiere:
PostgreSQL real (`docker compose up -d`), `apps/api` corriendo con
`pnpm --filter api seed:demo` ya ejecutado, `apps/dashboard-web`
corriendo (`pnpm dev` o `pnpm start` tras build). `playwright.config.ts`
reutiliza un servidor ya corriendo en `:3101` si existe
(`reuseExistingServer: !CI`).

`e2e/rbac.spec.ts` crea un aliado real ("E2E Test Aliado") y usuarios
reales durante la fase de verificación manual — no forma parte de los
specs commiteados como mutación repetible; los specs commiteados solo
mutan lo estrictamente necesario para probar el rechazo real (un intento
de `POST /portals` como VIEWER, que el backend rechaza — no persiste
nada). Un usuario E2E dedicado (`e2e-password-lifecycle@example.com`)
quedó creado en la base de datos de desarrollo local durante la
verificación de ciclo de vida de contraseña (§ "Fase 12" del cierre
técnico) — no se tocó ninguna cuenta de demo pre-existente para esa
prueba, tal como exige la regla de no cambiar contraseñas de cuentas
importantes.

### 11.3 Qué NO se verificó (ser honestos, no inflar cobertura)

- Login/mutaciones de `SUPERADMIN` con sesión propia (contraseña
  sembrada desconocida) — ver §7.2.
- Envío real de correo (recuperar contraseña) — sin proveedor
  configurado, la función es honestamente inerte.
- Rate limiting (`ThrottlerGuard`, 100 req/60s por defecto) bajo carga
  real — no se generó el volumen de requests necesario para disparrarlo.
- Snapshots de regresión visual automatizados (no implementados, ver
  §14).
- Integración con `docs/business/ROLE_PERMISSION_MATRIX.md` más allá de
  los 4 escenarios de §7.2 — la matriz completa de permisos por rol no
  se auditó campo por campo.

## 12. Accesibilidad — hallazgos reales y corregidos

Verificado manualmente con Playwright (navegación 100% por teclado,
`getByRole`/`getByLabel`) contra `/login` y formularios de creación:

- **Corregido**: `CommerceForm.tsx` tenía `<label>` sin `htmlFor`/`id` —
  ni un lector de pantalla ni `getByLabel` podían asociarlos a sus
  inputs. Los demás formularios (`PortalForm`, `UserForm`,
  `PerfilTab`, `SeguridadTab`) ya usaban `htmlFor`/`id` correctamente.
- **Corregido**: `LoginForm`/`ForgotPasswordForm` no usaban un elemento
  `<form>` real (solo `<button onClick>`) — `Enter` no enviaba el
  formulario para un usuario de teclado. Ahora son `<form onSubmit>`
  reales; verificado que `Enter` inicia sesión correctamente.
- **Corregido**: el título de `/login` era un `<div>`, no un heading
  semántico — ahora `<h1>`.
- **Pendiente (P1, no bloqueante)**: el mismo patrón `<button onClick>`
  sin `<form>` existe todavía en `PortalForm`, `UserForm`,
  `CommerceForm` (modales) y `PerfilTab`/`SeguridadTab` — funcionan con
  clic/mouse y con Tab+clic en el botón, pero no con Enter dentro de un
  campo de texto. No se corrigió en esta fase por alcance (7+ archivos);
  queda documentado para la siguiente pasada.
- No se instaló ninguna librería de accesibilidad nueva.

## 13. Responsive — verificado, sin overflow horizontal

Playwright, 3 viewports (1440×900 desktop, 834×1112 tablet, 390×844
mobile), páginas `/login`, `/` (Inicio) y `/portales` (la tabla más
ancha): `document.documentElement.scrollWidth >
document.documentElement.clientWidth` → `false` en los 9 casos. Las
tablas ya usaban `overflow-x-auto` propio (`components/ui/TxTable.tsx` y
similares) — sin necesidad de cambios para esta verificación. No se
determinó si el sidebar debería colapsar automáticamente en mobile (hoy
requiere el toggle manual) — queda como mejora P2, no como defecto.

## 14. Visual regression — no implementado como snapshots automatizados

Las comparaciones contra el diseño aprobado se hicieron manualmente
(capturas Playwright ad-hoc durante cada pantalla, comparadas
visualmente contra Claude Design, nunca comprometidas al repo).
Recomendación no implementada en esta fase: convertir un subconjunto de
esas capturas en snapshots baseline de `@playwright/test`
(`toHaveScreenshot()`) para las pantallas ya aprobadas, con la regla de
nunca actualizar un baseline automáticamente ante un fallo — solo tras
confirmar que el diseño aprobado realmente cambió. No se implementó por
alcance/tiempo, no por bloqueo técnico.

## 15. Seguridad — verificado contra el servidor real

Evidencia real (no inferida) recolectada contra `apps/api` corriendo:

- **Headers**: Helmet real — CSP, HSTS, X-Frame-Options, X-Content-Type-
  Options, etc. presentes en toda respuesta (`curl -i` contra
  `/api/v1/health`).
- **CORS**: `Access-Control-Allow-Origin: http://localhost:3101`,
  `Access-Control-Allow-Credentials: true` — origen explícito, nunca
  `*` junto a credentials (confirmado, no solo leído en código).
- **Cookies**: `better-auth.session_token` — `httpOnly: true`,
  `sameSite: Lax`, `secure: false` (`COOKIE_SECURE=false`, correcto en
  dev sobre HTTP). `csrf_token` — deliberadamente NO `httpOnly` (§8.1).
- **CSRF**: ver §8.1 — bug real encontrado y corregido, no un control
  debilitado para pasar una prueba.
- **Rate limiting**: `X-RateLimit-*` presentes (100/60s por defecto),
  confirmado en headers reales; no se probó el límite bajo carga (§11.3).
- **Logging**: `nestjs-pino` redacta `authorization`, `cookie`,
  `set-cookie`, `x-csrf-token` — confirmado en `app.module.ts`, no se
  inspeccionaron logs en vivo en esta fase.
- **Secrets**: `BETTER_AUTH_SECRET` real en `apps/api/.env` (no
  committeado — `.gitignore`); ningún secreto expuesto vía
  `NEXT_PUBLIC_*` en este frontend (confirmado, sigue igual que antes
  del handoff).
- **PII/errores**: ningún error de backend se muestra crudo — `ApiError`
  solo expone `detail` ya saneado; confirmado con el 403 real de VIEWER
  (mensaje de Better Auth/Nest, nunca un stack trace).

No se debilitó ningún control para que una prueba pasara. No se
introdujo `disableCSRFCheck`, `CORS *`, guards desactivados, sesión
hardcodeada, ni bypass de autorización.

## 16. Definition of Done

La aplicación NO se considera cerrada solo porque `lint`/`typecheck`/
`build`/unit tests estén verdes. Evidencia real requerida y su estado:

| Requisito | Estado |
|---|---|
| Better Auth real (login/sesión/logout) | ✅ VERIFICADO (E2E real) |
| API real (lecturas/escrituras) | ✅ VERIFICADO (E2E real + manual) |
| PostgreSQL real | ✅ VERIFICADO (`GET /health` → `database: up`, datos reales leídos) |
| CORS/cookies reales | ✅ VERIFICADO (headers reales inspeccionados) |
| CSRF | ✅ VERIFICADO Y CORREGIDO (bug real encontrado) |
| RBAC/scopes (3 de 4 roles con login propio) | ✅ VERIFICADO; SUPERADMIN camino de éxito INFERIDO (§7.2) |
| 401 vs 403 | ✅ VERIFICADO, nunca mezclados |
| Playwright E2E real | ✅ 7/7 verde contra backend real |
| Cobertura unit | ✅ 40/40 verde |
| Visual regression automatizada | ❌ NO IMPLEMENTADO (§14, recomendación) |
| Responsive (3 viewports, sin overflow) | ✅ VERIFICADO manualmente |
| Accesibilidad (teclado, labels, headings) | ✅ 3 bugs reales corregidos; 1 patrón (Enter en modales) documentado como P1 pendiente |
| Regresión para bugs reales encontrados | ✅ timezone, traducción de errores de auth (unit); CSRF y 403 (E2E) |
| Lint/typecheck/build (monorepo) | ✅ verde |

## 17. Historial de este documento

- **2026-09-01** — `DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md` creado (Fase 0,
  arquitectura pre-handoff visual).
- **2026-09-02 (mañana)** — Handoff visual completo de Claude Design
  (Inicio, Transacciones, Portales, Portal detail, Aliado detail,
  Usuarios, Configuración) con datos/mutaciones reales contra el backend
  ya existente.
- **2026-09-02 (tarde)** — Cierre técnico: auditoría de arquitectura/API/
  seguridad, stack real levantado, Better Auth/CORS/CSRF/RBAC verificados
  con E2E real contra Postgres real, login/logout construidos (fuera del
  alcance del handoff visual original, necesarios para que el E2E de
  Better Auth fuera posible), bugs reales encontrados y corregidos
  (CSRF, 403 sin manejar, accesibilidad de formularios, timezone,
  mensajes de auth en inglés). Este documento reemplaza al de Fase 0
  como fuente única.
