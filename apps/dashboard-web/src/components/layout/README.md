# `src/components/layout`

Cross-cutting structural chrome, built against the real Claude Design
handoff ("RedCoop Dashboard.dc.html") — see
`docs/frontend/design-handoff/DASHBOARD_INICIO_HANDOFF_ANALYSIS.md`.

- `AppShell.tsx` — sidebar + scrollable content area. Server Component.
- `Sidebar.tsx` — nav, dark-mode toggle, notifications, user footer.
  Client Component (collapse/dark/notif state, active-route highlighting).
- `Header.tsx` — page title/subtitle + search box. Presentational, per-page
  (each page renders its own `<Header/>`, not `AppShell` — see that file's
  docblock for why).
- `use-dark-mode.ts` — the manual light/dark toggle backing `Sidebar`'s
  switch (persisted to `localStorage`, applies a `.dark` class on `<html>`).
- `nav-config.ts` — nav item definitions (icons themselves live in
  `components/ui/icons.tsx` — shared with page content, see that folder's
  README for why).

Only truly cross-page structure belongs here. Anything specific to one
screen's content (stat cards, tables, forms) belongs in that screen's own
`features/*` slice instead.
