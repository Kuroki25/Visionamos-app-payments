# Portal Web — Source of Truth

Fuente de verdad **técnica y visual** única para `apps/portal-web` (la
aplicación pública de Red Coopagos: directorio de portales, búsqueda de
comercios aliados, y — en slices futuros — el flujo de pago). No compite
con `docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md` (esa es la SoT de
`apps/dashboard-web`, el panel administrativo) — son aplicaciones distintas
con responsabilidades distintas (§1).

**Última actualización real**: 2026-09-03. Cierra la **Foundation** (Slice 1)
y **Home** (Slice 2) del prompt maestro "ARQUITECTURA Y CONSTRUCCIÓN DEL
PORTAL WEB REDCOOP", verificado contra `apps/api` + PostgreSQL reales
(Docker), con Playwright E2E real (10/10 verde) y unit tests reales (17/17
verde). Slices 3–8 (Portal detail completo, Comercios, Servicios, Dynamic
Form Renderer, imágenes de comercio, pagos) están **deliberadamente sin
construir** — ver §23 "Known Limitations" / §24 "Deferred Features". Este
documento describe lo que **realmente existe**, no la arquitectura completa
planeada (§27, principio de mantenimiento).

## 1. Propósito

`portal-web` es la cara pública de Red Coopagos: un visitante anónimo (sin
sesión, sin Better Auth) descubre un portal publicado, navega sus comercios
aliados y — en un slice futuro — paga un servicio a través de un formulario
dinámico configurado desde `dashboard-web`. Es un **cliente de solo
lectura pública** de `apps/api` (NestJS): nunca administra, nunca crea un
segundo backend, nunca importa código de `apps/dashboard-web` directamente
(§25 "Architecture Drift Guard").

## 2. Estado y versiones verificadas

Idénticas a `dashboard-web` (mismo monorepo, mismo `catalog:` de pnpm) —
verificadas independientemente para esta app:

| Pieza | Versión |
|---|---|
| Next.js | 16.3.3 (App Router, Turbopack) |
| React | 19.2.8 |
| TypeScript | 6.0.3 (`strict`, `exactOptionalPropertyTypes: true`) |
| Tailwind CSS | 4.3.3 (CSS-based `@theme`, sin `tailwind.config.js`) |
| Vitest / Testing Library | 4.1.11 / 16.3.3 |
| Playwright | 1.62.1 |

Puerto de desarrollo: **3100** (`package.json`, `next dev -p 3100`) — ya
incluido en `apps/api/.env`'s `CORS_ALLOWED_ORIGINS` desde el scaffold
original del monorepo, sin cambios necesarios.

## 3. Locked Architectural Decisions

Estas decisiones están bloqueadas. Una sesión futura no puede cambiarlas
silenciosamente — si aparece una razón técnica real, debe detenerse,
mostrar evidencia y proponer alternativas (regla general del repo).

1. NestJS sigue siendo el único backend. `portal-web` nunca se convierte en
   un segundo backend ni en un BFL/BFF sin justificación documentada.
2. Dashboard (`apps/dashboard-web`) administra/configura. Backend
   (`apps/api`) valida y persiste. Portal Web (`apps/portal-web`) publica y
   renderiza. Nunca al revés.
3. `portal-web` solo consume datos públicos autorizados
   (`GET /public/*` — §12). Nunca DTOs administrativos completos.
4. TypeORM y PostgreSQL siguen siendo el ORM/base de datos.
5. `@repo/contracts` sigue siendo el contrato compartido — `PublicPortal`,
   `PublicCommerce`, `PageMeta`, etc. viven ahí, no duplicados localmente.
6. Next.js App Router es la base; Server Components son el comportamiento
   por defecto (§16) — Client Components solo donde hay interacción real.
7. Los textos estáticos viven en `src/content/es/` (§8); nunca datos del
   backend (nombres/descripciones/logos de portales o comercios).
8. Los colores/tokens viven en `src/app/globals.css` (`@theme`, §9);
   **deliberadamente distintos** de los de `dashboard-web` — ver §9.
9. La búsqueda vive como feature identificable (`src/features/search/`,
   §7) — Portal search y Commerce search comparten la misma primitiva
   (`SearchInput`), no implementaciones independientes.
10. No se crean páginas hardcodeadas por portal — el routing de Portal es
    dinámico (`/portales/[portalId]`, §14).
11. No se inventan datos para suplir funcionalidad faltante — un campo o
    página que el backend no soporta se documenta como `BACKEND_GAP`/
    `DEFERRED` (§23/§24), nunca se rellena con datos falsos.
12. La autorización real (qué está publicado/activo) es autoridad del
    backend (`PublicCatalogService`) — nunca filtrada solo en frontend.
13. Ninguna imagen de comercio/portal se administra desde `portal-web` —
    solo se renderiza (§10 "Image & Media Architecture").
14. Ningún dato de "Mis Pagos" (historial de pagos del pagador) se inventa
    — no existe ese modelo en el backend todavía (§23).

## 4. Architecture Map

