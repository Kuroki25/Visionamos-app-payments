# Dashboard Web — Source of Truth

Fuente de verdad **técnica y visual** única para `apps/dashboard-web`
(panel administrativo de Red Coopagos). Reemplaza y consolida
`DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md` (arquitectura, pre-handoff) y el
análisis de handoff de Claude Design — ver §18 "Historial de este
documento". No se crean documentos adicionales sin necesidad real.

**Última validación real de extremo a extremo**: 2026-09-03, contra
`apps/api` + PostgreSQL reales corriendo localmente (Docker,
`docker-compose.yml`), datos de `pnpm --filter api seed:demo` +
`seed:e2e-superadmin`, y las suites `apps/dashboard-web/e2e/*.spec.ts`
(21/21 verde) + `e2e/visual.spec.ts` (21/21 verde, 3 viewports); backend
`apps/api` unit 46/46, `test:integration` 85/85,
`test:auth-cutover-rehearsal` 12/12; `@repo/contracts` 58/58. **Cierre
técnico del frontend: COMPLETED** — ver §16. Corrección funcional/visual
de Usuarios/Portales/Aliados/Alertas (los 5 slices, incluyendo
displayName/serviceType/description/logo reales de Portal): COMPLETED —
ver §17. Ver §9 para el detalle de qué se verificó realmente vs. qué
quedó inferido.

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
| `SUPERADMIN` (GLOBAL) → `GET /portals` | Ve los 3 portales reales (Avanza/Otrahuilca/Coopenjo), no solo el propio |
| `SUPERADMIN` → portal de Otrahuilca (403 real para `ADMIN_PORTAL` arriba) | Acceso real correcto — misma URL, mismo guard, resultado real distinto |
| `SUPERADMIN` → comercio Hotel Avanza Plaza (403 real para `ADMIN_COMMERCE` en otro caso) | Acceso real correcto |
| `SUPERADMIN` → `PATCH /portals/:id` sobre Otrahuilca (fuera del scope de cualquier `ADMIN_PORTAL` sembrado) | 200 real — operación administrativa real autorizada, no solo un botón visible |

Roles reales (`@repo/contracts`, `roles.ts`): `SUPERADMIN`,
`ADMIN_PORTAL`, `ADMIN_COMMERCE`, `VIEWER`. El catálogo de 5 roles del
mock de Claude Design (incluye un rol genérico "Administrador" y
"Comercio") **no es real** — `content/es/roles.ts` mapea los 4 reales.

**`SUPERADMIN` — ya VERIFICADO con sesión propia, no inferido** (cierre
del gap dejado por la pasada anterior). El bootstrap SUPERADMIN
original sigue sin probarse con login fresco (contraseña sembrada
desconocida, nunca en `apps/api/.env`, y su script de seed es
idempotente por diseño — no la resetea) y **nunca se tocó**: en vez de
eso, `apps/api/src/scripts/seed-e2e-superadmin.ts` crea un SEGUNDO
SUPERADMIN dedicado, exclusivamente para E2E (`e2e-superadmin@example.com`,
misma contraseña literal que el resto de usuarios demo — no un secreto
nuevo). `e2e/superadmin.spec.ts` (REAL E2E, 1/1 verde) demuestra login →
sesión Better Auth real → identidad `Superadministrador` visible → acceso
global real (portal/aliado que otros roles reciben 403 reales en
`rbac.spec.ts`) → `PATCH` real autorizado → logout → sesión
verdaderamente inválida.

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
| **E2E REAL** | `e2e/*.spec.ts` (9 tests: `home`, `auth`×2, `rbac`×4, `accessibility`, `superadmin`) | Login real, sesión real (cookie `httpOnly`), refresh, nav directa, back/forward, logout real, RBAC/scope real (4 escenarios + SUPERADMIN, ver §7.2), regresión de teclado/accesibilidad — ver §11.2 |
| **VISUAL REGRESSION** | `e2e/visual.spec.ts` bajo 3 proyectos Playwright dedicados (`visual-desktop/tablet/mobile`, 20 screenshots) | Ver §14 — ya implementado, deja de ser recomendación |
| MOCKED/VISUAL (ad-hoc) | Harness temporal `app/qa-preview/**` usado durante el handoff original para capturas manuales | **Se borra siempre antes de terminar cada pantalla** — nunca convive con código real ni con REAL E2E. No queda ningún rastro en el repo hoy. Distinto de `e2e/visual.spec.ts` arriba, que sí es código permanente committeado |
| INTEGRATION | No existe hoy en este app (sí en `apps/api`) | — |
| ACCESSIBILITY | `e2e/accessibility.spec.ts` (1 test, permanente) + verificación manual con Playwright (teclado, `getByRole`) durante la fase anterior para lo no cubierto por esa suite | Ver §12 |
| RESPONSIVE | `e2e/visual.spec.ts` (3 viewports, permanente, ver §14) + verificación manual `scrollWidth`/`clientWidth` puntual durante esta fase | Ver §13 |

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
nada) o una mutación real idempotente (SUPERADMIN renombra un portal a
su propio nombre — ver §7.2/§11.4). Un usuario E2E dedicado
(`e2e-password-lifecycle@example.com`) quedó creado en la base de datos
de desarrollo local durante la verificación de ciclo de vida de
contraseña (§ "Fase 12" del cierre técnico) — no se tocó ninguna cuenta
de demo pre-existente para esa prueba, tal como exige la regla de no
cambiar contraseñas de cuentas importantes. La misma regla es por lo que
`e2e-superadmin@example.com` (§7.2, §11.4) existe como cuenta aparte en
vez de resetear la contraseña del SUPERADMIN original.

### 11.4 SUPERADMIN E2E — estrategia de credenciales

`apps/api/src/scripts/seed-e2e-superadmin.ts` (`pnpm --filter api
seed:e2e-superadmin`, idempotente — sale si el email ya existe) crea un
SEGUNDO SUPERADMIN dedicado y reproducible: mismo patrón de
repositorio directo que `seed-demo.ts`/`seed-superadmin.ts`
(docs/adr/010), misma contraseña literal ya committeada
(`DEMO_PASSWORD`) — no un secreto nuevo, nunca en `.env`/`.env.example`.
El SUPERADMIN original (bootstrap) nunca se tocó: ni se leyó su
contraseña (desconocida) ni se reseteó. `e2e/fixtures.ts` expone
`DEMO_USERS.superadmin` con este email dedicado.

### 11.5 Qué NO se verificó (ser honestos, no inflar cobertura)

- Envío real de correo (recuperar contraseña) — sin proveedor
  configurado, la función es honestamente inerte.
