import { fromNodeHeaders } from 'better-auth/node';

import type { BetterAuthInstance } from '../../src/infra/better-auth/better-auth.factory';

/**
 * Signs in via `auth.api.signInEmail` directly (no HTTP hop — Better Auth's
 * own `/api/auth/*` handler isn't mounted on any route yet, that's Fase 10)
 * and returns the raw `session_token` cookie so a test can attach it to a
 * real `supertest` request against the app's actual controllers. Uses the
 * WHATWG `Headers.getSetCookie()` (Node 18+) rather than splitting the
 * joined `set-cookie` string on commas — a `Set-Cookie` value can itself
 * contain a comma (e.g. an `Expires=` date), which a naive split would
 * corrupt.
 */
export async function signInAndGetSessionCookie(auth: BetterAuthInstance, email: string, password: string): Promise<string> {
  const response = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
  const cookie = response.headers.getSetCookie().find((c) => c.includes('session_token'));
  if (!cookie) {
    throw new Error(`Sign-in for ${email} did not return a session_token cookie.`);
  }
  return cookie.split(';')[0]!;
}

/** Revokes the session behind `sessionCookie` — used to prove AUTH-01 is fixed (see cutover-rehearsal.pg-e2e.ts). */
export async function signOutSession(auth: BetterAuthInstance, sessionCookie: string): Promise<void> {
  await auth.api.signOut({ headers: fromNodeHeaders({ cookie: sessionCookie }) });
}