```
apps/portal-web/
└── src/
    ├── app/                    Rutas (App Router). Cada page.tsx es Server
    │                           Component por defecto (§16).
    │   ├── layout.tsx          Shell público: fuente, <PublicHeader/>, metadata base.
    │   ├── page.tsx             Home (Slice 2).
    │   ├── globals.css          Design tokens (@theme, §9).
    │   ├── portales/[portalId]/page.tsx   Portal detail mínimo (arranque de Slice 3, §23).
    │   └── mis-pagos/page.tsx   Placeholder honesto (§23) — no historial inventado.
    ├── components/
    │   ├── layout/PublicHeader.tsx   Shell compartido por toda ruta pública.
    │   └── ui/                 Primitivas cross-feature reales: Pagination, icons.
    ├── content/es/              Textos estáticos (§8). NUNCA datos de backend.
    ├── features/
    │   ├── portal-directory/    Grid + búsqueda + paginación de portales (Home).
    │   ├── search/               SearchInput compartido + PortalSearchForm + GlobalCommerceSearch.
    │   ├── faq/                  Acordeón FAQ.
    │   └── support/               Sección soporte/confianza (estática).
    └── lib/api/                  config/server/client/errors — infraestructura HTTP única (§12).
```

Carpetas mencionadas por el prompt maestro y **deliberadamente ausentes**
porque nada las necesita todavía: `types/` (los tipos vienen de
`@repo/contracts`, no hay tipos locales que ameriten su propio directorio
todavía), `styles/tokens.css` como archivo separado (los tokens viven
directamente en `app/globals.css`, mismo patrón que `dashboard-web` — un
archivo aparte no aporta nada hoy), `features/dynamic-forms/`,
`features/payments/`, `features/commerce-directory/`, `features/categories/`
(Slices 4-6, no construidos — §24).

Regla de dependencia: `app/` solo compone `features/`+`components/`;
`features/` puede depender de `lib/`, `content/`, `components/ui`; nunca al
revés. Ningún archivo de `portal-web` importa desde
`apps/dashboard-web/src/...` (§3, decisión 3) — solo `@repo/contracts` y
`@repo/ui`.

## 5. Visual Contract

Referencias aprobadas (`docs/frontend/portal-references/`):

- `01-public-home-directory.png` — header, buscador global de comercios
  (hero con gradiente), directorio de portales con buscador propio, grid de
  cards, paginación.
- `02-public-home-support.png` — continuación del directorio, estado
  "No se encontraron portales con ese nombre.", bloque de soporte y de
  confianza.
- `03-public-home-faq.png` — soporte, confianza, FAQ (sección oscura con
  acordeones).

**Regla de no-regresión**: estos contratos son tan vinculantes como el §9
de `DASHBOARD_SOURCE_OF_TRUTH.md`. Una sesión futura no puede simplificar
el Home aquí documentado sin actualizar esta sección primero.

**Hallazgo importante de las referencias**: los recuadros "Logo de \<Portal\>
/ or browse files" en `01`/`02` son un artefacto del prototipo de diseño
(placeholders de upload), **no** UI pública real — confirmado y resuelto:
`PortalCard` renderiza el logo real del portal (`GET /portals/:id/logo`,
mismo endpoint que ya usa `dashboard-web`) o un ícono de fallback neutral
(`ImagePlaceholderIcon`) cuando no hay logo, nunca un control de upload.

**Sin handoff `.dc.html`** (a diferencia de `dashboard-web`, que sí tuvo uno
— `RedCoop Dashboard.dc.html`): los tokens de color de esta app (§9) se
extrajeron por **inspección visual** de las 3 PNG, no de un archivo de
diseño con valores exactos. Son aproximaciones razonables, documentadas
como tales — no se presentan como valores "oficiales" de marca.

**Verificado real** (captura de pantalla contra el servidor real, no un
mock — 1440px): header con ícono/wordmark "Redcoop pagos PSE", nav
Inicio/Preguntas frecuentes/Mis Pagos, botón Soporte; hero con gradiente
azul→cian conteniendo el buscador de comercios; card blanca con buscador de
portales + grid (Avanza/Otrahuilca reales, con ícono de fallback porque
esos 2 portales sembrados no tienen logo todavía); bloque "¿Tienes dudas?"
(gradiente) + "Paga con confianza"; sección FAQ oscura con 3 acordeones.
Coincide con la dirección visual de las referencias.

**Responsive**: la referencia solo cubre desktop. `PublicHeader` se
verificó explícitamente para no perder el nav en mobile — un bug real que
esta misma pasada encontró y corrigió: la primera versión usaba
`hidden md:flex` sin ningún menú alternativo, lo que habría hecho
Inicio/Preguntas frecuentes/Mis Pagos completamente inalcanzables por
debajo de `md`. La versión final envuelve (`flex-wrap`) en vez de ocultar.

## 6. Feature Registry

| Feature | Ubicación | Responsabilidad | API | Estado |
|---|---|---|---|---|
| Home | `app/page.tsx` | Compone hero+directorio+soporte+FAQ, lee `searchParams` | `GET /public/portals` | ✅ Slice 2 |
| Portal Directory | `features/portal-directory/` | Grid + búsqueda + paginación real de portales publicados | `GET /public/portals` | ✅ Slice 2 |
| Portal Search | `features/search/components/PortalSearchForm.tsx` | Input URL-driven (`?q=&page=`) | — (Server Component re-fetch) | ✅ |
| Global Commerce Search | `features/search/components/GlobalCommerceSearch.tsx` | Búsqueda cliente, submit-driven, resultados con link al portal | `GET /public/commerces` | ✅ (enlaza al portal, no a un detalle de comercio — §24) |
| FAQ | `features/faq/` | Acordeón accesible, contenido estático | — | ✅ |
| Support/Trust | `features/support/` | Sección estática | — | ✅ |
| Portal Detail | `app/portales/[portalId]/page.tsx` | Branding real del portal + placeholder honesto | `GET /public/portals/:id` | 🟡 Mínimo (arranque de Slice 3 — sin categorías/comercios todavía) |
| Mis Pagos | `app/mis-pagos/page.tsx` | Placeholder honesto | — | 🟡 Deferred (§23) |
| Categories / Commerce Directory | — | Directorio de comercios de un portal, filtro por categoría | `GET /public/portals/:id` ya soporta `categoryId`/`portalId` en `/public/commerces` (backend listo) | ❌ No construido (Slice 4) |
| Dynamic Form Renderer | — | Renderiza el formulario publicado de un Servicio | No existe endpoint público todavía | ❌ No construido (Slice 6, `BACKEND_GAP`) |
| Payment Flow | — | Envío del formulario → transacción real | Existe `TransactionEntity`/ADR-012, sin endpoint público de creación | ❌ No construido (Slice 6+, ver `docs/payments/PAYMENT_FLOW_MODEL.md` §21 "decisiones abiertas") |

