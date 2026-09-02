# Dashboard Web — Source of Truth

Autoridad técnica y arquitectónica permanente para `apps/dashboard-web`
(panel administrativo de Red Coopagos). Creado en la Fase 0 de preparación
arquitectónica previa al handoff visual de Claude Design (2026-09-01).

Este documento cubre **arquitectura, contratos y organización** — no
diseño visual. Ningún componente de UI, color, sidebar, card, tabla o
navegación ha sido inventado aquí. Ver "Contrato de handoff con Claude
Design" para cómo encaja lo visual.

## 1. Propósito

`dashboard-web` es el frontend administrativo de Red Coopagos: gestión de
usuarios, portales, comercios, formularios y transacciones. Es un
**cliente** de `apps/api` (NestJS) — nunca un segundo backend, nunca una
segunda fuente de autenticación.

## 2. Estado y versiones verificadas (2026-09-01)

Confirmado contra `package.json`/`pnpm-workspace.yaml` reales, no supuesto:

| Pieza | Versión |
|---|---|
| Next.js | 16.3.3 (App Router) |
| React | 19.2.8 |
| TypeScript | 6.0.3 (`strict`, `exactOptionalPropertyTypes: true`) |
| Tailwind CSS | 4.3.3 (CSS-based config, sin `tailwind.config.js`) |
| Zod | 4.4.3 |
| better-auth | 1.7.2 (idéntico al de `apps/api`) |
| Vitest / Testing Library | 4.1.11 / 16.3.3 |
| Playwright | 1.62.1 |
| pnpm / Turborepo | 11.24.0 / 2.10.12 |

`middleware.ts` está **deprecado** en esta versión de Next.js; el
convenio vigente es `proxy.ts` con `export function proxy()` (confirmado
contra `nextjs.org/docs/app/api-reference/file-conventions/proxy`, no
asumido). No existe `proxy.ts` en el repo todavía — ver sección 7.

## 3. Contradicción documental conocida — NO seguir

`docs/architecture/CURRENT_ARCHITECTURE.md`, `DEPENDENCY_RULES.md` y
`TARGET_ARCHITECTURE.md` están **obsoletos** (fechados 2026-08-23, antes de
la implementación real): nombran apps inexistentes (`apps/admin`,
`apps/web`), un puerto incorrecto (3002) y decisiones sin resolver
(Prisma vs TypeORM, JWT vs Better Auth) que ya se resolvieron distinto
(TypeORM, Better Auth). `globals.css` referencia `docs/ARCHITECTURE.md`,
que no existe en esa ruta — probablemente renombrado sin actualizar el
comentario. Este documento (`DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md`) es la
autoridad vigente para todo lo que toque a `dashboard-web`.

## 4. Reglas de dependencias

```
app (rutas) → features → infraestructura compartida (lib/, components/, content/)
```

- `features/*` puede importar `lib/api`, `lib/auth`, `components/ui`,
  `content`, tipos cross-cutting de `types/`.
- `lib/api` y `lib/auth` NO importan de `features/*` ni de `components/*`.
- `components/ui` NO importa de `features/*`.
- `content/*` no depende de componentes.
- Nada fuera de una feature importa hacia dentro de ella.
- Sin ciclos. Sin imports relativos profundos (`../../../../lib/api`) — usar
  el alias `@/*` ya configurado en `tsconfig.json`.
- Reglas de import entre paquetes del monorepo (`@repo/ui`, `@repo/contracts`,
  no importar `src` de otra app) ya están impuestas por
  `packages/eslint-config/base.js`/`next.js` — no se ha modificado nada ahí.

## 5. Estructura de directorios

```
src/
  app/                    # App Router — páginas y layouts reales
  features/                # slices verticales por dominio (vacío hoy — ver README.md)
  components/
    ui/                     # boundary hacia @repo/ui (vacío — no duplicar @repo/ui)
    layout/                 # AppShell/Sidebar/Header (vacío hasta Claude Design)
  lib/
    api/
      config.ts               # NEXT_PUBLIC_API_URL / NEXT_PUBLIC_BETTER_AUTH_URL
      client.ts                # cliente HTTP para Client Components (credentials: include)
      server.ts                 # cliente HTTP para Server Components (server-only, cookie forwarding)
      errors.ts                  # ApiError, mapeado 1:1 a ProblemDetails real del backend
    auth/
      client.ts                  # createAuthClient (better-auth/react) — único punto de config
      session.server.ts           # getCurrentUser() vía GET /auth/me (server-only)
  content/
    es/                       # textos estáticos centralizados
  types/                     # SOLO tipos cross-cutting (vacío — ver README.md)
  env.ts                    # única lectura de process.env de esta app
```