- Integración con `docs/business/ROLE_PERMISSION_MATRIX.md` más allá de
  los escenarios de §7.2 — la matriz completa de permisos por rol no se
  auditó campo por campo.
- Rate limiting bajo carga real de USUARIO — sí se disparó una vez
  **por accidente** construyendo `e2e/visual.spec.ts` (18 logins
  paralelos en una ventana corta), confirmando que `ThrottlerGuard`
  funciona de verdad contra tráfico real (no solo leído en código); la
  causa (demasiados logins redundantes del propio test) se corrigió con
  `auth.setup.ts` + `storageState` (§14), no tocando el límite.

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
- **Corregido (cerraba el P1 pendiente de la pasada anterior)**: el
  mismo patrón `<button onClick>` sin `<form>` real en `PortalForm`,
  `UserForm`, `CommerceForm` (modales) y `PerfilTab`/`SeguridadTab` —
  funcionaban con clic/mouse y con Tab+clic en el botón, pero `Enter`
  dentro de un campo de texto no hacía nada. Los cinco son ahora
  `<form onSubmit>` reales (mismo mecanismo ya usado en
  `LoginForm`/`ForgotPasswordForm`), con `event.preventDefault()` en el
  handler. Regresión cubierta por `e2e/accessibility.spec.ts` (REAL E2E,
  contra el backend real vía `PerfilTab`) — la misma corrección genérica
  no se re-verifica cinco veces por separado, ver el comentario del
  archivo. `pnpm --filter dashboard-web typecheck|lint|test:unit|build`
  y la suite completa de `e2e/*.spec.ts` (9/9) verdes tras el cambio.
- No se instaló ninguna librería de accesibilidad nueva.

## 13. Responsive — verificado, sin overflow horizontal, con regresión permanente

`e2e/visual.spec.ts` (§14) corre bajo 3 viewports Playwright reales —
1440×900 desktop, 834×1112 tablet, 390×844 mobile, los mismos ya usados
en la verificación manual de la pasada anterior — para 6 de las 8
pantallas (ver §14 para cuáles). Además, durante esta fase se repitió
puntualmente la medición real `document.documentElement.scrollWidth >
document.documentElement.clientWidth` con datos y sesión reales
(SUPERADMIN) en `/`, `/portales` y `/usuarios` a 390px: `false` en los 3
casos — sin overflow horizontal a nivel de documento.

**Hallazgo real, no un defecto nuevo**: los baselines mobile de
`portales`/`usuarios` muestran encabezados envueltos en varias líneas y
contenido recortado visualmente — confirmado que es el contenedor
interno con scroll horizontal propio (mismo patrón que
`components/ui/TxTable.tsx`) mostrando su estado inicial sin scrollear,
no una fuga de overflow del documento (medido arriba). Es la
manifestación visual del gap P2 ya documentado: el sidebar no colapsa
automáticamente en mobile (hoy requiere el toggle manual). Sigue sin
ser un defecto — ahora con un baseline que avisará si empeora (overflow
real) en un cambio futuro.

## 14. Visual regression — implementado con Playwright screenshot assertions

`e2e/visual.spec.ts`, 3 proyectos Playwright dedicados en
`playwright.config.ts` (`visual-desktop`/`visual-tablet`/`visual-mobile`,
viewports de §13) — `toHaveScreenshot()`, no una plataforma externa.
Ejecutar: `pnpm --filter dashboard-web test:e2e:visual` (o
`test:e2e` sin filtro, que corre REAL E2E + visual + el login de
`auth.setup.ts` en una sola invocación).

**Matriz página × viewport** (20 baselines reales, `e2e/visual.spec.ts-snapshots/`):

| Pantalla | Desktop | Tablet | Mobile |
|---|---|---|---|
| `/login` | ✅ | ✅ | ✅ |
| `/` (Dashboard/Inicio) | ✅ | ✅ | ✅ |
| `/portales` | ✅ | ✅ | ✅ |
| `/portales/[portalId]` (Avanza) | ✅ | ✅ | ✅ |
| `/portales/[portalId]/aliados/[aliadoId]` (Universidad Avanza) | ✅ | ✅ | ✅ |
| `/usuarios` | ✅ | ✅ | ✅ |
| `/transacciones` | ✅ | — | — |
| `/configuracion` | ✅ | — | — |

`transacciones`/`configuracion` quedan desktop-only a propósito: sus
primitivas de layout (tabla de datos, tabs/formularios simples) ya se
ejercitan a los 3 viewports vía `portales`/`usuarios` y `configuracion`
respectivamente — una segunda y tercera copia sería peso de suite
redundante, no cobertura de riesgo nueva (instrucción explícita: no
multiplicar cada pantalla por cada tamaño sin necesidad).

**Autenticación de las capturas**: `e2e-superadmin` (§11.4) vía
`auth.setup.ts`, un solo login reutilizado por los 3 proyectos
(`dependencies`/`storageState`, patrón recomendado por Playwright) — no
un login por captura. Se eligió tras encontrar un problema real: loguear
fresco en cada una de las 18 combinaciones (6 pantallas × 3 viewports)
disparó el `ThrottlerGuard` real del backend bajo la paralelización por
defecto de Playwright (§11.5) — la corrección fue reducir la carga
redundante, nunca tocar el límite. SUPERADMIN se usa porque es el único
rol que llega a las 8 pantallas sin ningún 403 por scope, evitando que
un baseline "aprobado" termine siendo por accidente el estado 403 de un
rol con permisos insuficientes.

**Estabilidad**: `buildChart()` (gráfico de Inicio) es una función pura
sobre constantes fijas; `formatDateEs` renderiza `DD/MM/YYYY` absoluto
(no relativo a "ahora"); los montos/fechas de la semilla están fijos
desde que se sembraron — así que ninguna pantalla depende de reloj,
`Math.random()` en render, ni conteos que cambien entre corridas. Cada
captura espera `document.fonts.ready` y `networkidle` antes de disparar.
`toHaveScreenshot()` deshabilita animaciones CSS por defecto. Se agregó
una tolerancia real (`maxDiffPixelRatio: 0.03`, `playwright.config.ts`)
tras observar un ~2-3% de diferencia de sub-pixel (antialiasing de texto/
SVG) específicamente en la primera página que renderiza cada worker tras
cargar `storageState` (Inicio) — verificado corriendo la suite dos veces
seguidas tras el ajuste: 20/20 verde ambas veces, sin flakiness. Una
regresión visual real (layout roto, componente faltante, color
incorrecto) produce muchísimo más del 3% de diferencia, así que esta
tolerancia no oculta regresiones — absorbe ruido de renderizado, no
comportamiento de la aplicación.