## 7. Search Architecture

Ubicación: `src/features/search/`.

- **`SearchInput.tsx`** — primitiva compartida: un `<form role="search" onSubmit>`
  real (nunca `div`+`onClick`), label accesible (`sr-only` + `aria-label`),
  botón "Buscar". Sin hooks propios — no necesita `"use client"`, aunque
  hoy sus dos únicos consumidores sí lo son.
- **`PortalSearchForm.tsx`** (Client) — Portal Search. Estado: el valor
  entre teclas. Al enviar, escribe `?q=&page=` en la URL
  (`useRouter().push`) — el fetch real ocurre en el Server Component
  `app/page.tsx`/`PortalDirectory`, no aquí. Shareable/refresh-safe/
  deep-linkable (URL search params, no solo estado de React).
- **`GlobalCommerceSearch.tsx`** (Client) — Commerce Search. Submit-driven
  (no live-as-you-type — coincide con el botón "Buscar" explícito de la
  referencia), fetch real vía `apiClient` a `GET /public/commerces?q=`,
  estados reales `idle/loading/success/error` con `aria-live="polite"`.
  Cada resultado enlaza a `/portales/[portalId]` — ver §24 para por qué no
  a un detalle de comercio todavía.

No hay lógica de búsqueda duplicada entre las dos — ambas comparten
`SearchInput`; solo difieren en su mecanismo de estado (URL params vs.
fetch cliente), una diferencia real de comportamiento, no una duplicación
accidental.

**Paginación**: `components/ui/Pagination.tsx` — real, construida desde
`PageMeta` (`page/pageSize/total/totalPages`, `@repo/contracts`), nunca un
"Página 1 de 2" hardcodeado. Se oculta por completo si `totalPages <= 1`.
Enlaces `<Link>` reales, no botones con `onClick` — la navegación la
resuelve el Server Component al re-renderizar con el nuevo `searchParams`.

**Backend**: `PaginationQuerySchema`/`paginatedSchema` (`@repo/contracts/pagination.ts`)
— `page` (≥1, default 1), `pageSize` (1–50, default 12; **rechazado** por
encima de 50, nunca una página sin límite — verificado con test real). `q`
tiene un tope de 200 caracteres. Búsqueda vía `ILIKE` parametrizado
(TypeORM `QueryBuilder`, nunca interpolación directa de texto de usuario).

## 8. Content Architecture

`src/content/es/`:

| Archivo | Contenido |
|---|---|
| `common.ts` | Nombre/descripción de la app, "Buscar", error genérico. |
| `navigation.ts` | Copy del header (`PublicHeader`). |
| `home.ts` | Copy de Home: hero, directorio de portales, búsqueda de comercios, soporte, confianza. |
| `faq.ts` | Preguntas/respuestas reales (fundamentadas en `docs/payments/PAYMENT_FLOW_MODEL.md` — nunca prometen un mecanismo que el backend no implementa, p. ej. no se afirma que se envía confirmación por correo). |
| `portal.ts` | Copy del detalle de portal (placeholder honesto) y de "Mis Pagos". |
| `errors.ts` | Copy de error/empty states genéricos. |

**Qué va aquí**: texto estático de UI (labels, placeholders, botones,
títulos, mensajes de error/empty state, preguntas de FAQ). **Qué NO va
aquí**: nombres/descripciones/logos de portales o comercios (vienen de
`@repo/contracts`/la API), ni ningún valor calculado en runtime.

Sin i18n (`next-intl`/`i18next`) — no hay requerimiento multiidioma
confirmado (decisión explícita del prompt maestro §22); la estructura por
carpeta de idioma (`es/`) ya deja el camino trivial para agregarlo si
alguna vez se necesita.

## 9. Design Token Architecture

Archivo real: `src/app/globals.css` (`@theme` de Tailwind v4 — sin
`tailwind.config.js`, igual que `dashboard-web`).

Paleta **pública** "RedCoop Pagos" — deliberadamente distinta de la paleta
**admin** de `dashboard-web` (`--color-accent` azul neutro, fondo gris
claro de panel): esta es la marca orientada al usuario final (gradiente
navy→cian, sección FAQ casi negra, wordmark "pagos" en naranja). Ambas
palabras conviven porque son dos productos con audiencias distintas — no es
drift, es una diferencia real documentada aquí.

| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | `#f4f6fb` | Fondo de página |
| `--color-surface` | `#ffffff` | Cards |
| `--color-surface-muted` | `#f1f4f9` | Fallback de logo, resultados hover |
| `--color-border` | `#e3e7f0` | Bordes |
| `--color-fg` / `-soft` / `-faint` | `#0f1729` / `#4b5568` / `#8b93a7` | Texto |
| `--color-brand-blue` / `-dark` | `#2563eb` / `#1d4ed8` | Nav, botones, links |
| `--color-brand-navy` / `--color-brand-cyan` | `#0d2a63` / `#3fa9f5` | Extremos del gradiente hero/soporte |
| `--color-orange` | `#f7941d` | Wordmark "pagos" |
| `--color-ink` / `-soft` / `-border` | `#0a0e1a` / `#141a2b` / `#232a3d` | Sección FAQ, botón Soporte |
| `--radius-hero` / `--radius-card` / `--radius-pill` | `1.75rem` / `1.25rem` / `999px` | — |

Fuente: `next/font/google` Inter (self-hosted), mismo family/weights que
`dashboard-web` ya usa — heredado por consistencia entre las dos apps del
monorepo, no leído de las PNG (una captura no permite identificar una
fuente con certeza).

## 10. Image & Media Architecture

```
Dashboard (POST /portals/:id/logo, multipart)
   ↓
apps/api — multer + validación real por magic bytes
   ↓
Storage local en disco (apps/api/uploads/portal-logos/)
   ↓
Portal.logoPath (filename, nunca expuesto directo)
   ↓
GET /public/portals → logoUrl: "/portals/{id}/logo" (relativo)
   ↓
portal-web: <img src={API_BASE_URL + logoUrl}>
```

**Reutilizado 1:1**, no reconstruido: `GET /portals/:id/logo` ya es
`@Public()` en el backend (implementado en la pasada anterior del
dashboard, `docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md` §17.2) — servido
público a propósito porque un `<img src>` normal nunca manda la cookie de
sesión cross-origin, así que la razón original aplica igual aquí, con más
motivo (`portal-web` no tiene sesión en absoluto).

- **Portal logo**: `PortalCard.tsx` / `app/portales/[portalId]/page.tsx` —
  `<img>` plano (no `next/image`), mismo patrón exacto que
  `dashboard-web/PortalForm.tsx` ya usa para el mismo recurso (contenedor
  circular fijo, `object-contain`, sin deformar). `next/image` no se
  configuró (`images.remotePatterns`) porque no aporta nada aquí: es
  contenido cross-origin de la propia API, no un asset estático que Next
  pueda optimizar en build.
- **Fallback**: `ImagePlaceholderIcon` — un portal sin logo (p. ej. Avanza/
  Otrahuilca hoy) nunca muestra una imagen rota, "undefined", ni un control
  de upload.
- **Commerce logo**: **no existe** en el backend (`CommerceEntity` no tiene
  columna de logo) — `BACKEND_GAP`, diferido explícitamente (§24): las 3
  referencias visuales dadas solo muestran logos de Portal, nunca de
  Comercio.
- **Validación de contenido**: ya la hace el backend (magic bytes, tamaño
  máx. 5MB, PNG/JPEG/WebP) — `portal-web` no sube nada, así que no
  necesita repetir esa validación.

## 11. Dynamic Forms Architecture

**No construido en esta pasada** (Slice 6). El backend ya modela
correctamente lo necesario — `FormDefinition` (1 por Service) →
`FormVersion` (versionado, `isPublished` con índice único parcial que
garantiza como máximo una versión publicada por definición — el
`BACKEND_GAP CRÍTICO` que el prompt maestro anticipaba en su §32 **no
existe**: ya está resuelto) → `FormField` (tipos reales: ver
`FormFieldTypeSchema` en `@repo/contracts`) → `FormSubmission` (inmutable,
sin `updatedAt`). Falta únicamente el **endpoint público** de solo lectura
que exponga la versión publicada de un Service — no construido todavía,
documentado aquí para que la siguiente sesión no vuelva a auditar esto
desde cero.

## 12. Public API Architecture

Todos los endpoints reales que `portal-web` usa hoy. Nuevo módulo
`apps/api/src/modules/public-catalog/` — deliberadamente **separado** de
`PortalsController`/`CommercesController` (que devuelven la forma admin
completa y están protegidos por `@Roles(...)`): mezclar una ruta anónima
ahí habría sido un error de `@Roles()` de distancia de un bug real de
excessive data exposure (OWASP API3). Cada ruta es `@Public()`.

| Method | Path | Responsabilidad | Datos públicos devueltos | Paginación | Filtros | Cache |
|---|---|---|---|---|---|---|
| GET | `/public/portals` | Portales publicados+activos | `id,name,displayName,serviceType,description,logoUrl` | `page`,`pageSize` (máx. 50) | `q` (nombre, ILIKE) | `revalidate: 30s` |
| GET | `/public/portals/:id` | Detalle de un portal | igual, sin envolver en paginación | — | — | `revalidate: 30s` |
| GET | `/public/commerces` | Comercios publicados+activos, de portales publicados+activos, con su portal/categoría | `id,tradeName,portalId,portalName,categoryId,categoryName` | `page`,`pageSize` | `q`,`portalId`,`categoryId` | sin cache (fetch cliente) |

Errores importantes: `404` para un portal inexistente **o** despublicado/
inactivo (misma respuesta — nunca revela cuál de los dos casos es, para no
habilitar enumeración); `400` para un id no-UUID o `pageSize`/`q` fuera de
rango (nunca deja pasar una consulta sin límite). Verificado con 13 tests
de integración reales (`apps/api/test/public-catalog.e2e-spec.ts`).

