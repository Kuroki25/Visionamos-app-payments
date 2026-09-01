<!--
Fase 8 — Performance, baseline antes/después (PROMPT MAESTRO §28). Ejecutado
2026-09-01 contra el Postgres real de desarrollo del usuario, cerrando la
pregunta que ADR 013 dejó explícitamente pendiente ("Consecuencia a decidir
en Fase 4/8"): ¿cuánto cuesta la consulta extra por request que introduce
`BetterAuthSessionGuard`?
-->

# Fase 8 — Baseline de performance: `JwtAuthGuard` vs. `BetterAuthSessionGuard`

## Qué se midió y cómo

`apps/api/test/better-auth/performance-baseline.ts` (nuevo,
`pnpm perf:auth-cutover-rehearsal`) — mide la misma ruta
(`GET /api/v1/auth/me`), la misma cuenta real (`superadmin@example.com`,
`seed-demo.ts`), contra el mismo Postgres real, con las dos configuraciones
de guard una tras otra en el mismo proceso:

1. **`JwtAuthGuard`** (`AppModule` real, sin cambios) — login real vía
   `POST /api/v1/auth/login` (cookie `access_token`, JWT verificado solo por
   firma, cero lecturas a BD por request).
2. **`BetterAuthSessionGuard`** (`RehearsalAppModule`, Fase 7) — login real
   vía `auth.api.signInEmail`, dos lecturas a BD por request
   (`users` + `role_assignments`, además de lo que Better Auth mismo lee
   para resolver la sesión).

Metodología: 10 requests de *warm-up* descartadas (JIT/pool de conexiones)
+ 50 requests medidas por escenario (`process.hrtime.bigint()` alrededor de
cada request), con un agente HTTP persistente (keep-alive) para no medir
overhead de conexión TCP. El número de iteraciones se ajustó a 50+10 (no
200+20, el diseño original) porque **el propio rate limit de la API**
(`THROTTLE_LIMIT=100/60s`, `env.schema.ts`) devolvió un 429 real a mitad de
la primera corrida — evidencia real, no un límite inventado para este
documento; cada escenario arranca su propia instancia de app (su propio
contador de `ThrottlerGuard` en memoria), así que 60 requests totales por
escenario queda cómodamente por debajo del límite sin tener que
sobreescribir la config real de throttling para esta medición.

## Resultados reales (todas las corridas, ninguna descartada)

| Corrida | Guard | mean | p50 | p95 | p99 | min | max |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 | `JwtAuthGuard` | 6.95ms | 7.16ms | 8.39ms | 9.69ms | 4.53ms | 9.69ms |
| 1 | `BetterAuthSessionGuard` | 9.42ms | 9.22ms | 11.09ms | 15.40ms | 7.78ms | 15.40ms |
| 1 | **Delta (mean)** | **+2.47ms (+35.6%)** | | | | | |
| 2 | `JwtAuthGuard` | 6.05ms | 5.95ms | 7.91ms | 8.12ms | 4.83ms | 8.12ms |
| 2 | `BetterAuthSessionGuard` | 9.24ms | 8.86ms | 11.09ms | 16.74ms | 7.92ms | 16.74ms |
| 2 | **Delta (mean)** | **+3.18ms (+52.6%)** | | | | | |

Una tercera corrida previa (antes de ajustar el número de iteraciones por
el 429, solo el tramo de `BetterAuthSessionGuard` alcanzó a completarse) dio
`mean=9.07ms` — consistente con las dos corridas completas de arriba
(9.42ms, 9.24ms). Tres mediciones independientes de
`BetterAuthSessionGuard` en el rango 9.07-9.42ms confirman que el número no
es ruido de una sola corrida aislada; `JwtAuthGuard` varía algo más entre
corridas (6.05-6.95ms) — esperable dado lo pequeño de su costo base.

## Lectura del resultado

- El costo real es de **~2.5-3.2ms por request autenticado**, no de decenas
  de milisegundos — dos lecturas indexadas por PK (`users.id`,
  `role_assignments.user_id`) contra un Postgres local son baratas.
- En términos relativos es un salto notable (~35-53%) porque la base
  (`JwtAuthGuard`) es deliberadamente casi gratis (verificar una firma,
  nada de I/O) — el punto de comparación correcto no es "¿es rápido?" sino
  "¿vale la pena pagar esto por corregir AUTH-01 (revocación inmediata,
  Fase 7 caso #11) de raíz?".
- Medido contra Postgres **local** (mismo host que la API, sin latencia de
  red real) — en un despliegue con la base de datos en un host de red
  distinto, el costo absoluto de las dos lecturas adicionales sería mayor
  (dominado por round-trip de red, no por el trabajo del propio Postgres).
  Este baseline no reemplaza medir contra la topología real de producción
  cuando exista — es la comparación correcta para decidir *ahora*, con lo
  que hay disponible.

## Decisión

**El trade-off se acepta tal como está diseñado** (ADR 013, sesión
server-side en vez de JWT stateless) — ~2.5-3.2ms por request autenticado
es un costo aceptable a cambio de cerrar AUTH-01 (Fase 1) sin ninguna
ventana de staleness, verificado con datos reales, no una estimación. No se identificó
ninguna razón para reconsiderar la decisión de arquitectura de Fase 3 a
partir de este número.

**No optimizado en esta fase** (no era el objetivo — medir, no optimizar
prematuramente): cachear el resultado de `role_assignments` por sesión
(p. ej. en el `cookieCache` que Better Auth ya soporta,
`docs/adr/013-better-auth-migration.md`) es una optimización disponible si
en el futuro este costo importa a una escala mayor — se deja anotada, no
implementada, porque el número medido no la justifica todavía.

---

## GATE 8

| Pregunta | Respuesta con evidencia |
|---|---|
| ¿Se midió el costo real, no estimado? | Sí — `perf:auth-cutover-rehearsal`, contra Postgres real, misma cuenta, misma ruta |
| ¿Cuánto cuesta? | ~2.5-3.2ms de media por request autenticado (~35-53% relativo sobre una base ya casi gratis, dos corridas completas) |
| ¿Es aceptable? | Sí, decisión tomada con el número real en mano, no antes |
| ¿Queda algo pendiente de medir? | Sí, contra una topología de red real (BD en host distinto) cuando exista ese despliegue — no bloqueante ahora |

### GATE 8: **PASS**

La pregunta que ADR 013 dejó explícitamente abierta ("Consecuencia a
decidir en Fase 4/8") queda cerrada con evidencia real. Fase 9 (calidad:
lint/typecheck/test/build) ya viene demostrada de facto en cada fase
anterior de esta sesión (cada fase corrió los cuatro comandos en verde) —
Fase 10 (cutover controlado) es la única fase de implementación real que
falta.