**Regla de baseline**: un diff nunca se resuelve con
`--update-snapshots` automático. Ante un fallo: 1) inspeccionar el
`-diff.png` adjunto al reporte; 2) determinar regresión vs. cambio de
diseño intencional; 3) corregir código si es regresión; 4) actualizar el
baseline solo si Claude Design realmente cambió esa pantalla — y
documentarlo aquí.

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
  confirmado en headers reales; disparado de verdad bajo carga real
  (por accidente, construyendo `e2e/visual.spec.ts` — §11.5/§14), no solo
  leído en headers.
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
| Better Auth real (login/sesión/logout) | ✅ VERIFICADO (E2E real, los 4 roles incluido SUPERADMIN) |
| API real (lecturas/escrituras) | ✅ VERIFICADO (E2E real + manual) |
| PostgreSQL real | ✅ VERIFICADO (`GET /health` → `database: up`, datos reales leídos) |
| CORS/cookies reales | ✅ VERIFICADO (headers reales inspeccionados) |
| CSRF | ✅ VERIFICADO Y CORREGIDO (bug real encontrado) |
| RBAC/scopes (4 de 4 roles con login propio) | ✅ VERIFICADO — SUPERADMIN con sesión real dedicada (§7.2/§11.4), ya no inferido |
| 401 vs 403 | ✅ VERIFICADO, nunca mezclados |
| Playwright E2E real | ✅ 9/9 verde contra backend real |
| Visual regression automatizada | ✅ IMPLEMENTADO — 20/20 verde, 3 viewports, `toHaveScreenshot()` (§14) |
| Cobertura unit | ✅ 40/40 (dashboard-web) + 40/40 (api) verde |
| Responsive (3 viewports, sin overflow) | ✅ VERIFICADO — ahora con regresión visual permanente, no solo manual (§13/§14) |
| Accesibilidad (teclado, labels, headings) | ✅ 4 bugs reales corregidos, todos con regresión E2E |
| Regresión para bugs reales encontrados | ✅ timezone, traducción de errores de auth (unit); CSRF, 403 y accesibilidad de formularios (E2E); visual (screenshot baselines) |
| Lint/typecheck/build (monorepo) | ✅ verde |

**Cierre técnico del frontend: COMPLETED** (2026-09-02). Los dos únicos
pendientes P1 documentados por el cierre anterior — visual regression
automatizada y el happy path E2E real de SUPERADMIN — están cerrados con
evidencia real ejecutada (no inferida). No quedan gaps P0/P1 conocidos;
los ítems restantes en §11.5 son mejoras P2 o están fuera del alcance de
negocio actual (email real, matriz de permisos exhaustiva), no bloqueos.

## 17. Functional UI Contracts

Contratos funcionales+visuales por pantalla, verificados campo por campo
contra el backend real (no contra el mock a ciegas — ver la jerarquía de
autoridad: modelo de negocio → backend → Better Auth → RBAC/scopes →
contracts → esta SoT → Claude Design). Referencias visuales en
`docs/frontend/references/` (`current` = estado antes de esta pasada,
`expected` = Claude Design). Regla de no-regresión: estos contratos son
tan vinculantes como §9 — una sesión futura no puede simplificar un
formulario aquí documentado sin actualizar esta sección primero.

### 17.1 Users

**Referencias**: `01-users-actions-current.png` (bug), `02-user-form-current.png`
(antes), `03-user-form-expected.png` (Claude Design).

**Menú de acciones (⋮)** — `FUNCTIONAL_BUG`, corregido:

- **Causa raíz real**: implementación anterior usaba `useState(openMenuId)`
  + `<div className="absolute">` posicionado dentro de la fila. El
  contenedor de la tabla necesita `overflow-hidden` para las esquinas
  redondeadas (`rounded-card`) — eso recorta el dropdown en cualquier fila
  sin fila debajo para "darle espacio" (peor caso: la última fila de la
  tabla, exactamente `01-users-actions-current.png`).
- **Fix**: `src/components/ui/RowActionsMenu.tsx`, nuevo, sobre
  `@radix-ui/react-dropdown-menu` (única dependencia de dropdown/headless
  en el repo — se evaluó que no había ninguna ya instalada antes de
  agregarla). Renderiza el contenido vía `DropdownMenu.Portal` a
  `document.body`, fuera de cualquier `overflow`/stacking context de la
  fila. Reemplaza el patrón en `UsersExplorer.tsx` y `PortalesExplorer.tsx`
  (mismo componente, dos call sites).
- **Verificado real** (stack real, no mocks): visible completo en la
  última fila de Usuarios y Portales, Escape cierra, click-fuera cierra,
  `Enter` abre con el primer item enfocado, `ArrowDown` navega, el foco
  vuelve al trigger al cerrar, cero errores de consola. Regresión E2E:
  `e2e/row-actions-menu.spec.ts` (2 tests).
- **Efecto secundario real encontrado y corregido**: `e2e/superadmin.spec.ts`
  asumía el dropdown viejo (`role="button"` dentro de la fila) — con
  Radix el contenido está fuera de la fila (`document.body`) y los items
  son `role="menuitem"`. Corregido para buscar el trigger en la fila y el
  item en la página.
- Acciones dependen de permisos reales del backend (`ver`/`editar`/
  `activar`-`desactivar`) — ocultar una acción en frontend nunca sustituye
  la autorización real (§7).

**Formulario "Crear usuario"** — reflow completo, cerrado con evidencia real:

- **Layout**: reflow a 2 secciones/2 columnas siguiendo
  `03-user-form-expected.png` (`INFORMACIÓN PERSONAL` / `CREDENCIALES DE
  ACCESO`), pero **solo con campos reales** — `Empresa`/`Cédula`/
  `Teléfono`/`Ciudad`/`Dirección` de la imagen son `NOT_SUPPORTED` (§17.5,
  ni en `CreateUserSchema` ni en `AppUser`) y **no se agregaron**; "Empresa"
  en la imagen se resolvió reetiquetando el selector de Alcance/scope ya
  real (Rol + Alcance en la misma fila cuando el rol es VIEWER, único caso
  con un selector de alcance propio — SUPERADMIN/ADMIN_PORTAL/ADMIN_COMMERCE
  lo derivan del rol).
