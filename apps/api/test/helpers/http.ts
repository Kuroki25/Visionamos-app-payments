import request from 'supertest';
import type { App } from 'supertest/types';

/** Pulls a cookie's value out of a supertest response's Set-Cookie header. */
export function extractCookie(res: request.Response, name: string): string {
  const raw: unknown = res.headers['set-cookie'];
  const cookies: string[] = Array.isArray(raw) ? (raw as string[]) : typeof raw === 'string' ? [raw] : [];
  const match = cookies.find((c) => c.startsWith(`${name}=`));
  if (!match) {
    throw new Error(`Cookie "${name}" not found in response`);
  }
  return match.split(';', 1)[0]!.slice(name.length + 1);
}

/**
 * A supertest agent that has already completed the CSRF handshake
 * (docs/adr/006 — double-submit cookie) and knows how to log in. Every
 * e2e-spec file in this suite repeats the same "agent + csrf + login"
 * setup (originally inline in app.e2e-spec.ts) — factored out once here.
 */
export class TestSession {
  readonly agent: ReturnType<typeof request.agent>;
  csrfToken: string;

  private constructor(agent: ReturnType<typeof request.agent>, csrfToken: string) {
    this.agent = agent;
    this.csrfToken = csrfToken;
  }

  static async create(httpServer: App): Promise<TestSession> {
    const agent = request.agent(httpServer);
    const res = await agent.get('/api/v1/health');
    return new TestSession(agent, extractCookie(res, 'csrf_token'));
  }

  /**
   * Better Auth's own HTTP surface (docs/adr/013-better-auth-migration.md,
   * "Integración con NestJS") — deliberately NOT `/api/v1/auth/login` (the
   * legacy JWT endpoint; still reachable until the JWT retirement pass, but
   * the cookie it sets means nothing to `BetterAuthSessionGuard`, the guard
   * that actually runs now). No `X-CSRF-Token` header: `/api/auth/*` is
   * Better Auth's own raw Express route, entirely outside Nest's
   * `CsrfGuard`. `this.agent` (a supertest agent) persists whatever
   * `Set-Cookie` this returns automatically, same as it always did for the
   * legacy JWT cookie — every subsequent request on this session carries it.
   */
  login(email: string, password: string) {
    return this.agent.post('/api/auth/sign-in/email').send({ email, password });
  }

  /** Better Auth's own sign-out — same reasoning as `login()` above: `/api/auth/*`, not `/api/v1/auth/logout`, no CSRF header. */
  logout() {
    return this.agent.post('/api/auth/sign-out').send({});
  }

  get(url: string) {
    return this.agent.get(url);
  }

  post(url: string) {
    return this.agent.post(url).set('X-CSRF-Token', this.csrfToken);
  }

  patch(url: string) {
    return this.agent.patch(url).set('X-CSRF-Token', this.csrfToken);
  }

  delete(url: string) {
    return this.agent.delete(url).set('X-CSRF-Token', this.csrfToken);
  }
}
