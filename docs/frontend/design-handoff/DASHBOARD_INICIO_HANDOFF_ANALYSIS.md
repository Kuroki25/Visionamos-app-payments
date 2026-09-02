# Design Handoff Analysis — RedCoop Dashboard (Claude Design → dashboard-web)

Fuente visual: proyecto Claude Design `003479d3-06f3-46d6-bf17-1d5cc0375542`,
archivo `RedCoop Dashboard.dc.html` (+ `TxTable.dc.html`, sub-componente
importado). Fuente técnica:
`docs/frontend/DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md`. Este documento no
compite con ninguna de las dos — traduce la primera a la arquitectura que
impone la segunda, para `apps/dashboard-web`.

Alcance de esta pasada: **fundaciones compartidas (tokens, AppShell,
sidebar, header, navegación, responsive base) + la primera pantalla
(Inicio)**, por la regla fundamental del handoff — no se implementan las
tres pantallas del archivo a la vez. Transacciones, Portales, Usuarios,
Portal detail, Aliado detail y Configuración quedan **DEFER** para pasadas
siguientes; sus sub-árboles ya fueron leídos y están resumidos abajo para
que la próxima pasada no tenga que releer el archivo completo.

## 1. Páginas contenidas en el archivo

| Vista (`state.view`) | Título mock | Estado en esta pasada |
|---|---|---|
| `inicio` | Dashboard Principal | **Implementada** |
| `transacciones` | Gestión de Transacciones | DEFER |
| `portales` | Gestión de Portales | DEFER |
| `usuarios` | Gestión de Usuarios | DEFER |
| `portalDetail` | (dinámico: nombre del portal) | DEFER |
| `aliadoDetail` (6 tabs: resumen/transacciones/movimientos/métodos/informes/información) | (dinámico: nombre del aliado) | DEFER |
| `configuracion` (4 tabs implementados + 4 "próximamente" en el propio mock) | Configuración | DEFER |

Más 5 overlays transversales (modales portal/usuario/aliado, vista de
usuario, confirmación) y un sistema de toasts — todos DEFER, ninguno se
usa en Inicio.

## 2. Estructura común / layout

`display:flex;height:100vh` → sidebar de ancho fijo (264px expandida /
76px colapsada) + panel derecho `flex:1;overflow-y:auto` que contiene un
topbar `sticky top:0` y el contenido scrollable debajo. Sin breakpoints —
ver §15.

## 3. Sidebar

Logo+botón de colapso, sección "MENÚ" con 5 ítems de navegación (Inicio /
Transacciones / Portales / Usuarios / Configuración), spacer, y un pie con
3 filas: modo oscuro (switch), notificaciones (badge + panel desplegable),
y el usuario actual (avatar iniciales + nombre + rol). Colapsar oculta
todo el texto y centra los iconos.

## 4. Header / topbar

Título + subtítulo de la página (o breadcrumbs cuando aplica — Portal
detail / Aliado detail), y una caja de búsqueda decorativa (sin backend
detrás) con hint `⌘K`.

## 5. Navegación

Enrutamiento en el mock es un `state.view` interno (SPA de un solo
archivo). Se tradujo a rutas reales de Next.js — ver §20, "Nav → rutas".

## 6. Componentes reutilizables (usados en ≥2 pantallas del archivo)

`TxTable` (Inicio, Transacciones, Aliado detail/tab Transacciones),
card genérica (`cardBg`+`border`+`radius:16px`+`cardShadow`, usada en casi
todas las pantallas), pill de estado/badge, fila de tabla con hover,
switch on/off, input/select de formulario, botón primario/ghost, tabs con
subrayado de acento, modal genérico (overlay + panel blanco), toast.

## 7. Componentes específicos de Inicio

3 `StatCard` (ingresos/egresos/transacciones, con sparkline + badge de
cambio), `FlowChartCard` (SVG de línea + área + tooltip on-hover +
selector de rango 7D/30D/90D), `GoalCard` (gauge de arco), `TxTable`
(compartido, ver §6).

## 8-13. Design tokens, colores, tipografía, spacing, radius, shadows

Portados 1:1 a `apps/dashboard-web/src/app/globals.css` como variables CSS
bajo `@theme` (claro) + override bajo `.dark` (oscuro), tomados
directamente de `getTheme(dark)` del mock — sin valores inventados:

