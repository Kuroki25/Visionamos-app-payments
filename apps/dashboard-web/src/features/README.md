# `src/features`

Vertical, domain-owned slices — not a global `components/services/hooks/types`
split. Empty right now; no feature has been built yet (no UI has been
designed — `docs/frontend/DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md`, "Prohibiciones
vigentes"). Each feature grows only the subfolders it actually needs — do
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
cross-cutting `types`. Nothing outside a feature imports *into* it
(`docs/frontend/DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md`, "Reglas de dependencias").
