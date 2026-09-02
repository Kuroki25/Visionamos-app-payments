# Dashboard Web — Source of Truth

Fuente de verdad **técnica y visual** única para `apps/dashboard-web`
(panel administrativo de Red Coopagos). Reemplaza y consolida
`DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md` (arquitectura, pre-handoff) y el
análisis de handoff de Claude Design — ver §10 "Historial de este
documento". No se crean documentos adicionales sin necesidad real.

**Última validación real de extremo a extremo**: 2026-09-02, contra
`apps/api` + PostgreSQL reales corriendo localmente (Docker,
`docker-compose.yml`), datos de `pnpm --filter api seed:demo` +
`seed:e2e-superadmin`, y las suites `apps/dashboard-web/e2e/*.spec.ts`
(9/9 verde) + `e2e/visual.spec.ts` (20/20 verde, 3 viewports). **Cierre
técnico del frontend: COMPLETED** — ver §16. Ver §9 para el detalle de
qué se verificó realmente vs. qué quedó inferido.

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

## 17. Historial de este documento

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