| Token | Claro | Oscuro |
|---|---|---|
| `--color-bg` | `#f8f9fb` | `#0e1015` |
| `--color-sidebar` | `#ffffff` | `#12141a` |
| `--color-surface` (cardBg) | `#ffffff` | `#171a21` |
| `--color-surface-subtle` | `#f4f6fa` | `#1d212a` |
| `--color-border` | `#e7e9ef` | `#262b35` |
| `--color-fg` / `-soft` / `-faint` | `#111318` / `#4b5162` / `#8a90a1` | `#f1f2f4` / `#c7cad1` / `#8a8f9c` |
| `--color-accent` / `-soft` | `#2f6ef2` / `#eaf1ff` | `#5b9bff` / `rgba(91,155,255,.14)` |
| `--color-success` / `-soft` | `#17a970` / `#e9f9f1` | `#3ddc8c` / `rgba(61,220,140,.12)` |
| `--color-danger` / `-soft` | `#e0433f` / `#fdecec` | `#ff6b6b` / `rgba(255,107,107,.12)` |
| `--color-orange` | `#f97316` | `#f6934b` |

Radius: `--radius-card:16px`, `--radius-card-sm:14px` (stat/role chips),
`--radius-control:10px` (botones/inputs), `--radius-control-sm:8px`
(icon-buttons) — tokens nuevos y aditivos, no se tocó la escala `rounded-*`
por defecto de Tailwind. Shadows: `--shadow-card`, `--shadow-card-hover`,
`--shadow-dropdown`, `--shadow-panel`, `--shadow-modal`, `--shadow-toast`,
igual valor que `cardShadow`/`cardHoverStyle`/etc. del mock.

Tipografía: Inter 400/500/600/700/800, vía `next/font/google` (auto-hosted,
sin request externo ni layout shift) en vez del `<link>` del mock — mismo
resultado visual, mejor implementación para una app Next.js real.
Tamaños: el mock no trata el tamaño de letra como un token compartido (son
~20 valores `font-size:Npx` ad-hoc, no una variable con nombre como
`theme.accent`) — se mantienen como valores arbitrarios de Tailwind
(`text-[13.5px]`) en cada sitio de uso en vez de inventar una escala
semántica que el diseño no tiene, siguiendo el mismo principio de "no
inventar" que motiva los tokens de color.

Spacing: la escala por defecto de Tailwind (múltiplos de 4px) ya cubre
exactamente todos los valores del mock (2/4/6/8/10/…/36px) — no hizo falta
ningún token nuevo.

## 14. Breakpoints / responsive

**El archivo no define ningún comportamiento responsive** — es un layout
fijo de escritorio (`100vw/100vh`, grids `repeat(3/4/5,1fr)` sin colapsar,
tabla con `min-width:600px` + scroll horizontal como único ajuste). Esto
se documenta explícitamente, no se ignora en silencio: `Inicio` implementa
fidelidad exacta a 1024px+ (lo que se revisa contra el diseño) y usa
`grid-cols-3` fijo para los stat cards igual que el mock — no se colapsa a
1/2 columnas en pantallas angostas en esta pasada, para no inventar un
comportamiento que Claude Design no especificó. Se deja como ítem de
pulido futuro si el negocio confirma que el panel debe usarse en
viewports menores a 1024px.

## 15. Estados hover/focus/active/disabled

Hover (nav item, card shadow-hover, botón ghost, fila de tabla, ítem de
sidebar) → clases `hover:` de Tailwind referenciando los tokens. Focus de
inputs → `focus:border-accent` + anillo de 3px `accent-soft` (idéntico a
`inputFocusStyle`). Active → nav activo (`accent-soft` bg + texto accent +
bold), tabs activos (texto accent + borde inferior 2px accent), pills de
rango de fecha (bg accent sólido + texto blanco). El mock no muestra
ningún estado disabled explícito — se hereda el tratamiento ya existente
de `@repo/ui` (`opacity-50 cursor-not-allowed`) cuando aplique en pasadas
futuras.

## 16. Iconografía

100% SVG en línea, sin librería de iconos — se portaron las mismas rutas
exactas a `components/layout/icons.tsx` (menú, home, transacciones,
portales, usuarios, configuración, luna, campana, búsqueda) y
`features/dashboard-overview/components/stat-icons.tsx` (flechas de
tendencia de los stat cards). No se agregó ninguna dependencia de iconos.