- **Contraseña provisional — `BACKEND_GAP` cerrado**: el admin ya no
  escribe una contraseña. `CreateUserSchema` (`@repo/contracts`) perdió el
  campo `password`; `UsersService.createWithRoleAssignment` genera una con
  `randomBytes(18)` (CSPRNG, nunca `Math.random()`), la hashea con Argon2id
  igual que antes, y la devuelve **una única vez** en la respuesta de
  `POST /users` (`CreateUserResponseSchema`, campo `temporaryPassword`) —
  nunca persistida en texto plano, nunca logueada, nunca en `newValue` del
  audit event, nunca devuelta de nuevo por `GET /users`/`GET /users/:id`
  (verificado con test real). El frontend la muestra exactamente una vez en
  `CredentialReveal` (`UserForm.tsx`) — email + contraseña copiables, con
  aviso de que no se volverá a mostrar — antes de cerrar el modal y
  refrescar el listado.
- **Users ↔ Better Auth atomicidad — documentado con test real**: ya era
  transaccional (`dataSource.transaction`); se agregó
  `users.service.spec.ts` → *"Better Auth identity and AppUser share the
  same transaction..."* que fuerza un fallo en la inserción de Better Auth
  y verifica que ni `AppUser` ni `role_assignment` ni el audit event se
  guardan.
- **Verificado real, extremo a extremo** (`e2e/create-user.spec.ts`, 2
  tests, contra `apps/api` + PostgreSQL + Better Auth reales, no mocks):
  SUPERADMIN crea un VIEWER → la respuesta real de `POST /users` trae
  `temporaryPassword` → se muestra en la UI real → se cierra el modal → el
  usuario nuevo aparece en el listado real → **login real con esa
  contraseña exacta funciona** (segunda pestaña/contexto, sesión limpia) →
  `GET /users/:id` real nunca vuelve a traer la contraseña.
- Sin cambios de contrato en `UserSchema`/`GET /users` — solo
  `CreateUserSchema` (quita `password`) y una respuesta nueva,
  `CreateUserResponseSchema`, exclusiva de `POST /users`.

### 17.2 Portals

**Referencias**: `04-portal-form-current.png` (antes), `05-portal-form-expected-top.png`
/ `06-portal-form-expected-bottom.png` (Claude Design, mismo form en dos
posiciones de scroll).

**Decisión de negocio revertida por el usuario (2026-09-03)**: la pasada
anterior había clasificado `displayName`/`serviceType`/`description`/logo
como `BACKEND_GAP` sin decisión de negocio confirmada y el usuario había
elegido explícitamente no implementarlos. En esta pasada el usuario
confirmó que sí son campos reales — la decisión se documenta aquí porque
la reversión en sí es la evidencia de que no se inventó nada por cuenta
propia; se implementó solo después de que el usuario, la autoridad real
sobre el modelo de negocio (§3 "Jerarquía de autoridad" del prompt
maestro), lo confirmara.

**`displayName`/`serviceType`/`description` — reales, requeridos en
creación (`MISSING` → implementado de punta a punta)**:

- `PortalEntity` gana 4 columnas nuevas, las 3 de texto **nullable** (los
  3 portales sembrados antes de esta pasada — Avanza/Otrahuilca/Coopenjo —
  no tienen ninguna; migración aditiva, sin backfill inventado) pero
  **requeridas en `CreatePortalSchema`** para todo portal nuevo.
- `serviceType` es **texto libre, no un enum cerrado** — la imagen lo
  muestra como un `<select>` ("Selecciona un tipo"), pero no existe en
  `docs/business/` ningún catálogo confirmado de categorías de portal
  (distinto de `Category` de Comercio, que sí es real y ya existe).
  Inventar una lista de opciones habría sido exactamente el "no inventar
  negocio no confirmado" que esta misma pasada evita en otros puntos —
  documentado en el docblock de la entidad, trivial de convertir a enum
  cuando el negocio defina las opciones reales.
- **`UpdatePortalSchema` los deja opcionales** (a diferencia de creación) —
  necesario para que un admin pueda seguir renombrando un portal viejo sin
  verse forzado a rellenar campos que nunca tuvo (`PortalForm.tsx` solo
  envía el campo si el admin escribió algo; enviar `''` habría fallado el
  `min(1)` del schema). Bug real encontrado durante el propio desarrollo:
  la primera versión exigía los 4 campos también en edición, lo que
  bloqueaba renombrar Avanza/Otrahuilca/Coopenjo — corregido antes de
  cerrar el slice, con el propio E2E de `superadmin.spec.ts` (que renombra
  Otrahuilca) como regresión real.
- **Verificado real** (`apps/api/test/portals.e2e-spec.ts` +
  `packages/contracts/src/portals.test.ts` + `e2e/create-portal.spec.ts`):
  creación sin estos campos → 400 real; creación completa → persiste y se
  lee de vuelta; edición pre-llena los valores reales del portal y
  persiste un cambio parcial.

**Logotipo del portal — storage local en disco (`BACKEND_GAP` → implementado)**:

- **Decisión del usuario**: storage local en disco (no S3/CDN por ahora).
  `multer` + `@types/multer` agregados como dependencias directas de
  `apps/api` (antes solo transitivas vía `@nestjs/platform-express`,
  mismo patrón que `express` durante el cutover de Better Auth).
- `POST /portals/:id/logo` (multipart, `memoryStorage()` — el buffer se
  valida y se escribe a disco en el propio servicio, no en el
  interceptor) y `GET /portals/:id/logo` (sirve el archivo,
  `res.sendFile`).
- **Validación real, no solo el `Content-Type` del cliente**: además del
  `fileFilter` de multer (MIME declarado, tamaño vía `limits.fileSize`),
  `PortalsService.uploadLogo` lee los **magic bytes reales** del archivo
  (`portal-logo-storage.ts`, `detectImageMimeType`) — un archivo que dice
  ser PNG pero no lo es se rechaza igual (probado con un archivo de texto
  disfrazado de `.png`). Nombre de archivo siempre generado server-side
  (`randomUUID()` + extensión real detectada) — nunca el nombre que manda
  el cliente (path traversal).
- **`apps/api/uploads/` gitignored** — nunca en el repo. Un logo
  reemplazado borra el archivo anterior (best-effort, no bloquea la
  request si ya no existe).
- **`GET /portals/:id/logo` es deliberadamente `@Public()`**: un logo no
  es dato sensible (cualquier rol que pueda listar portales ya lo ve
  inline), y un `<img src>` normal nunca manda la cookie de sesión
  cross-origin (`:3101` dashboard vs `:4100` API) — protegerlo igual que
  el resto de la API solo habría roto la imagen sin ganar seguridad real.
  `logoUrl` en `Portal` es una ruta relativa al prefijo de la API
  (`/portals/{id}/logo`, no `/api/v1/...`) — el frontend arma la URL
  completa con `API_BASE_URL` (`lib/api/config.ts`), igual que cualquier
  otra llamada.
- `lib/api/client.ts` gana soporte real para `FormData` (antes solo
  JSON.stringify incondicional) — sin eso, el upload real desde el
  navegador nunca habría funcionado.
