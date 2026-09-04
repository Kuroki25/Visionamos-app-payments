# Portal Web — Implementation Report

Complementa (no reemplaza) `docs/frontend/PORTAL_WEB_SOURCE_OF_TRUTH.md`.
Explica **qué se hizo en esta implementación** (2026-09-03) — la Foundation
(Slice 1) y Home (Slice 2) del prompt maestro "ARQUITECTURA Y CONSTRUCCIÓN
DEL PORTAL WEB REDCOOP". Slices 3–8 quedan como trabajo real, abierto — ver
la SoT §23/§24.

## 1. Resumen ejecutivo

`apps/portal-web` existía como scaffold vacío del monorepo (una página de
ejemplo con `@repo/ui`). Esta pasada: auditó el modelo de dominio real del
backend (Portal→Category→Commerce→Service→FormDefinition→FormVersion→
FormField, ya sólido); encontró que **no existía ninguna API pública
anónima**; la construyó (`PublicCatalogModule`, 3 endpoints, paginación y
búsqueda nuevas en `@repo/contracts`); construyó el Home real
(`01`/`02`/`03` de las referencias) contra esa API real — buscador de
comercios, directorio de portales con búsqueda y paginación real, soporte/
confianza, FAQ accesible — con un arranque mínimo y honesto de Slice 3
(detalle de portal) para que los enlaces de Home no fueran dead links.
Verificado con Playwright E2E real (10/10), integración real contra
Postgres (13/13 nuevos, 98/98 totales de `apps/api`), y unit tests reales
(17/17 en `portal-web`, 72/72 en `@repo/contracts`).

## 2. Estado inicial encontrado

- `apps/portal-web`: Next 16/React 19/TS estricto/Tailwind v4 ya
  configurados (scaffold del monorepo), `@repo/contracts`/`@repo/ui` ya
  como dependencias, Playwright/Vitest ya cableados, puerto 3100 ya
  incluido en `CORS_ALLOWED_ORIGINS` del backend. Cero `features/`,
  `content/`, `lib/`, `components/`.
