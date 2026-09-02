import 'server-only';

import type { User } from '@repo/contracts';

import { ApiError } from '../api/errors';
import { serverApiClient } from '../api/server';

/**
 * Server-only session resolution. Better Auth lives entirely in NestJS —
 * this does NOT run a second Better Auth instance in Next.js, it queries
 * the real backend session via `GET /auth/me`
 * (`apps/api/src/modules/auth/auth.controller.ts`), forwarding the
 * request's own cookies (`lib/api/server.ts`).
 *
 * `/auth/me` (not Better Auth's raw `/api/auth/get-session`) is used
 * deliberately: it returns the domain-shaped `User` — `role`/`scopeType`/
 * `scopePortalId`/`scopeCommerceId` — which only `role_assignments` knows
 * about (`better-auth-session.guard.ts`); Better Auth's own session object
 * has no concept of them. This is the single source of both "is there a
 * session" and "what can this user do" for Server Components.
 *
 * Returns `null` on 401 (no/invalid session) — never throws for that case,
 * since "no session" is an expected, common state (e.g. an anonymous
 * visitor on a public route), not an error. Any other failure (network,
 * 500) propagates — callers must not treat a backend outage as "logged
 * out".
 *
 * This is UX/optimistic resolution for what to render — it is NOT the
 * security boundary. Every mutating request still goes through
 * `BetterAuthSessionGuard`/`RolesGuard`/`ScopeAuthorizationService` on the
 * real backend regardless of what this function returns
 * (docs/frontend/DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md, "Autorización").
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    return await serverApiClient.get<User>('/auth/me');
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthenticated) {
      return null;
    }
    throw error;
  }
}