`PublicPortal`/`PublicCommerce` son contratos **propios**
(`@repo/contracts/public-catalog.ts`), no una reutilización de
`Portal`/`Commerce` — nunca exponen `status`/`isPublished`/`createdAt`/
`updatedAt` ni campos administrativos de Commerce (`taxId`,`legalName`,
`contactEmail`,`contactPhone`,`address`) — verificado con test real.

## 13. Data Flow

```
HOME
portal-web (Server Component)
  → GET /public/portals?q=&page=
  → PortalDirectory (grid + Pagination)

GLOBAL COMMERCE SEARCH
GlobalCommerceSearch (Client)
  → GET /public/commerces?q=
  → lista de resultados → /portales/[portalId]

PORTAL DETAIL (mínimo)
app/portales/[portalId]/page.tsx (Server Component)
  → GET /public/portals/:id (404 si no publicado/activo)
  → branding real + placeholder "próximamente comercios"

DIFERIDO — no construido todavía:
Portal → Categories → Commerces → Services → Published Form → Submission → Payment
```

## 14. Route Map

| Ruta | Server/Client | Fuente de datos | SEO | Feature principal |
|---|---|---|---|---|
| `/` | Server (`page.tsx` es `async`, lee `searchParams`) | `GET /public/portals` | `metadata` estático (`layout.tsx`) | Home |
| `/portales/[portalId]` | Server | `GET /public/portals/:id` | `generateMetadata()` real (título/descr. del portal), `notFound()` si no existe/no publicado | Portal detail (mínimo) |
| `/mis-pagos` | Server (estático) | — | `metadata` estático | Placeholder honesto |

No hay `/portales/[portalSlug]/aliados/[commerceSlug]` todavía — Slice 4/5
(§24). Slugs SEO-friendly (`Portal.slug`, etc.) no existen en el backend —
`BACKEND_GAP` diferido (§24): las rutas usan el `id` (UUID) real por ahora,
migrar a slug es un cambio aditivo reversible cuando el negocio lo
confirme.

## 15. Component Map

| Componente | Ubicación | Server/Client | Reutilización |
|---|---|---|---|
| `PublicHeader` | `components/layout/` | Server | Todo layout |
| `Pagination` | `components/ui/` | Server (usa `<Link>`, no JS) | `PortalDirectory` hoy; futuro directorio de comercios |
| `SearchInput` | `features/search/components/` | Ninguno propio (presentacional) | `PortalSearchForm`, `GlobalCommerceSearch` |
| `PortalCard` | `features/portal-directory/components/` | Server | `PortalDirectory` |
| `Faq` | `features/faq/components/` | Client (estado de acordeón) | Home |
| `SupportTrust` | `features/support/components/` | Server (estático) | Home |
| icons (`HomeIcon`,`SearchIcon`,`ChevronDownIcon`,`ChevronLeftIcon`,`ChevronRightIcon`,`ImagePlaceholderIcon`) | `components/ui/icons.tsx` | Server | Cross-feature |

## 16. Server and Client Boundaries

| Componente | Tipo | Por qué |
|---|---|---|
| `Home` (`app/page.tsx`) | Server | Lee `searchParams`, hace fetch server-side |
| `PortalDirectory`, `PortalCard`, `Pagination`, `SupportTrust`, `PublicHeader` | Server | Sin estado de interacción propio |
| `app/portales/[portalId]/page.tsx` | Server | `generateMetadata` + fetch |
| `PortalSearchForm` | Client | `useRouter`/`useSearchParams`, estado del input |
| `GlobalCommerceSearch` | Client | fetch + estado de resultados en el navegador |
| `Faq` | Client | Estado de acordeón (`useState`) |

Ninguna página completa lleva `"use client"` — la frontera se mantiene lo
más abajo posible (regla del prompt maestro §11), verificado leyendo cada
archivo, no supuesto.

## 17. Publication Contract

Estados reales que puede tener un Portal/Commerce en el backend:
`status` (`ACTIVE`/`INACTIVE`, `@repo/contracts` `EntityStatusSchema`) +
`isPublished` (`boolean`) — **dos conceptos independientes** (un portal
puede estar `ACTIVE` sin estar publicado, o publicado y luego
desactivado). `portal-web` solo puede ver un recurso cuando **ambos** son
verdaderos (`status = 'ACTIVE' AND isPublished = true`) — aplicado en
`PublicCatalogService`, nunca en el frontend. Verificado con test real: un
portal publicado y luego desactivado (`status = INACTIVE`) desaparece de
`/public/portals` y su detalle 404. `FormVersion` tiene el mismo patrón
(`status`+`isPublished`) — listo en el backend, sin consumidor público
todavía (§11).

## 18. Error Handling

| Caso | HTTP | UX |
|---|---|---|
| Portal inexistente / despublicado / inactivo | 404 | `notFound()` de Next (página 404 real) |
| `pageSize` > 50, `q` > 200 chars, id no-UUID | 400 | Se evita en UI (inputs no lo permiten en el flujo normal); a nivel de red, `ApiError.isClientError` |
| Fallo de red | — | `NetworkError`, mensaje genérico (`errorsContent`/`home.commerceSearch.error`) |
| Búsqueda de comercio sin resultados | 200, `items: []` | `home.commerceSearch.noResults` |
| Búsqueda de portal sin resultados | 200, `items: []` | `home.portalDirectory.noResults` — el mensaje exacto de la referencia, y **solo** cuando `items.length === 0` (nunca junto con resultados) |

`lib/api/errors.ts` es el único traductor de
`application/problem+json` → `ApiError`/`NetworkError` — ninguna feature
parsea `Response` directamente (mismo principio que `dashboard-web`).