## 17. Datos estáticos → datos reales

| Dato en el mock | Origen en esta pasada | Motivo |
|---|---|---|
| Nombre/rol en el pie del sidebar | **Real** — `getCurrentUser()` (`GET /auth/me`) | Ya existe |
| Últimas transacciones | **Real** — `GET /transactions`, ordenado por `createdAt desc`, recortado a 5 | Ya existe (sin paginación/orden en el backend — se ordena/recorta en el frontend) |
| Ingresos/Egresos/Transacciones (stat cards + % de cambio) | Estático | No existe endpoint agregado (`GET /transactions/summary` o similar) |
| Gráfica "Flujo de transacciones" (7D/30D/90D) | Estático (interactivo: el toggle de rango y el tooltip sí funcionan sobre datos de referencia) | Mismo motivo |
| "Meta mensual" (gauge + monto de hoy) | Estático | No existe el concepto de "meta" en `@repo/contracts` |
| Notificaciones | Estático/vacío (bell en 0, panel con estado vacío) | No existe módulo de notificaciones en el backend |

Cada uno queda aislado detrás de una única función
(`features/dashboard-overview/api/get-overview-metrics.ts`,
`features/dashboard-overview/lib/build-chart.ts`) con un comentario que
señala el endpoint que falta, para que conectarlo más adelante no toque
ningún componente.

## 18. Texto → `content/es/`

`content/es/nav.ts` (sidebar/topbar), `content/es/dashboardHome.ts`
(Inicio), `content/es/roles.ts` (mapa de `Role` real → etiqueta en
español), `content/es/transactions.ts` (columnas de `TxTable`, labels de
método/estado). Ningún nombre/dato proveniente del backend vive en
`content/` (regla ya vigente).

## 19. Nav → rutas

El mock enruta con `state.view` (una sola página, sin URL real). Se
tradujo a rutas de Next.js reales bajo el grupo `(dashboard)`:

| Ítem del sidebar | Ruta | Estado |
|---|---|---|
| Inicio | `/` | **Implementada** |
| Transacciones | `/transacciones` | Reservada — 404 hasta su propia pasada |
| Portales | `/portales` | Reservada — 404 hasta su propia pasada |
| Usuarios | `/usuarios` | Reservada — 404 hasta su propia pasada |
| Configuración | `/configuracion` | Reservada — 404 hasta su propia pasada |

Los 5 ítems se muestran siempre (fidelidad visual del sidebar completo);
solo Inicio resuelve a una página real hoy — es el estado esperado y
honesto de una migración incremental, no un bug.

