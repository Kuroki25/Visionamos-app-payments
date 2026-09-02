# `src/components/ui`

Empty on purpose. Reusable visual primitives (Button, Input, Badge, Dialog,
...) already exist in `@repo/ui` and are imported from there directly
(`import { Button } from '@repo/ui'`) — this folder is not a duplicate of
that package.

Only add something here when it is genuinely app-specific and not (yet)
promoted to `@repo/ui`. Do not invent new primitives ahead of the Claude
Design handoff — see `docs/frontend/DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md`,
"Contrato de handoff con Claude Design".