## 19. Security Contract

| Control | Frontend | Backend |
|---|---|---|
| Object-level exposure (BOLA/API1) | — | `PublicCatalogService` filtra `isPublished+status` en cada query; 404 idéntico para "no existe" y "no publicado" (sin enumeración) |
| Excessive data exposure (API3) | — | `PublicPortal`/`PublicCommerce` son proyecciones propias, nunca el DTO admin |
| Rate limiting | — | `ThrottlerGuard` global (`APP_GUARD`) sigue aplicando — `@Public()` solo exime de autenticación, nunca del límite de tasa |
| Input validation | — | `PaginationQuerySchema`/`PublicPortalsQuerySchema`/`PublicCommercesQuerySchema` (Zod) — `pageSize` tope 50, `q` tope 200 chars |
| SQL injection | — | TypeORM `QueryBuilder` parametrizado (`:q`, `:portalId`, ...) — nunca interpolación de texto de usuario |
| XSS / código inyectado | React escapa por defecto; sin `dangerouslySetInnerHTML` en ningún componente nuevo | — |
| CORS | — | `CORS_ALLOWED_ORIGINS` explícito (`apps/api/.env`), ya incluye `localhost:3100` |
| Secrets/PII | Ningún dato de contacto de comercio (`email`,`teléfono`,`dirección`) se expone — verificado con test real | mismo |

No hay sesión/cookies en `portal-web` — no hay superficie de CSRF ni de
manejo de credenciales que auditar en esta app todavía (aparecerá en el
slice de pagos).

## 20. Performance Contract

- Server Components por defecto (§16) — mínimo JS al navegador para
  contenido no interactivo.
- `lib/api/server.ts` cachea con `next: { revalidate: 30 }` por defecto —
  contenido público real, no `no-store` (a diferencia de `dashboard-web`,
  que sirve datos admin user-scoped). Un publish/unpublish desde Dashboard
  se refleja en `portal-web` dentro de, como máximo, esa ventana.
- Sin N+1: `PublicCatalogService.searchCommerces` resuelve portal+categoría
  con un único `innerJoinAndSelect` — nunca una consulta adicional por
  fila.
- Sin medidas de Lighthouse/Web Vitals tomadas todavía — no se inventan
  métricas (regla general del prompt maestro §105).

## 21. Testing / Test Matrix

| Feature | Unit | Integration | E2E real | Visual | Responsive | A11y |
|---|---|---|---|---|---|---|
| `PortalCard` | ✅ 5 tests | — | ✅ (parte de Home) | Captura manual (§5) | Desktop only (Playwright config) | — |
| `Pagination` | ✅ 4 tests | — | — (dataset actual no alcanza 2 páginas) | — | — | `aria-current`, enlaces reales |
| `SearchInput` | ✅ 4 tests | — | ✅ (Enter real) | — | — | `role="search"`, label, submit nativo |
| `Faq` | ✅ 4 tests | — | ✅ | — | — | `aria-expanded`/`aria-controls`, teclado (Enter) |
| Home (composición completa) | — | — | ✅ 10/10 | Captura manual | — | — |
| Public API (`/public/*`) | — | ✅ 13/13 (Postgres real) | (cubierto por el E2E de arriba) | N/A | N/A | N/A |
| `pagination.ts`/`public-catalog.ts` (contracts) | ✅ 20 tests | — | — | — | — | — |

`PASS` requiere evidencia — todos los números de arriba son de corridas
reales de esta pasada (`pnpm test:unit`/`pnpm exec playwright test`/
`pnpm test:integration`), no inferidos.

**Visual regression automatizada** (Playwright `toHaveScreenshot`, como ya
tiene `dashboard-web`): **no implementada todavía** — `NOT IMPLEMENTED`,
diferido (§24). La verificación visual de esta pasada fue una captura real
manual comparada contra las 3 referencias (§5), no una regresión
automatizada con baseline.

## 22. Definition of Done — Foundation + Home

- [x] `apps/portal-web` auditado (ya existía como scaffold) y construido sobre él
- [x] Source of Truth (este documento)
- [x] CLAUDE.md actualizado (§26)
- [x] Arquitectura feature-first
- [x] Content centralizado (`content/es/`)
- [x] Design tokens centralizados (`app/globals.css`)
- [x] API pública definida e implementada (`/public/portals`, `/public/portals/:id`, `/public/commerces`)
- [x] Search feature aislada
- [x] Image contract definido e implementado (reutiliza el logo de Portal existente)
- [ ] Dynamic form renderer — **no construido** (§11/§24)
- [x] Publicación Dashboard → Portal definida y verificada con test real (publish/unpublish → aparece/desaparece)
- [x] Server/Client boundaries documentados y verificados
- [x] SEO — `generateMetadata()` real en Portal detail; metadata estático en Home/Mis Pagos
- [x] error/loading/not-found — `notFound()` real en Portal detail; estados vacíos reales en ambas búsquedas
- [x] Seguridad — ver §19
- [x] Testing strategy — ver §21 (visual regression automatizada pendiente)

**No se declara "COMPLETED" la fase completa del prompt maestro** — solo
Foundation + Home. Slices 3–8 siguen abiertos, sin gaps P0 conocidos dentro
de lo que sí se construyó.

## 23. Known Limitations

- **"Mis Pagos"**: sin modelo de negocio de historial de pagos del pagador
  en el backend. `/mis-pagos` es un placeholder honesto, no un historial
  inventado (decisión explícita del prompt maestro §19).