`(dashboard)/layout.tsx` es la primera ruta protegida real de la app — es
exactamente la condición que `DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md` (§5,
§8) marcó como el disparador para crear el grupo `(dashboard)`. La
verificación de sesión (`getCurrentUser()` en ese layout, Server
Component) YA ES el mecanismo real que ese documento describe para
`proxy.ts` ("toda decisión se re-verifica en el Server Component... nunca
se confía solo en proxy.ts") — no se creó `proxy.ts` porque no añade nada
que este layout no cubra ya, y NestJS re-verifica cada request real de
todas formas.

Sin sesión → se reutiliza el mensaje ya existente en
`content/es/auth.ts` (`UnauthenticatedNotice`) en vez de redirigir a un
`/login` que no existe todavía — "RedCoop Login.dc.html" está fuera del
alcance de esta pasada (el usuario acotó el trabajo a
"RedCoop Dashboard.dc.html").

## 20. Correspondencia diseño → arquitectura (adaptaciones no triviales)

- **ROLES**: el mock muestra un catálogo de 5 roles (Superadministrador/
  Administrador/Portal/Comercio/Visor) en la pantalla de Configuración →
  Roles. El backend real (`RoleSchema`, `@repo/contracts`) solo tiene 4:
  `SUPERADMIN`/`ADMIN_PORTAL`/`ADMIN_COMMERCE`/`VIEWER`. `content/es/roles.ts`
  mapea los 4 reales, no los 5 del mock — la pantalla de Configuración →
  Roles (DEFER) tendrá que decidir esto de nuevo con su propio catálogo
  real, no reusar el del mock.
- **TRANSACTIONS.tipo**: el mock etiqueta cada fila con "↗ Ingreso"
  (implica una distinción ingreso/egreso). El dominio real
  (`TransactionSchema`) no tiene ese campo — cada `Transaction` es un pago
  entrante. `TxTable` real muestra "Pago" en su lugar
  (`content/es/transactions.ts`, `txTable.tipoLabel`) en vez de fabricar
  una distinción que los datos no tienen.
- **TRANSACTIONS.estado**: el mock solo mockea 3 estados
  (Exitosa/Pendiente/Rechazado). El dominio real tiene 7
  (`TransactionStatusSchema`). `content/es/transactions.ts` cubre los 7.
- **Dark mode trigger**: el mock alterna claro/oscuro con un switch manual
  en el sidebar, no con `prefers-color-scheme`. `globals.css` redefine
  `dark:` como variante de clase (`.dark` en `<html>`, ver
  `use-dark-mode.ts`) en vez de usar el variante de media-query por
  defecto de Tailwind — cambio de alcance local a este app, y hace que las
  clases `dark:` ya existentes de `@repo/ui` respondan al mismo switch.

## Matriz KEEP / ADAPT / CREATE / DEFER

| Elemento Claude Design | Destino en dashboard-web | Acción |
|---|---|---|
| `getTheme(dark)` (paleta light/dark) | `app/globals.css` `@theme` + `.dark` | **CREATE** (tokens nuevos, valores del mock) |
| `cardShadow`/`cardHoverStyle`/etc. | `app/globals.css` (`--shadow-*`) | **CREATE** |
| Tipografía Inter | `app/layout.tsx` (`next/font/google`) | **ADAPT** (mismo resultado, self-hosted) |
| Sidebar (logo, colapso, nav, footer) | `components/layout/Sidebar.tsx` | **CREATE** |
| Topbar (título/subtítulo/búsqueda) | `components/layout/Header.tsx` | **CREATE** |
| Shell general (`display:flex;height:100vh`) | `components/layout/AppShell.tsx` | **CREATE** |
| Iconos SVG en línea | `components/layout/icons.tsx`, `.../stat-icons.tsx` | **CREATE** (mismas rutas) |
| Toggle modo oscuro | `components/layout/use-dark-mode.ts` | **CREATE** |
| `Card`/`Button`/`Badge`/`Alert` genéricos | `@repo/ui` | **KEEP** (se reutilizan; ver `UnauthenticatedNotice`) |
| `TxTable.dc.html` | `features/transactions/components/TxTable.tsx` | **CREATE** (mismo layout de grid) |
| Mapeo fila de transacción | `features/transactions/api/map-transaction.ts` | **CREATE** (`Transaction` real → view model) |
| `statCards` (Inicio) | `features/dashboard-overview/components/StatCard(sRow).tsx` | **CREATE**, datos **DEFER** (sin endpoint agregado) |
| `buildChart()` | `features/dashboard-overview/lib/build-chart.ts` + `FlowChartCard.tsx` | **ADAPT** (misma matemática, sin backend) |
| `goalArc` (Meta mensual) | `features/dashboard-overview/components/GoalCard.tsx` | **ADAPT**, dato **DEFER** |
| Notificaciones (campana + panel) | `Sidebar.tsx` (estructura) | **ADAPT** — visual sí, datos **DEFER** (sin módulo backend) |
| Breadcrumbs (Portal/Aliado detail) | — | **DEFER** (no aplica a Inicio) |
| Pantalla Transacciones | `app/(dashboard)/transacciones/` | **DEFER** |
| Pantalla Portales / Portal detail | `app/(dashboard)/portales/` | **DEFER** |
| Pantalla Usuarios | `app/(dashboard)/usuarios/` | **DEFER** |
| Pantalla Aliado detail (6 tabs) | `app/(dashboard)/portales/[id]/aliados/[aliadoId]/` (a definir) | **DEFER** |
| Pantalla Configuración (4+4 tabs) | `app/(dashboard)/configuracion/` | **DEFER** |
| Modales (portal/usuario/aliado/confirm) + toasts | — | **DEFER** |
| "RedCoop Login.dc.html" | — | **DEFER** (fuera del alcance pedido en esta pasada) |

## Blockers reales para esta pasada

Ninguno. Los huecos identificados (§17: métricas agregadas, meta mensual,
notificaciones) no bloquean Inicio — se aislaron detrás de funciones con
datos de referencia documentados, siguiendo la regla de no modificar el
backend sin una incompatibilidad demostrable.
