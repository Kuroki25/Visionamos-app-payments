# `src/types`

Cross-cutting types only — types genuinely shared across multiple features
with no natural owner (e.g. shared UI primitive prop shapes, generic utility
types). This is deliberately empty right now.

**Not for:**
- API DTOs — those come from `@repo/contracts` (already the shared,
  Zod-validated contract layer between `apps/api` and every frontend app).
- Feature-specific types — they live next to the feature that owns them
  (`features/<name>/types.ts`), not here.
- One giant type per screen. Separate API DTO ≠ Domain/View Model ≠ Form
  Values ≠ Component Props, even when a feature is small enough that they
  currently look identical.

See `docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md`, §8.3 "Contratos".