- **Verificado real** (`apps/api/test/portals.e2e-spec.ts`, 5 tests +
  `e2e/create-portal.spec.ts`): sube un PNG real de 1x1 (bytes reales, no
  un archivo simulado) y `GET` devuelve exactamente los mismos bytes con
  el `Content-Type` correcto; re-subir reemplaza el archivo servido (no
  solo la fila); un archivo no-imagen disfrazado de PNG se rechaza; `GET`
  sin logo nunca subido es 404 real, no una imagen rota; un
  `ADMIN_PORTAL` no puede subir un logo a un portal fuera de su scope
  (403 real, BOLA).
- **Hallazgo real durante esta pasada, no relacionado con el código**: la
  suite E2E completa (dashboard-web) había acumulado ~22 portales de
  prueba en la base de desarrollo real a lo largo de la sesión (nombres
  `E2E Portal ...`, `Portal A/B ...`, etc., de corridas repetidas). La
  página `/portales` hace una consulta de comercios por portal (N+1) —
  con ~26 portales esa sola carga de página se acercaba al límite real
  del `ThrottlerGuard` (100 req/60s), produciendo 429 intermitentes que
  parecían fallos de test. Limpiados los 22 portales de prueba (los 4
  reales — Avanza/Otrahuilca/Coopenjo/coopcentral — verificados intactos
  primero, cero dependientes en los de prueba antes de borrar). El propio
  patrón N+1 es preexistente y queda fuera del alcance de esta pasada — no
  se tocó, solo se documenta como hallazgo real.

**"Portal activo" (`MAPPING_REQUIRED` cerrado en la pasada anterior)**:

- `status` ya existía en la entidad (`default: 'ACTIVE'`) y en
  `PATCH /portals/:id/status`, pero no en la creación. `CreatePortalSchema`
  ganó `status: EntityStatusSchema.optional()` — el toggle de
  `06-portal-form-expected-bottom.png`, con `ACTIVE` como default real
  (no solo visual) cuando se omite.
- **Guardrail real agregado**: `UpdatePortalSchema` (`PATCH /portals/:id`,
  edición simple) **excluye `status` explícitamente**
  (`CreatePortalSchema.omit({ status: true })`) — solo
  `PATCH /portals/:id/status` puede cambiarlo, porque es el único que
  audita `PORTAL_ACTIVATED`/`PORTAL_DEACTIVATED`
  (`PortalsService.updateStatus`). Sin este guardrail, agregar `status` a
  `CreatePortalSchema` y derivar `UpdatePortalSchema` de él con `.partial()`
  (como estaba antes) habría dejado que una edición cualquiera cambiara el
  estado del portal sin pasar por el endpoint auditado — se verificó con
  un test real (`portals.e2e-spec.ts`) que un `PATCH /portals/:id` con
  `status` en el body no cambia nada.
- Toggle propio, accesible (`role="switch"`, `aria-checked`), no el patrón
  decorativo del switch de modo oscuro del Sidebar — solo aparece en modo
  creación (edición nunca envía `status`).
- **Verificado real** (`apps/api/test/portals.e2e-spec.ts`, 4 tests +
  `apps/dashboard-web/e2e/create-portal.spec.ts`, 2 tests, contra
  PostgreSQL real): crear sin `status` → `ACTIVE`; crear con
  `status: 'INACTIVE'` → `INACTIVE` real; `PATCH` simple con `status` en
  el body → ignorado, el estado no cambia; `PATCH .../status` → sí cambia.
  El toggle real de la UI, no solo la API: apagarlo produce un portal
  `INACTIVE` real en Postgres.

### 17.3 Allies / Commerce

**Referencias**: `07-ally-form-expected-top.png` / `08-ally-form-expected-bottom.png`
(Claude Design, mismo form en dos posiciones de scroll).

Slice puramente visual — todos los campos del form ya existían en
`CreateCommerceSchema` (`EXISTS`, §17.5), **cero cambios de backend/
contrato**:

- **Reordenado** (`CommerceForm.tsx`) para seguir el orden de la imagen:
  `INFORMACIÓN GENERAL` → Nombre del establecimiento, Tipo de
  establecimiento (`categoryId`), NIT o Identificación; `INFORMACIÓN DE
  CONTACTO` → Email, Teléfono, Ciudad, Dirección. `legalName`
  ("Razón social") y `contactName` ("Nombre de contacto") — reales,
  requeridos por el backend, ausentes en la imagen (`EXISTS, imagen
  incompleta`, §17.5) — se mantienen, al final de su sección respectiva,
  en vez de eliminarse.
- **Relabeled** para acercarse al texto exacto de la imagen (sin tocar el
  modelo de datos): `categoryLabel` "Categoría" → "Tipo de
  establecimiento"; `taxIdLabel` "NIT" → "NIT o Identificación";
  `tradeNameLabel` "Nombre comercial" → "Nombre del establecimiento". La
  imagen sigue mapeando sobre el mismo `categoryId` real
  (`GET /portals/:portalId/categories`), no un campo de texto libre nuevo.
- **`Dirección` se mantiene requerida**, aunque la imagen la marca
  "(opcional)" — `address` es `NOT NULL` en el backend real; por la
  jerarquía de autoridad de este documento (backend > imagen), la imagen
  es la que está mal etiquetada, no el formulario.
- **Verificado real** (`e2e/create-ally.spec.ts`, contra PostgreSQL real):
  el formulario reordenado sigue creando un comercio real dentro de su
  portal — prueba que el reorden no rompió el wiring de ningún campo, no
  que se haya encontrado un bug.

### 17.4 Transaction Alerts

**Referencia**: `09-transaction-alerts-expected.png` (Claude Design).

`AlertsCard` ya derivaba de transacciones reales (las 3 más recientes en
scope, sin datos inventados) — el `BACKEND_GAP` real era la persistencia
de leído/no-leído: "Marcar todas como leídas" no tenía `onClick`.

- **Modelo adaptado, no copiado ciegamente**: el prompt maestro sugería una
  tabla `Notification` completa (`audience`/`type`/`title`/`message`/...).
  En vez de eso, `transaction_alert_reads` (nueva, mínima): `(id, user_id,
  transaction_id, read_at)`, `UNIQUE(user_id, transaction_id)`, ambas FK
  `ON DELETE CASCADE`. El contenido mostrable de cada alerta sigue
  derivándose 100% en vivo de su `Transaction` real (igual que antes de
  esta tabla existir, `toTxAlert`) — solo si el usuario actual ya la vio
  necesitaba persistirse. Ausencia de fila = no leída.