Grupos de rutas `(auth)`/`(dashboard)`: **DEFER** — documentados en la
sección 8, no creados todavía (crear un `layout.tsx` de `(dashboard)` vacío
ya empezaría a decidir estructura visual sin páginas reales que lo
justifiquen). Se crean cuando exista la primera página real de login o del
dashboard.

## 6. Server vs Client Components

Server Components por defecto. `'use client'` solo donde hay interactividad
o hooks de navegador reales (`useSession`, formularios, `onClick`, etc.) —
nunca en layouts/páginas por conveniencia. El único archivo con `'use
client'` hoy es `lib/auth/client.ts` (necesario: envuelve estado de React vía
`better-auth/react`).

## 7. Autenticación

**Better Auth vive exclusivamente en NestJS.** Este frontend es un cliente,
no una segunda instancia. Confirmado contra el código real de
`apps/api/src/infra/better-auth/`:

- Handler nativo montado en `/api/auth/*` (basePath por defecto, sin
  cambios) — `mount-better-auth-handler.ts`.
- `GET /api/v1/auth/me` devuelve el `User` de dominio (`@repo/contracts`),
  con `role`/`scopeType`/`scopePortalId`/`scopeCommerceId` — Better Auth por
  sí solo NO conoce esto (vive en `role_assignments`,
  `better-auth-session.guard.ts`).
- CORS ya permite `http://localhost:3101` con `credentials: true`
  (`configure-app.ts`); `trustedOrigins` de Better Auth también lo incluye
  (`better-auth.factory.ts`). **No se necesitó ningún cambio de backend.**
- Cookie de sesión: `better-auth.session_token` (prefijo `better-auth`,
  verificado en `node_modules/better-auth/dist/cookies/index.mjs`),
  HttpOnly, SameSite=Lax, scoped al origen del backend (4100).

**Dos puntos de verdad, cada uno con su propósito:**

| | `lib/auth/client.ts` | `lib/auth/session.server.ts` |
|---|---|---|
| Dónde | Client Components | Server Components |
| Qué usa | `better-auth/react` `useSession()` | `GET /auth/me` vía `lib/api/server.ts` |
| Qué sabe | Identidad Better Auth (sin rol/scope) | `User` completo con rol/scope |
| Para qué | UX reactiva (¿hay sesión?) | Decisión de render en servidor, autorización de UX |

Ninguno de los dos es la autorización real — eso vive 100% en NestJS
(`BetterAuthSessionGuard`, `RolesGuard`, `ScopeAuthorizationService`).
Ocultar un botón por falta de `capability` es UX, no seguridad.

## 8. `proxy.ts` — cuándo y cómo

No existe todavía (**DEFER**) — no hay rutas protegidas reales que
justifiquen redirecciones optimistas hoy. Cuando se cree:

- Nombre de archivo y de función: `proxy.ts` / `export function proxy()`
  (no `middleware.ts`/`middleware()`, deprecado en Next 16).
