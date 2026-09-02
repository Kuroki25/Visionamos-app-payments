# CLAUDE.md

Repo-level instructions for Claude Code sessions working on this monorepo
(Red Coopagos / Visionamos-app-payments).

## Authentication — Mandatory Source of Truth

Before modifying authentication, authorization, sessions, guards,
login, logout, auth middleware, `main.ts`, `app.module.ts`,
frontend auth client, or API authentication behavior, ALWAYS read:

`docs/backend/authentication/BETTER_AUTH_CUTOVER_SOURCE_OF_TRUTH.md`

This document contains the authoritative architecture decisions for
the Better Auth cutover (see also `docs/adr/013-better-auth-migration.md`
and `docs/auth-migration/00`–`09`, the phase-by-phase audit trail).

Do not introduce a second authentication mechanism.

Do not change locked architectural decisions silently.

Always inspect the current repository state before applying a
historical migration step — this codebase moves fast across sessions;
past phase documents describe what was true when written, not
necessarily what's true now.

## Dashboard Web Frontend — Mandatory Source of Truth

Before modifying `apps/dashboard-web` auth client, API client,
feature structure, layouts, shared components, design system, content/
texts, types, routing, or tests (unit/E2E), ALWAYS read:

`docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md`

This is the single, consolidated source of truth (architecture + API +
security + visual contract + testing + Definition of Done) — it
superseded `DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md` on 2026-09-02, after
the Claude Design visual handoff and a real end-to-end technical
closure pass (login/logout, CSRF, RBAC, Playwright E2E against the real
backend) both landed. Do not create additional source-of-truth
documents without a real, demonstrated need — this repo already
consolidated once (see that document's §17 "Historial") specifically to
avoid duplicated/drifting docs.

Do not follow `docs/architecture/CURRENT_ARCHITECTURE.md`,
`DEPENDENCY_RULES.md`, or `TARGET_ARCHITECTURE.md` — they are stale
(pre-implementation, dated 2026-08-23) and contradict the real codebase
(wrong app names, wrong ports, undecided tech choices already resolved
differently). This is documented, not silently ignored — see the source
of truth's §3 "Documentos obsoletos".

The dashboard's UI is already implemented from a real Claude Design
handoff (`RedCoop Dashboard.dc.html`, `TxTable.dc.html`,
`RedCoop Login.dc.html`) — Claude Design is the **visual** source of
truth (colors, spacing, layout, components), this repo's own source of
truth is the **technical** one; they don't compete. Do not redesign
approved UI while fixing a functional/security bug — see that
document's §9 "Visual Contract".
