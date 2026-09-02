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
feature does NOT import another feature or `components/layout` (that's
cross-page chrome, see that folder's own README) —
`docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md`, §5 "Reglas de
dependencias". Anything ≥2 pages need identically (a component, a
`Transaction`→view-model mapping, static reference data) belongs in
`components/ui` or `lib/` instead — see those folders' own READMEs
(`lib/transactions.ts`, `lib/metrics.ts`, `components/ui/TxTable.tsx`,
`components/ui/StatCard.tsx` are exactly that: promoted out of a feature
once a second page needed them).

Existing slices (built against Claude Design's "RedCoop Dashboard.dc.html" —
see `docs/frontend/design-handoff/DASHBOARD_INICIO_HANDOFF_ANALYSIS.md`):

- `dashboard-overview/` — the Inicio screen's own cards: the flow chart
  and the monthly-goal gauge (both Inicio-only in the design) plus the
  page's "Últimas transacciones" card wrapper. The chart/goal data is
  static for now — no aggregate backend endpoint exists yet; see
  `dashboard-overview/api/get-overview-metrics.ts`'s docblock.