- Uso permitido: redirección optimista (p. ej. sin cookie de sesión →
  `/login`) — nunca autorización real. Next.js mismo recomienda evitarlo
  salvo necesidad real ("avoid relying on Middleware/Proxy unless no other
  options exist").
- Toda decisión de rol/scope se re-verifica en el Server Component/página
  vía `getCurrentUser()`, nunca se confía solo en `proxy.ts`.

## 9. Integración con la API

Dos clientes, nunca `fetch` suelto en componentes:

- **`lib/api/client.ts`** (browser): `credentials: 'include'` en cada
  request — necesario porque el backend está en otro origen (3101 → 4100).
- **`lib/api/server.ts`** (`import 'server-only'`): reenvía únicamente las
  cookies con prefijo `better-auth` (no todas las cookies del navegador
  indiscriminadamente), vía `next/headers`. Cachea `no-store` por defecto
  — ver sección 12.

Ambos devuelven JSON tipado y traducen cualquier respuesta no-2xx a
`ApiError` (sección 11). Ningún feature parsea `Response` directamente.

Sin BFF: no se duplican endpoints de Nest como Route Handlers de Next. Si
en el futuro aparece una necesidad real de agregación server-side, se
evalúa entonces — no se introduce preventivamente.

## 10. Tipos y contratos

`@repo/contracts` ya cumple el rol de capa de tipos generados/compartida:
expone `User`, `Role`, `ScopeType`, `Portal`, `Commerce`, `Transaction`,
`FormDefinition`, `AuditEvent`, `ProblemDetails`, etc. con sus schemas Zod,
consumidos igual por `apps/api` y por este frontend. **No se implementa un
pipeline de generación OpenAPI→TS aparte** — sería duplicar lo que este
paquete ya resuelve.

- `src/types/` — solo tipos cross-cutting sin dueño natural (vacío hoy).
- Tipos de feature viven junto a la feature (`features/x/types.ts`).
- API DTO (`@repo/contracts`) ≠ View Model ≠ Form Values ≠ Component
  Props — no colapsar en un tipo gigante aunque hoy parezcan iguales.

## 11. Manejo de errores

`lib/api/errors.ts` define `ApiError`, construido 1:1 desde el
`ProblemDetails` real que emite `AllExceptionsFilter`
(RFC 9457 `application/problem+json`) — mismo `ProblemDetailsSchema` de
`@repo/contracts`, no un shape inventado.

- `error.isUnauthenticated` (401) → disparar reautenticación/login.
- `error.isForbidden` (403) → estado "sin permisos", nunca redirigir a
  login. **401 y 403 nunca se tratan igual.**
- `error.fieldErrors` → errores de validación por campo (400/422).
- Nunca se muestra al usuario: stack traces, SQL, objetos internos de Nest.
  Solo `detail` (ya saneado por el backend) o un mensaje de
  `content/es/auth.ts` para casos genéricos.
- `NetworkError` — fallo de red/timeout, distinto de un `ApiError` (nunca
  hubo respuesta que parsear).

## 12. Variables de entorno

`src/env.ts` es la única lectura de `process.env` de esta app, validada con
Zod:

- `NEXT_PUBLIC_API_URL` — API de negocio (`/api/v1`).
- `NEXT_PUBLIC_BETTER_AUTH_URL` — origen raíz del backend para Better Auth
  (`/api/auth`, fuera del prefijo `api/v1` — no se deriva de
  `NEXT_PUBLIC_API_URL`, son paths distintos en el mismo host).

Ambas están en `turbo.json` → `globalEnv` para que el build cachee
correctamente cuando cambian. Ningún secreto de Better Auth, credencial de
base de datos ni clave privada se expone vía `NEXT_PUBLIC_*` — esta app no
tiene ninguno hoy; si algún día necesita una variable server-only, se crea
un módulo de env separado, nunca se añade a este archivo.

## 13. Cachés

Datos autenticados/administrativos son user-scoped por definición —
`lib/api/server.ts` usa `cache: 'no-store'` por defecto. Cachear solo
cuando se demuestre que un dato es realmente público y no user-scoped, de
forma explícita por request, nunca por default global.

## 14. Textos y contenido (`content/`)

`src/content/es/*.ts` centraliza copy estático (títulos, botones, mensajes
genéricos) — nunca nombres/datos que vienen del backend. Sin librería de
i18n todavía (`next-intl`/`i18next` deliberadamente NO añadidas) — pero la
carpeta ya está organizada por locale (`es/`) para que una futura migración
sea mover archivos, no reescribir la app.

Contenido creado hoy es deliberadamente mínimo: solo el texto que ya existía
en el scaffold (`common.ts`) y los mensajes que la infraestructura de
errores/sesión ya referencia (`auth.ts`). Nada de copy de pantallas que
todavía no existen.

## 15. Estrategia de diseño / tokens

Sin valores inventados. `packages/ui` usa colores Tailwind hardcodeados
hoy (no tokens semánticos) — no se ha tocado, porque no hay diseño
aprobado que dicte los valores reales todavía. Cuando llegue el handoff de
Claude Design, los tokens semánticos (`background`, `foreground`,
`primary`, `destructive`, etc.) se definen a partir de esos valores reales,
vía la estrategia de Tailwind v4 (CSS-based, `@theme`), no copiando
configuración de Tailwind v3.

## 16. Contrato de handoff con Claude Design

1. Claude Design es la autoridad **visual**. Este documento es la
   autoridad **técnica**. No compiten.
2. El diseño se adapta a esta arquitectura — esta arquitectura no se
   destruye para copiar un prototipo.
3. Los componentes existentes (`@repo/ui`, y los que se creen en
   `components/ui`/`components/layout`) se reutilizan, no se reescriben
   desde cero por cada pantalla.
4. Los tokens semánticos que se definan se respetan — no se vuelve a
   `bg-[#hex]` hardcodeado por repetición real.
5. Ninguna funcionalidad ya construida (auth, autorización de UX, manejo
   de errores, fetch de datos) se pierde al aplicar el diseño nuevo:
   "UI nueva + arquitectura actual + funcionalidad", nunca "UI nueva −
   funcionalidad".
6. Better Auth no se reemplaza ni se duplica.
7. La API de NestJS no se duplica con Route Handlers de Next.
8. Cada pantalla que llegue del handoff se valida visual **y**
   funcionalmente antes de darse por terminada.

## 17. Seguridad (OWASP Top 10 2025 / API Security Top 10 2023)

- Ninguna autorización depende solo de la UI — NestJS re-verifica siempre.
- Sesión nunca en `localStorage`/`sessionStorage` — cookie HttpOnly
  gestionada por Better Auth.
- Sin `dangerouslySetInnerHTML` en el código creado hoy.
- `next.config.ts` no se ha tocado — cualquier header de seguridad futuro
  (CSP, frame protection) se audita contra su config real antes de
  añadirse, no se copia genéricamente.
- Errores de backend nunca se exponen crudos (sección 11).
- `server-only` (paquete oficial, cero código en runtime, solo lanza si se
  importa desde un bundle de cliente) previene que `lib/api/server.ts` o
  `lib/auth/session.server.ts` terminen en el bundle del navegador — es la
  única dependencia nueva añadida por esta razón, evaluada y justificada.

## 18. Testing

Aprovecha lo ya instalado — no se introdujo ninguna herramienta nueva:

- **Unit**: Vitest — `lib/api/errors.test.ts` cubre el mapeo real de
  `ProblemDetails` → `ApiError` (401/403/400/fallback).
- **Component**: Testing Library — ya usado en `page.test.tsx`.
- **E2E**: Playwright (`e2e/`) — smoke test existente sigue pasando;
  escenarios de login/redirección protegida/401/403/logout se añaden
  cuando existan páginas reales de auth/dashboard.

## 19. Prohibiciones vigentes (hasta el handoff de Claude Design)

No diseñar el dashboard. No inventar sidebar, cards, tablas, navegación,
colores. No crear una segunda instancia de Better Auth. No duplicar la API
de NestJS. No añadir librerías (i18n, state management, forms) sin
necesidad demostrada. No seguir `docs/architecture/*.md` (sección 3).

## 20. Definition of Done — Fase 0/preparación

- [x] `dashboard-web` auditado contra el código real, no supuesto.
- [x] Versiones exactas confirmadas.
- [x] Este documento creado.
- [x] `CLAUDE.md` apunta aquí.
- [x] Estrategia de Better Auth frontend definida e implementada
      (`lib/auth/*`).
- [x] Estrategia de integración con la API definida e implementada
      (`lib/api/*`).
- [x] Estrategia de tipos definida (`@repo/contracts` + boundary en
      `types/`).
- [x] Arquitectura de contenido definida e implementada (`content/es/*`).
- [x] Manejo de errores definido e implementado (`ApiError`).
- [x] Boundaries Server/Client definidos.
- [x] Estructura preparada para Claude Design (`components/ui`,
      `components/layout`, tokens — sin valores inventados).
- [x] Ningún UI ha sido diseñado.
- [x] `pnpm lint` pasa (monorepo completo).
- [x] `pnpm typecheck` pasa (monorepo completo).
- [x] `pnpm test:unit` pasa (monorepo completo, 99 tests: api 40,
      contracts 49, ui 4, portal-web 1, dashboard-web 5).
- [x] `pnpm --filter dashboard-web build` pasa.
