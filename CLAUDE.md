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
