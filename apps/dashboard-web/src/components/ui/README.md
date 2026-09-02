# `src/components/ui`

Reusable visual primitives that are genuinely app-specific and not (yet)
promoted to `@repo/ui` — that package still ships Tailwind-hardcoded
colors, not this app's design tokens (`@theme` in `app/globals.css`), so a
few RedCoop-specific tiles live here instead of being duplicated per
feature. `@repo/ui`'s own primitives (`Button`, `Input`, `Badge`, `Card`,
`Alert`) are still imported straight from there — this folder is not a
duplicate of that package.

- `StatCard` / `StatCardsRow` / `stat-icons.tsx` — the 3 metric tiles
  reused as-is on Inicio and Transacciones (`lib/metrics.ts` holds their
  static data).
- `TxTable` — the transaction table reused by Inicio, Transacciones, and
  (later) Aliado detail (`lib/transactions.ts` holds the `Transaction` →
  row mapping).

Something belongs here (not in a `features/*/components`) once ≥2 pages
need the exact same presentational component — `features/*` may not
import each other
(`docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md`, §5 "Reglas de
dependencias"), so this is where cross-page UI actually lives.