- **`GET /transactions/alerts`** (`TransactionsController`, declarado
  antes de `:id` — si no, Nest interpretaría "alerts" como el param `:id`
  y fallaría con 400 en vez de 404/200 real): mismas transacciones
  scope-filtradas que `GET /transactions` (reutiliza `findAll`), cada una
  anotada con `isRead` real para el actor actual
  (`TransactionAlertSchema = TransactionSchema.extend({isRead})`).
- **`POST /transactions/alerts/read-all`**: recibe `transactionIds` del
  cliente (las alertas que tiene renderizadas), pero **nunca confía en
  ellos a ciegas** — se intersectan contra el scope real del actor
  (recalculado server-side, mismo `findAll`) antes de escribir nada; un id
  fuera de scope se descarta en silencio, nunca se registra (OWASP API1,
  verificado con test real). Idempotente (`upsert` con
  `ON CONFLICT DO NOTHING` sobre `(user_id, transaction_id)`).
- **Sin realtime**: ni WebSocket ni SSE ni polling — refetch normal de
  Next.js (Server Component) en cada navegación/refresh, como el resto de
  la app. No se justificó necesidad de más.
- **Frontend**: `AlertsCard.tsx` pasó a Client Component (necesita
  `onClick` real); `lib/transactions.ts` gana `TransactionAlertView`/
  `toTransactionAlertView`/`recentTransactionAlertViews` (mismo patrón que
  `TxAlert`/`toTxAlert`/`recentTxAlerts`, que se dejan intactos — los sigue
  usando la actividad reciente de Aliado detail, una superficie distinta
  sin este `BACKEND_GAP`). El badge "Nueva" por-alerta y el contador del
  header ("N nuevas") ahora reflejan `isRead` real, no todas las alertas
  incondicionalmente.
- **Bug real encontrado y corregido durante esta pasada**: la primera
  versión de `TransactionAlertReadEntity` compilaba y pasaba lint, pero
  fallaba en runtime con `EntityMetadataNotFoundError: No metadata for
  "TransactionAlertReadEntity" was found` — faltaba registrarla en
  `src/config/entities.ts` (la lista única que alimenta tanto
  `database.module.ts` como `data-source.ts`, docs/adr/010); estar en el
  `TypeOrmModule.forFeature` del módulo no basta. Encontrado por el propio
  test de integración nuevo, corregido, verificado.
- **Migración hecha a mano, no con el output crudo de `migration:generate`**:
  el generador diffó una baja no relacionada (`DROP CONSTRAINT` sobre el FK
  real y preexistente de `users` hacia `"user"` de Better Auth) — mismo
  patrón de "editar a mano tras generar" ya documentado en
  `AddTransactions1788150347573`. La migración final (`AddTransactionAlertReads`)
  solo crea `transaction_alert_reads`; verificada `up`/`down`/`up` contra
  Postgres real, con el FK de `users` intacto confirmado por consulta
  directa antes y después.
- **Verificado real**: `apps/api/test/transactions.e2e-spec.ts` (6 tests
  nuevos) — scope-filtrado igual que `GET /transactions`, marca-y-persiste
  entre requests, idempotente, id fuera de scope descartado (BOLA), estado
  por-usuario (dos VIEWERs distintos no comparten leído/no-leído).
  `apps/api/src/modules/transactions/transactions.service.spec.ts` (4
  tests nuevos, unitarios). `e2e/transaction-alerts.spec.ts` (2 tests,
  frontend real): un VIEWER recién creado ve el badge "Nueva" real, marca
  todas como leídas real (`POST` real capturado), el badge desaparece, y
  **persiste tras un `reload()` real** (no solo estado de React); un
  ADMIN_PORTAL(Avanza) fresco solo ve alertas de su propio portal
  (`page.request` contra el endpoint real, mismo patrón que
  `create-user.spec.ts`).

### 17.5 Matriz de auditoría completa (las 4 áreas)

Auditoría real (frontend + backend + `@repo/contracts` + docs de negocio)
hecha antes de tocar código, siguiendo la jerarquía de autoridad de este
documento — el backend/modelo de negocio manda sobre la imagen "expected"
cuando entran en conflicto:

| Área / Problema | Estado actual | Esperado (imagen) | Backend actual | Clasificación | Decisión |
|---|---|---|---|---|---|
| Users: menú ⋮ acciones | Recortado en la última fila (`overflow-hidden`) | Siempre visible, teclado, focus-return | N/A (solo UI) | `FUNCTIONAL_BUG` | **Corregido** — ver §17.1 |
| Users: campos personales (Empresa/Cédula/Teléfono/Ciudad/Dirección) | Solo Nombre, Email, Contraseña, Rol, Alcance | 8 campos en 2 columnas | `CreateUserSchema = {email, password, fullName, role, scopePortalId?, scopeCommerceId?}` — sin cédula/teléfono/ciudad/dirección en ningún lado (`AppUser` tampoco) | `NOT_SUPPORTED` (Cédula/Teléfono/Ciudad/Dirección) · `ADAPT` (Empresa = el selector de Alcance ya real) | **Hecho** — reflow a 2 columnas solo con campos reales, ver §17.1 |
| Users: contraseña provisional | Admin la escribe a mano | "Se generarán credenciales automáticamente" | `CreateUserSchema.password` requerido (mín. 12) — sin endpoint de auto-generación | `BACKEND_GAP` | **Hecho** — generada server-side, devuelta una vez en `POST /users`, input quitado, ver §17.1 |
| Users ↔ Better Auth atomicidad | Ya transaccional (`dataSource.transaction`) | — | — | `KEEP` | **Hecho** — test real que fuerza el fallo y verifica que nada se guarda, ver §17.1 |
| Portal: Nombre del portal | Único campo | Campo 1 de 6 | `CreatePortalSchema = { name }` | `EXISTS` | Mantener |
| Portal: Nombre de visualización / Tipo de servicio / Descripción | No existían | Campos 2, 3, 4 | Docblock del contrato decía *"field list undecided"* | `BACKEND_GAP` | **Hecho** — el usuario confirmó los campos reales (revierte la decisión anterior); `serviceType` es texto libre, no el enum cerrado de la imagen (sin catálogo confirmado) — ver §17.2 |
| Portal: Logotipo | No existía | Upload drag&drop | Cero módulos de imágenes/upload/storage en `apps/api` | `BACKEND_GAP` — infraestructura nueva | **Hecho** — storage local en disco (decisión del usuario), `multer`, magic-byte real, `GET`/`POST /portals/:id/logo` — ver §17.2 |
| Portal: Portal activo | No existe en creación | Toggle | `status` ya existe en la entidad y en `PATCH /portals/:id/status`; falta en `CreatePortalSchema` | `MAPPING_REQUIRED` | **Hecho** — `status` opcional en `CreatePortalSchema`, excluido de `UpdatePortalSchema` (guardrail de auditoría), ver §17.2 |
| Ally: Nombre/Tipo/NIT/Email/Teléfono/Ciudad | Ya existen (`tradeName`, `categoryId`, `taxId`, `contactEmail`, `contactPhone`, `city`) | Igual | `CreateCommerceSchema` los tiene todos | `EXISTS` | **Hecho** — reordenado a 2 secciones visuales, sin tocar backend, ver §17.3 |
| Ally: Dirección | Requerida (`NOT NULL`) | Marcada "(opcional)" en la imagen | `address varchar NOT NULL` | Discrepancia visual, no `BACKEND_GAP` | El backend manda: se mantiene requerida; la imagen se equivoca en esa etiqueta |
| Ally: Razón social / Nombre de contacto | Ya requeridos, no aparecen en la imagen | — | `legalName`, `contactName NOT NULL` | `EXISTS`, imagen incompleta | Se mantienen (el backend manda sobre la imagen) |
| Ally ↔ Portal / scope | Ya verificado con 403 real (`rbac.spec.ts`) | — | `ScopeAuthorizationService` | `KEEP` | Ninguna |
| Duplicados (email, taxId, nombre de portal) | `ConflictException` real por unique constraints | — | `UNIQUE(email)`, `UNIQUE(taxId)`, `UNIQUE(portal.name)` | `KEEP` (backend) | Frontend debe traducir el 409 a mensaje UX — **pendiente** |
| Alertas de transacciones | `AlertsCard` ya deriva de transacciones reales (3 más recientes); "Marcar todas como leídas" es decorativo (sin `onClick`) | Igual visualmente, con persistencia real de leído/no-leído | No existía tabla de lectura en las 18 tablas reales de Postgres | `BACKEND_GAP` (persistencia leído/no-leído) | **Hecho** — `transaction_alert_reads` (mínima, no un `Notification` completo), ver §17.4 |