- Backend: Portal/Commerce ya con `status`+`isPublished`+endpoints
  publish/unpublish (de una pasada anterior de `dashboard-web`).
  Category/Service/FormDefinition/FormVersion/FormField/FormSubmission ya
  modelados correctamente (incluida la restricción real de "máximo una
  versión de formulario publicada", vía índice único parcial). **Cero**
  rutas `@Public()` salvo `/health` y `GET /portals/:id/logo`. **Cero**
  contrato de paginación en todo el monorepo.
- Documentación: sin `PORTAL_WEB_SOURCE_OF_TRUTH.md`, sin regla en
  `CLAUDE.md` para esta app.

## 3. Arquitectura implementada

Ver `PORTAL_WEB_SOURCE_OF_TRUTH.md` §4 "Architecture Map" (autoridad
vigente, no se repite aquí).

## 4. Archivos/carpetas creados

Backend:
- `apps/api/src/modules/public-catalog/` (`public-catalog.module.ts`,
  `public-catalog.controller.ts`, `public-catalog.service.ts`,
  `dto/public-portals-query.dto.ts`, `dto/public-commerces-query.dto.ts`)
- `apps/api/test/public-catalog.e2e-spec.ts`
- `packages/contracts/src/pagination.ts` (+ `.test.ts`)
- `packages/contracts/src/public-catalog.ts` (+ `.test.ts`)

Frontend (`apps/portal-web/src/`):
- `content/es/{common,navigation,home,faq,errors,portal}.ts`
- `lib/api/{config,errors,server,client}.ts`
- `components/layout/PublicHeader.tsx`
- `components/ui/{icons.tsx,Pagination.tsx,Pagination.test.tsx}`
- `features/search/components/{SearchInput,SearchInput.test,PortalSearchForm,GlobalCommerceSearch}.tsx`
- `features/portal-directory/{api.ts,components/{PortalDirectory,PortalCard,PortalCard.test}.tsx}`
- `features/faq/components/{Faq,Faq.test}.tsx`
- `features/support/components/SupportTrust.tsx`
- `app/portales/[portalId]/page.tsx`
- `app/mis-pagos/page.tsx`

E2E: `apps/portal-web/e2e/fixtures.ts` (nuevo — crea fixtures reales vía
la API real, sin admin UI propia en esta app).

Docs: `docs/frontend/PORTAL_WEB_SOURCE_OF_TRUTH.md`,
`docs/frontend/PORTAL_WEB_IMPLEMENTATION_REPORT.md` (este documento).

## 5. Archivos/carpetas modificados

- `apps/api/src/app.module.ts` — registra `PublicCatalogModule`.
- `packages/contracts/src/index.ts` — exporta `pagination`/`public-catalog`.
- `apps/portal-web/src/app/{layout.tsx,page.tsx,globals.css}` — Home real
  reemplaza el scaffold.
- `apps/portal-web/e2e/home.spec.ts` — reemplaza el test trivial del
  scaffold por E2E real.
- `CLAUDE.md` — nueva regla apuntando a la SoT de portal-web.
- `docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md` — una corrección menor no
  relacionada (fila de la matriz de auditoría §17.5 sobre traducción de
  409 a UX, que ya estaba resuelta en código pero no reflejada en la
  doc — ver el historial de esa sección).

## 6. Archivos eliminados

- `apps/portal-web/src/app/page.test.tsx` (probaba el scaffold "Portal
  Visionamos"/"Comenzar", ya no existe ese contenido).

## 7. Features implementadas

Ver `PORTAL_WEB_SOURCE_OF_TRUTH.md` §6 "Feature Registry".

## 8. Endpoints utilizados

`GET /public/portals`, `GET /public/portals/:id`, `GET /public/commerces`
— los tres nuevos de esta pasada. Ninguno preexistente reutilizado salvo
`GET /portals/:id/logo` (indirectamente, vía `logoUrl`).

## 9. Backend gaps encontrados

- **Ninguna API pública anónima** — cerrado (§4 arriba).
- **Ningún contrato de paginación/búsqueda en el monorepo** — cerrado
  (`pagination.ts`).
- **Slugs SEO-friendly** — identificado, diferido (SoT §23/§27 Decision
  Log) — rutas por `id` (UUID) por ahora.
- **Logo de Comercio** — no existe columna — identificado, diferido (SoT
  §23) — ninguna de las 3 referencias visuales lo requería.
- **Endpoint público de `FormVersion` publicada** — no existe — el modelo
  backend ya está listo (§11 de la SoT), solo falta el controller/service
  del lado público — Slice 6.

## 10. Backend changes realizados

Nuevo módulo `PublicCatalogModule` (controller+service+2 DTOs), registrado
en `AppModule`. Ningún cambio a entidades/migraciones — todo lo necesario
(`status`,`isPublished`) ya existía.

## 11. Contracts modificados

`packages/contracts/src/index.ts` gana los exports de `pagination.ts` y
`public-catalog.ts` (ambos archivos nuevos, no modificaciones a contratos
existentes).

## 12. Arquitectura de Search

Ver SoT §7.

## 13. Arquitectura de Dynamic Forms

No implementada. Ver SoT §11.

## 14. Arquitectura de imágenes

Ver SoT §10. Reutiliza 1:1 el logo de Portal ya construido para
`dashboard-web` — cero infraestructura nueva de imágenes.

## 15. Publicación Dashboard → Portal

Verificada de punta a punta con test de integración real (crear portal en
Dashboard vía API → publicar → aparece en `/public/portals`; desactivar →
desaparece) y con Playwright E2E real (publicar un portal/comercio vía la
API real → aparece en el Home real de `portal-web`).

## 16. Textos

Ver SoT §8.

## 17. Design tokens

Ver SoT §9.

## 18. SEO

`generateMetadata()` real en `app/portales/[portalId]/page.tsx` (título y
descripción del portal real, o el placeholder honesto si no existe/no está
publicado). Metadata estática en `layout.tsx` (Home hereda) y en
`mis-pagos/page.tsx`. Sin `sitemap.ts`/`robots.ts` todavía — no
implementado, no evaluado a fondo en esta pasada (alcance de una futura
sesión, cuando existan más rutas públicas que listar).

## 19. Seguridad

Ver SoT §19. Sin hallazgos de seguridad nuevos que reportar más allá de lo
ya documentado ahí (todo el diseño de la API pública partió considerando
BOLA/excessive-exposure/rate-limiting/input-validation desde el principio,
no como una revisión posterior).

## 20. Responsive

Verificado manualmente a 1440px (captura real, SoT §5). Un bug real
encontrado y corregido en el camino: `PublicHeader` ocultaba la navegación
completa por debajo de `md` sin ninguna alternativa (`hidden md:flex` sin
menú) — corregido a `flex-wrap` (nunca oculta, nunca requiere un
componente de menú nuevo). No se verificó a 768px/390px con captura real
en esta pasada — pendiente real, no bloqueante (el layout usa Tailwind
responsive utilities consistentemente, pero "debería funcionar" no es lo
mismo que "verificado").

## 21. Accessibility

`SearchInput`/`PortalSearchForm`/`GlobalCommerceSearch`: `<form onSubmit>`
real (nunca `div`+`onClick`), label accesible, Enter envía. `Faq`: botón
nativo `aria-expanded`/`aria-controls`, Enter/Space funcionan gratis por
ser un `<button>` real — verificado con test real (`user.keyboard('{Enter}')`).
`Pagination`: `aria-current="page"`, `aria-label` por enlace. Sin auditoría
de contraste de color formal (ninguna herramienta corrida) — no se afirma
cumplimiento WCAG completo, solo lo verificado arriba.

## 22. Performance

Ver SoT §20. Sin métricas Lighthouse/Web Vitals tomadas — no se inventan.

## 23. Tests

- `packages/contracts`: 72/72 (incluye 20 tests nuevos de
  `pagination.ts`/`public-catalog.ts`).
- `apps/api`: unit 46/46 (sin cambios), integración 98/98 (85 previos + 13
  nuevos de `public-catalog.e2e-spec.ts`).
- `apps/portal-web`: unit 17/17 (nuevos — el scaffold no tenía tests
  reales de componentes).

## 24. E2E ejecutados

`apps/portal-web/e2e/home.spec.ts`: **10/10 verde**, contra `apps/api` +
PostgreSQL reales (`pnpm --filter api start:dev`, sin mocks), usando
`createPublishedFixture()` para crear/publicar Portal+Category+Commerce
reales y únicos por test vía la API real (login real como el
`e2e-superadmin` ya sembrado). Cubre: layout/header, hero+directorio+
soporte+FAQ, acordeón FAQ (click y teclado), "Mis Pagos" → placeholder,
portal recién publicado aparece en el directorio, búsqueda de portal con y
sin resultados, click en card navega al detalle real, portal inexistente
404, búsqueda global de comercio con y sin resultados, resultado de
comercio enlaza al portal correcto.

## 25. Visual regression

**No implementada** (SoT §21/§24) — verificación visual de esta pasada fue
una captura real manual (1440px) comparada contra las 3 referencias, no
`toHaveScreenshot()` con baseline. `dashboard-web` sí tiene esa
infraestructura (`e2e/visual.spec.ts`) — replicarla para `portal-web` es
trabajo real, no hecho aquí.

## 26. Pendientes

Ver SoT §23 "Known Limitations" y §24 "Deferred Features" — no se repiten
aquí para evitar que las dos listas diverjan con el tiempo (la SoT es la
autoridad; este documento es un snapshot de esta pasada).

## 27. Cómo continuar desarrollando

Ver SoT §28 "Where do I change...?" y §29 "How to extend the Portal". El
siguiente slice natural es el 3 completo (categorías + grid de comercios
dentro de `/portales/[portalId]`) — el backend público (`/public/commerces`
con `portalId`/`categoryId`) ya está listo para eso, ningún cambio de
backend adicional debería hacer falta.

## 28. Final Architecture Diagram

```
DASHBOARD WEB
      │ administra (Portal/Commerce/Category/Service — ya existente)
      ▼
NESTJS API
      │
      ├── PortalsController / CommercesController / ...   (admin, @Roles)
      └── PublicCatalogController                          (público, @Public — NUEVO)
             ├── GET /public/portals
             ├── GET /public/portals/:id
             └── GET /public/commerces
      │
      ▼
POSTGRESQL (status + isPublished ya existentes)
      │ proyección pública (PublicPortal/PublicCommerce — NUEVO)
      ▼
PORTAL WEB
      ├── Home                    ✅
      ├── Search (portal+comercio) ✅
      ├── Portal detail (mínimo)   🟡
      ├── Categories               ❌ (Slice 4)
      ├── Commerce detail          ❌ (Slice 5)
      ├── Services                 ❌ (Slice 5)
      ├── Dynamic Form             ❌ (Slice 6 — backend listo, falta endpoint público)
      └── Payment Flow             ❌ (Slice 8 — decisiones de negocio abiertas)
```

## 29. Reporte final compacto

```
SOURCE OF TRUTH:        CREATED
IMPLEMENTATION REPORT:  CREATED
PORTAL-WEB (Foundation+Home): PASS
PUBLIC API:              PASS
SEARCH:                  PASS
IMAGES:                  PASS (reutilizado; logo de Comercio DEFERRED)
DYNAMIC FORMS:           NOT APPLICABLE (no construido esta pasada — Slice 6)
DASHBOARD → PORTAL:      PASS
SEO:                     PARTIAL (generateMetadata real; sin sitemap/robots)
SECURITY:                PASS (dentro del alcance de esta pasada)
RESPONSIVE:              PARTIAL (verificado desktop real; mobile no verificado con captura)
ACCESSIBILITY:           PARTIAL (formularios/acordeón verificados; sin auditoría de contraste)

UNIT (contracts):        72/72
UNIT (api):               46/46
UNIT (portal-web):        17/17
INTEGRATION (api):        98/98
E2E (portal-web):         10/10
VISUAL:                   NOT IMPLEMENTED

TYPECHECK: PASS (contracts, api, portal-web)
LINT:      PASS (contracts, api, portal-web)
BUILD:     PASS (contracts, api, portal-web)

P0: 0
P1: 0 (dentro de Foundation+Home)
DEFERRED: Slices 3(parcial)–8 completos, slugs, logo de comercio, visual
          regression automatizada, sitemap/robots, auditoría de contraste,
          verificación responsive con captura mobile/tablet — ver SoT §23/§24.
```
