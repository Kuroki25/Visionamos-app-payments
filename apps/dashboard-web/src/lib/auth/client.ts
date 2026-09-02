'use client';

import { createAuthClient } from 'better-auth/react';

import { BETTER_AUTH_URL } from '../api/config';

/**
 * The ONE Better Auth client configuration point in this app
 * (docs/frontend/DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md, "Autenticación").
 * NestJS is the only Better Auth authority (`apps/api/src/infra/better-auth`)
 * — this is a client of that instance, not a second configuration. No
 * plugins are added here beyond what the server actually enables
 * (`better-auth.factory.ts`: `emailAndPassword` only, no `admin`/
 * `organization`/etc.) — a client-side plugin with no server-side
 * counterpart would silently call routes that don't exist.
 *
 * `basePath` is intentionally omitted — Better Auth defaults it to
 * `/api/auth`, matching the server's own unchanged default
 * (`mount-better-auth-handler.ts`).
 *
 * Only for Client Components (`useSession`, `signIn`, `signOut`). Server
 * Components must use `lib/auth/session.server.ts` instead — it resolves
 * the domain-shaped user (role/scope) from `GET /auth/me`, which this
 * client's `useSession()` cannot see (Better Auth only knows identity, not
 * `role_assignments` — see `better-auth-session.guard.ts`).
 */
export const authClient = createAuthClient({
  baseURL: BETTER_AUTH_URL,
  fetchOptions: {
    // Cross-origin from this app's own port to the API's port — the
    // session cookie is scoped to the API's origin and won't be sent
    // without this (docs/adr/013-better-auth-migration.md).
    credentials: 'include',
  },
});

export const { signIn, signOut, useSession } = authClient;