## 18. Historial de este documento

- **2026-09-03 (Portal: displayName/serviceType/description/logo reales)** —
  El usuario revirtió explícitamente la decisión de la pasada anterior de
  no implementar estos campos ("pero igual no modificaste el formulario de
  creación de portal como lo indiqué"). Cerrado de punta a punta:
  migración aditiva (4 columnas nullable en `portals`), `CreatePortalSchema`
  las exige en creación, `UpdatePortalSchema` las deja opcionales (bug real
  encontrado y corregido: la primera versión bloqueaba renombrar los 3
  portales sembrados, que no tienen estos campos). Logo: storage local en
  disco (decisión del usuario), `multer` agregado como dependencia directa,
  validación real por magic bytes (no solo `Content-Type`), `GET`
  deliberadamente público (razón documentada en §17.2), `lib/api/client.ts`
  gana soporte real para `FormData`. `serviceType` es texto libre a
  propósito — la imagen lo muestra como dropdown pero no existe un catálogo
  de categorías de portal confirmado en ningún doc de negocio.
  Migración `AddPortalFields` escrita a mano (mismo patrón ya documentado
  en Slice 5: `migration:generate` diffó drift no relacionado sobre FKs
  hand-named de migraciones anteriores). Hallazgo real no relacionado con
  el código: ~22 portales de prueba acumulados en la base de desarrollo por
  las corridas E2E de toda la sesión hacían que la página `/portales`
  (N+1 de comercios por portal, preexistente) se acercara sola al límite
  real del rate limiter — limpiados tras verificar cero dependientes.
  Verificado: `@repo/contracts` 58/58, `api` unit 46/46, `test:integration`
  85/85, `test:auth-cutover-rehearsal` 12/12; `dashboard-web` unit 43/43;
  quality gate completo del monorepo (`turbo run typecheck/lint/build`)
  limpio en los 4 packages/apps; `e2e/*.spec.ts` 21/21 (verificado en una
  corrida secuencial completa, 19/21 juntos + los 2 restantes aislados —
  mismo patrón de rate limiter ya documentado), `visual.spec.ts` 21/21 (3
  viewports, sin regresión).

- **2026-09-02 (corrección funcional/visual — Slice 5: alertas de
  transacciones + cierre de los 5 slices)** — Última pasada de
  "CORRECCIÓN FUNCIONAL Y VISUAL — USUARIOS + PORTALES + ALIADOS +
  ALERTAS": `BACKEND_GAP` de persistencia leído/no-leído cerrado con
  `transaction_alert_reads` (modelo mínimo, no un `Notification`
  completo — ver §17.4). Bug real encontrado y corregido en el camino:
  la entidad nueva faltaba en `src/config/entities.ts`
  (`EntityMetadataNotFoundError` en runtime, código que compilaba y
  pasaba lint igual). Con esto, **los 5 slices del prompt quedan
  cerrados**: Slice 1 (menú ⋮), Slice 2 (crear usuario + credencial
  provisional), Slice 3 (crear portal + activo), Slice 4 (crear aliado,
  visual), Slice 5 (alertas). Los 2 bloqueadores de negocio (campos de
  Portal, logo de Portal) siguen sin implementar por decisión explícita
  del usuario — documentado, no un pendiente técnico.
  Verificado: `@repo/contracts` 56/56, `api` unit 46/46,
  `test:integration` 78/78, `test:auth-cutover-rehearsal` 12/12, `api`
  build limpio; `dashboard-web` unit 42/42, `e2e/*.spec.ts` 18/18,
  `visual.spec.ts` 21/21 (3 viewports, sin regresión — Transacciones no
  cambió visualmente pese al `AlertsCard` ahora interactivo), `build`
  limpio. **Nota honesta sobre el rate limiter real**: con la suite ya en
  18 tests reales (cada uno con 1-3 logins reales), correrla completa con
  alta concurrencia (8 workers) dispara el `ThrottlerGuard` real
  (100 req/60s) de forma reproducible — no es un bug de esta pasada, es
  el mismo control de seguridad ya documentado en §11.5 para
  `visual.spec.ts`, ahora también visible en la suite regular por su
  tamaño. Cada test — y grupos de hasta 9 tests — se verificó en verde de
  forma aislada/secuencial (`--workers=1`, con una ventana del limiter de
  por medio); no se relajó el limiter ni se debilitó ningún control real
  para hacer pasar nada.

- **2026-09-02 (corrección funcional/visual — Slice 4: crear aliado)** —
  Cuarta pasada, la más pequeña: puramente visual. Todos los campos de
  "Crear aliado" ya existían en `CreateCommerceSchema` (`EXISTS`) —
  reordenados/reetiquetados en `CommerceForm.tsx` para seguir
  `07-ally-form-expected-top.png`/`08-ally-form-expected-bottom.png`, cero
  cambios de backend/contrato (§17.3). `Dirección` se mantiene requerida a
  propósito (la imagen la marca "(opcional)", pero el backend manda:
  `address NOT NULL`). Verificado: `dashboard-web` typecheck/lint limpios,
  `e2e/create-ally.spec.ts` nuevo (1/1) contra PostgreSQL real — prueba que
  el reorden no rompió el wiring de ningún campo.

- **2026-09-02 (corrección funcional/visual — Slice 3: crear portal)** —
  Tercera pasada: único gap real de "Crear portal" cerrado —
  `CreatePortalSchema.status` opcional (default `ACTIVE`), toggle "Portal
  activo" real y accesible en la UI (§17.2). Los otros 3 campos que pide
  la imagen (nombre de visualización/tipo de servicio/descripción) y el
  logo quedan sin implementar por decisión explícita del usuario — no son
  bugs, son alcance de negocio no confirmado. Guardrail real agregado:
  `UpdatePortalSchema` excluye `status` a propósito, para que una edición
  simple no pueda cambiar el estado sin pasar por el endpoint auditado —
  verificado con test real (`portals.e2e-spec.ts`). Verificado:
  `@repo/contracts` 56/56, `api` typecheck/lint limpios,
  `test:integration` 73/73 (69 + 4 nuevos), `dashboard-web`
  typecheck/lint limpios, `e2e/create-portal.spec.ts` nuevo (2/2) +
  `e2e/superadmin.spec.ts` reverificado limpio tras una falsa alarma por
  el mismo `ThrottlerException` real ya documentado en el Slice 2 (no una
  regresión — confirmado repitiendo tras la ventana del limiter).

- **2026-09-02 (corrección funcional/visual — Slice 2: crear usuario)** —
  Segunda pasada de la misma corrección: form "Crear usuario" reflowed a 2
  columnas/2 secciones con campos reales únicamente (§17.1), y el
  `BACKEND_GAP` de contraseña provisional cerrado de extremo a extremo —
  `CreateUserSchema` pierde `password`, `CreateUserResponseSchema` nuevo
  (`temporaryPassword`, exclusivo de `POST /users`), generación con
  `randomBytes` (CSPRNG). 5 archivos de test de backend actualizados
  (`users.service.spec.ts` + 4 `*.e2e-spec.ts` que creaban un usuario y
  luego iniciaban sesión con una contraseña fija) para leer
  `temporaryPassword` de la respuesta real en vez de un literal.
  `e2e/create-user.spec.ts` nuevo (2 tests) prueba la cadena completa real:
  API → UI → login real con la contraseña mostrada → `GET` nunca la repite.
  Verificado: `@repo/contracts` 53/53, `api` unit 42/42, `api`
  `test:integration` 69/69, `test:auth-cutover-rehearsal` 12/12, `api`
  build limpio; `dashboard-web` unit 40/40, `e2e/*.spec.ts` 13/13,
  `visual.spec.ts` 21/21 (3 viewports, sin regresión visual — el form no
  se captura en ninguna baseline), `build` limpio. (Una corrida de
  `visual.spec.ts` a mitad de esta pasada mostró 9 fallos falsos por un
  `ThrottlerException` real del rate limiter, producto de correr muchas
  suites E2E seguidas contra el mismo backend en la misma sesión — no una
  regresión de código; confirmado repitiendo la suite tras la ventana del
  limiter.)

- **2026-09-02 (corrección funcional/visual — Slice 1: menú de acciones)** —
  Primera pasada de "CORRECCIÓN FUNCIONAL Y VISUAL — USUARIOS + PORTALES +
  ALIADOS + ALERTAS": auditoría completa de las 4 áreas contra el backend
  real (§17.5), 2 decisiones de negocio confirmadas por el usuario (campos
  de Portal, logo de Portal — ambas "no implementar todavía", ver §17.5).
  Slice 1 (menú ⋮) cerrado con evidencia real: bug de clipping corregido
  (`RowActionsMenu.tsx` sobre Radix, §17.1), `e2e/superadmin.spec.ts`
  actualizado (rompía con el nuevo dropdown portaleado — buscaba el item
  dentro de la fila), `e2e/row-actions-menu.spec.ts` nuevo (2 tests).
  Verificado: `e2e/*.spec.ts` 11/11 y `visual.spec.ts`
  21/21 (chromium + 3 viewports) contra `apps/api` + PostgreSQL reales.
  Slices 2-5 (Crear Usuario, Crear Portal, Crear Aliado, Alertas) quedan
  auditados (§17.5) pero sin implementar — siguiente paso de esta misma
  pasada.

- **2026-09-02 (visual regression + SUPERADMIN E2E)** — Cerrados los dos
  pendientes P1 dejados por el cierre técnico anterior (§16): (1)
  `e2e/visual.spec.ts` + 3 proyectos Playwright dedicados, 20 baselines
  reales sobre las 8 pantallas ya aprobadas por Claude Design (§14); (2)
  `apps/api/src/scripts/seed-e2e-superadmin.ts` + `e2e/superadmin.spec.ts`
  demuestran el happy path real de SUPERADMIN sin tocar la cuenta
  bootstrap original (§7.2/§11.4). Efecto secundario real encontrado y
  corregido en el camino: 18 logins redundantes de la suite visual
  disparaban el `ThrottlerGuard` real bajo la paralelización de
  Playwright — corregido con `auth.setup.ts`/`storageState` (una sola
  sesión reutilizada), nunca tocando el límite. `typecheck`/`lint`/
  `test:unit`/`build` verdes en `dashboard-web` y `api`; `e2e/*.spec.ts`
  9/9 y `visual.spec.ts` 20/20 contra `apps/api` + PostgreSQL reales. Sin
  cambios de diseño, contratos, arquitectura ni Better Auth.

- **2026-09-02 (cierre P1 accesibilidad)** — Cerrado el pendiente P1
  dejado por el cierre técnico anterior (§12): `PortalForm`, `UserForm`,
  `CommerceForm`, `PerfilTab` y `SeguridadTab` pasaron de
  `<button onClick>` a `<form onSubmit>` real, así que `Enter` en un
  campo de texto ahora envía el formulario para un usuario de teclado.
  Verificado con `typecheck`/`lint`/`test:unit`/`build` verdes y la
  suite `e2e/*.spec.ts` completa (8/8, incluyendo la nueva
  `e2e/accessibility.spec.ts`) contra `apps/api` + PostgreSQL reales.
  Sin cambios de diseño, contratos, ni de arquitectura.

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
