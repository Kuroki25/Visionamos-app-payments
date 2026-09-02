# `src/features`

Vertical, domain-owned slices — not a global `components/services/hooks/types`
split. Each feature grows only the subfolders it actually needs — do
not force all of these for a two-file feature:

```
features/
  users/
    api/          # calls into lib/api/{client,server}.ts, scoped to this feature's endpoints
    components/   # feature-specific components, not generic primitives
    schemas/      # Zod schemas for this feature's forms/inputs
    types/        # view models / form values specific to this feature
    utils/
```

A feature may import `lib/api`, `lib/auth`, `components/ui`, `content`, and
cross-cutting `types`. Nothing outside a feature imports *into* it, and a
feature does NOT import `components/layout` (that's cross-page chrome, see
that folder's own README) — `docs/frontend/DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md`,
"Reglas de dependencias".

Existing slices (built against Claude Design's "RedCoop Dashboard.dc.html" —
see `docs/frontend/design-handoff/DASHBOARD_INICIO_HANDOFF_ANALYSIS.md`):

- `dashboard-overview/` — the Inicio screen's cards (stat cards, flow
  chart, monthly-goal gauge, recent-transactions card). The stat/chart/goal
  data is static for now — no aggregate backend endpoint exists yet; see
  `dashboard-overview/api/get-overview-metrics.ts`'s docblock.
- `transactions/` — `TxTable` and the `Transaction` → view-model mapping,
  shared by Inicio today and by the (not yet built) Transacciones/
  Aliado-detail pages later, matching how the design itself reuses one
  `TxTable` sub-component across all three.