- **Slugs SEO-friendly**: no existen en `Portal`/`Commerce`/`Category`/
  `Service` — las rutas usan `id` (UUID). Cambio aditivo reversible cuando
  el negocio confirme el requerimiento.
- **Commerce logo**: no existe columna en el backend — ningún comercio
  muestra logo todavía (las 3 referencias dadas no lo requerían).
- **Global commerce search → destino**: enlaza al Portal
  (`/portales/[portalId]`), no a un detalle de Comercio dedicado — ese
  detalle es Slice 4/5, no construido todavía.
- **Portal detail**: solo branding (logo/nombre/descripción) + placeholder
  "próximamente" — sin categorías, sin grid de comercios, sin paginación
  propia. Existe únicamente para que los enlaces de Home tengan un destino
  real (§24).
- **Visual regression automatizada**: no implementada (§21).
- **Pago real / formulario dinámico público**: no implementado — depende
  de decisiones de negocio abiertas documentadas en
  `docs/payments/PAYMENT_FLOW_MODEL.md` §21 ("Consulta posterior sin
  cuenta" está explícitamente pendiente de definir ahí).

## 24. Deferred Features

Por slice del prompt maestro, ninguno de estos es un bug — son
funcionalidad real, deliberadamente futura:

| Slice | Qué falta | Depende de |
|---|---|---|
| 3 (Portal dinámico, completo) | Categorías + grid de comercios + paginación propia dentro de `/portales/[portalId]` | Nada nuevo — el backend público ya soporta `portalId`/`categoryId` en `/public/commerces` |
| 4 (Categories + Commerce directory) | UI de filtro por categoría | Slice 3 completo primero |
| 5 (Commerce/Service flow) | Página de detalle de comercio, selección de servicio | Slice 4 |
| 6 (Dynamic Form Renderer) | Endpoint público de `FormVersion` publicada + renderer + registry de tipos de campo | `BACKEND_GAP` menor (el modelo ya existe, falta el endpoint) |
| 7 (Dashboard → imagen/publicación) | Logo de Comercio | `BACKEND_GAP` — columna nueva en `CommerceEntity` |
| 8 (Pago) | Envío de formulario → transacción real, resultado al usuario | Decisiones de negocio abiertas (`PAYMENT_FLOW_MODEL.md` §21) |
| — | Slugs SEO-friendly | Confirmación de negocio (§23) |
| — | Visual regression automatizada (Playwright `toHaveScreenshot`) | Ninguna — trabajo mecánico, puede hacerse en cualquier momento |

## 25. Drift Guards

**Architecture Drift Guard**: antes de crear un archivo nuevo, ¿pertenece a
una feature existente (§6)? Antes de otro API client: usar
`lib/api/{server,client}.ts`. Antes de otro Search: reutilizar
`features/search/`. Antes de otro sistema de tokens: usar
`app/globals.css`. Antes de otro content store: usar `content/es/`. Antes
de otro auth mechanism: **detenerse** — esta app no tiene ni necesita
sesión. Antes de hardcodear datos: verificar el backend público primero.

**Visual Drift Guard**: antes de cambiar color/spacing/radius/tipografía/
layout de header/search/FAQ/comportamiento de imagen de portal, comparar
contra `docs/frontend/portal-references/` y §5 de este documento.

**API Drift Guard**: antes de inventar un endpoint porque una vista lo
necesita — inspeccionar `apps/api/src/modules/public-catalog/` primero,
luego el controller/DTO/service/entity/`@repo/contracts` del dominio real
(Portal/Commerce/Category/Service/Form). Los contratos compartidos y el
backend deben mantenerse sincronizados — un cambio en
`@repo/contracts/public-catalog.ts` requiere `pnpm --filter @repo/contracts build`
antes de que `apps/api`/`apps/portal-web` vean el cambio (real, encontrado
en esta misma pasada).

**Dynamic Form Drift Guard**: cuando se construya el Slice 6, el Portal no
puede inventar tipos de campo que Dashboard no pueda configurar — la
compatibilidad debe ser: tipos soportados por el editor (Dashboard) = tipos
soportados por el backend (`FormFieldTypeSchema`) = tipos soportados por el
renderer (Portal). Si diverge, es `BLOCKER`.

**Image Drift Guard**: Dashboard administra, Backend valida/persiste,
Portal solo renderiza. Nunca un control de upload en `portal-web`. Nunca
una URL de imagen hardcodeada por portal/comercio en el código.

## 26. Documentos relacionados

`CLAUDE.md` (raíz del repo) ahora incluye la regla: antes de modificar
`apps/portal-web` o cualquier código relacionado con rutas públicas,
portales, comercios, categorías, búsqueda, formularios dinámicos,
imágenes, branding, publicación, API pública, pagos públicos, estilos,
tokens, textos, responsive o SEO de esa app — leer este documento primero.

## 27. Decision Log

- **2026-09-03 — Public API en módulo separado, no rutas extra en los
  controllers admin.** Contexto: `PortalsController`/`CommercesController`
  ya existen, protegidos por `@Roles(...)`. Decisión: nuevo
  `PublicCatalogModule`/`PublicCatalogController` (`@Controller('public')`,
  `@Public()` a nivel de clase), con DTOs de respuesta propios
  (`PublicPortal`/`PublicCommerce`). Por qué: mezclar una ruta anónima en un
  controller ya protegido es un error de `@Roles()` de distancia de un bug
  real de excessive data exposure — separar el controller hace ese error
  estructuralmente imposible, no solo improbable. Alternativas
  consideradas: agregar `@Public()` a rutas existentes (descartado, riesgo
  de exposición); un guard genérico que decida qué campos son públicos
  (descartado, sobreingeniería para 2 entidades). Consecuencias: un
  desarrollador nuevo encuentra toda la superficie pública en un solo lugar.

- **2026-09-03 — Slugs diferidos, rutas por UUID.** Contexto: el prompt
  maestro pide URLs SEO-friendly: `Portal`/`Commerce`/`Category`/`Service`
  no tienen columna `slug`. Decisión: usar `id` (UUID) en las rutas ahora;
  clasificar slug como `BACKEND_GAP` diferido, no inventar una solución sin
  confirmación de negocio (regla explícita del prompt maestro §10). Por
  qué: agregar `slug` implica generación, unicidad por scope, validación y
  tocar el formulario de creación en Dashboard — alcance real de otro
  slice, no una decisión que deba tomarse implícitamente para poder
  navegar Home. Consecuencias: las URLs actuales (`/portales/{uuid}`) no
  son amigables; migrarlas a slug después es un cambio aditivo (columna
  nullable + fallback a id) que no rompe nada existente.

- **2026-09-03 — Búsqueda de comercios enlaza al Portal, no a un detalle de
  Comercio.** Contexto: el prompt maestro (§15) pide que un resultado de
  búsqueda global "lleve al usuario al portal correcto + comercio
  correcto". Decisión: por ahora solo al portal — no existe página de
  detalle de comercio (Slice 4/5, no construido). Por qué: inventar una
  página de detalle de comercio con datos parciales solo para tener un
  destino habría sido construir UI a medias fuera de orden de slice (el
  prompt maestro §75 pide slices verticales, no adelantar piezas
  sueltas). Consecuencias: documentado en §23/§24; la siguiente sesión que
  construya Slice 4/5 debe actualizar `GlobalCommerceSearch.tsx` para
  enlazar al comercio real.

## 28. "Where do I change...?"

- **Textos**: `src/content/es/*.ts`.
- **Colores/tokens**: `src/app/globals.css` (`@theme`).
- **Header**: `src/components/layout/PublicHeader.tsx` +
  `content/es/navigation.ts`.
- **Portal Card**: `src/features/portal-directory/components/PortalCard.tsx`.
- **Buscador de portales**: `src/features/search/components/PortalSearchForm.tsx`.
- **Buscador global de comercios**: `src/features/search/components/GlobalCommerceSearch.tsx`.
- **Paginación**: `src/components/ui/Pagination.tsx`.
- **FAQ**: `src/features/faq/components/Faq.tsx` + `content/es/faq.ts`.
- **API pública (backend)**: `apps/api/src/modules/public-catalog/`.
- **Contratos públicos**: `packages/contracts/src/public-catalog.ts`,
  `packages/contracts/src/pagination.ts` — **recordar** `pnpm --filter @repo/contracts build`
  después de cambiarlos, o `apps/api`/`apps/portal-web` verán el contrato
  viejo hasta el próximo build (real, encontrado en esta pasada).
- **Configuración de API (URL base)**: `src/lib/api/config.ts`, `src/env.ts`.
- **Manejo de errores**: `src/lib/api/errors.ts`.
- **SEO**: `generateMetadata()` en cada `page.tsx` que lo necesite.
- **Tests**: junto a cada componente (`*.test.tsx`, Vitest); E2E real en
  `apps/portal-web/e2e/*.spec.ts` (usa `e2e/fixtures.ts` para crear datos
  reales vía la API — sin admin UI propia en esta app).

## 29. How to extend the Portal

- **Nueva sección en Home**: agregar el componente en `features/<algo>/`,
  componerlo en `app/page.tsx`. Si trae texto estático, agregarlo a
  `content/es/home.ts` (o un archivo nuevo si es un dominio propio).
- **Nueva página pública**: nueva carpeta bajo `app/`, `page.tsx` como
  Server Component por defecto. Si necesita datos, agregar la función de
  fetch en el `api.ts` de la feature correspondiente (usando
  `lib/api/server.ts`), nunca `fetch()` directo en el componente.
- **Nuevo filtro de búsqueda**: extender el schema de query en
  `@repo/contracts` (`public-catalog.ts`), el `PublicCatalogService`, y el
  componente cliente correspondiente — reusar `SearchInput` si aplica.
- **Nuevo tipo de campo dinámico** (cuando exista Slice 6): agregar al
  registry del renderer solo si el backend (`FormFieldTypeSchema`) y el
  editor de Dashboard ya lo soportan — nunca al revés (§25 "Dynamic Form
  Drift Guard").
- **Nueva propiedad visual administrable desde Dashboard**: el patrón ya
  existe para Portal (`displayName`/`serviceType`/`description`/logo) —
  mismo camino: migración aditiva → DTO admin → `PublicCatalogService`
  proyecta el campo nuevo en `PublicPortal`/`PublicCommerce` (o se agrega
  explícitamente, nunca reutilizando el DTO admin completo).
- **Nuevo endpoint público**: en `PublicCatalogController`
  (`@Public()`), nunca agregando `@Public()` a una ruta de los controllers
  admin existentes (§27, Decision Log).
- **Nuevo E2E**: `apps/portal-web/e2e/*.spec.ts`, usando
  `createPublishedFixture()` (`e2e/fixtures.ts`) para datos reales y únicos
  por test — requiere `apps/api` corriendo (`pnpm --filter api start:dev`)
  contra Postgres real y `pnpm build && pnpm exec playwright test` (o
  `pnpm dev` + `reuseExistingServer`).
