import 'server-only';

import { cookies } from 'next/headers';

import { API_BASE_URL } from './config';
import { apiErrorFromResponse, NetworkError } from './errors';

/**
 * Server-originated HTTP client — for Server Components, layouts, and any
 * server→NestJS call that must run before the page streams to the browser.
 * Client Components/mutations must use `lib/api/client.ts` instead.
 * `docs/frontend/DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md`, "Integración con la API".
 *
 * `import 'server-only'` makes bundling this into a Client Component a
 * build-time error, not a runtime surprise — it reads request cookies via
 * `next/headers`, which doesn't exist in the browser.
 */
export interface ServerApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /**
   * Next.js fetch cache behaviour. Defaults to `no-store` — this client is
   * used for authenticated, user-scoped admin data (docs/frontend
   * "Cachés"); callers must opt into caching explicitly and only for data
   * proven to be public/non-user-scoped.
   */
  cache?: RequestCache;
}

/**
 * Better Auth's own cookie prefix (`better-auth`, verified against
 * `node_modules/better-auth/dist/cookies/index.mjs`) — only cookies under
 * this prefix are forwarded to the backend, not every cookie the browser
 * happens to send this app (this app sets no cookies of its own today, but
 * "forward everything" would silently start doing so the moment it does).
 */
const FORWARDED_COOKIE_PREFIX = 'better-auth';

async function buildCookieHeader(): Promise<string | undefined> {
  const jar = await cookies();
  const relevant = jar.getAll().filter((cookie) => cookie.name.includes(FORWARDED_COOKIE_PREFIX));
  if (relevant.length === 0) {
    return undefined;
  }
  return relevant.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
}

async function request<T>(path: string, options: ServerApiRequestOptions = {}): Promise<T> {
  const cookieHeader = await buildCookieHeader();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      // `exactOptionalPropertyTypes` rejects `body: undefined` explicitly —
      // the key must be entirely absent, not present with an undefined value.
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      cache: options.cache ?? 'no-store',
    });
  } catch (cause) {
    throw new NetworkError(cause);
  }

  if (!response.ok) {
    throw await apiErrorFromResponse(response);
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const serverApiClient = {
  get: <T>(path: string, options?: Omit<ServerApiRequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<ServerApiRequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<ServerApiRequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<ServerApiRequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
