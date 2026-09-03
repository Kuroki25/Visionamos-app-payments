import { API_BASE_URL } from './config';
import { apiErrorFromResponse, NetworkError } from './errors';

/**
 * Browser-originated HTTP client — for Client Component interaction and
 * mutations. Server Components/SSR must use `lib/api/server.ts` instead
 * (different cookie-forwarding story; see that file's docblock).
 * `docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md`, §8 "Integración con la API".
 *
 * No feature may call `fetch(...)` directly against the API — this is the
 * one place base URL, credentials, JSON parsing, and error translation are
 * handled, so every feature gets the same behaviour for free.
 */
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * Reads one cookie by name from `document.cookie`. Only ever used for
 * `csrf_token`, which the backend deliberately sets NOT `httpOnly`
 * (`apps/api/src/modules/auth/middleware/csrf-cookie.middleware.ts`) so
 * same-origin JavaScript can read it back — that's the whole point of the
 * double-submit pattern (see `CsrfGuard` there): a cross-site request can
 * carry the session cookie automatically but can never read this one to
 * echo it back as a header.
 */
function readCookie(name: string): string | undefined {
  const prefix = `${name}=`;
  for (const part of document.cookie.split('; ')) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length));
    }
  }
  return undefined;
}

/**
 * The backend issues `csrf_token` from `CsrfCookieMiddleware`, which only
 * runs for Nest-routed requests (`/api/v1/*`) — verified against the real
 * server: `GET /api/v1/health` sets it, `GET /api/auth/get-session` does
 * not (Better Auth's handler is mounted outside Nest's middleware chain,
 * `mount-better-auth-handler.ts`). Every read in this app goes through
 * `lib/api/server.ts` (server-side — its cookies never reach the browser),
 * so without this, the browser would never hold the token until *after* a
 * mutation's own request had already been rejected once. One cheap public
 * GET primes it before the real request, so the very first mutation of a
 * session works on the first try, not the second.
 */
async function ensureCsrfCookie(): Promise<void> {
  if (readCookie(CSRF_COOKIE_NAME) !== undefined) return;
  try {
    await fetch(`${API_BASE_URL}/health`, { credentials: 'include' });
  } catch {
    // Best-effort — if this fails, the real request below still runs and
    // fails with its own, already-handled ApiError instead.
  }
}

async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  // The backend's CsrfGuard rejects every non-safe request with no matching
  // X-CSRF-Token header/cookie pair — GET/HEAD/OPTIONS are exempt there
  // too, so this mirrors that exemption exactly rather than sending the
  // header unconditionally.
  if (!SAFE_METHODS.has(method)) {
    await ensureCsrfCookie();
  }
  const csrfToken = SAFE_METHODS.has(method) ? undefined : readCookie(CSRF_COOKIE_NAME);

  // `FormData` (file uploads, e.g. Portal logo — `PortalForm.tsx`) must
  // NOT be JSON-stringified, and must NOT get an explicit `Content-Type`:
  // the browser sets `multipart/form-data; boundary=...` itself, and a
  // manually-set header here would omit that boundary and break parsing
  // server-side (multer).
  const isFormData = options.body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      // Better Auth's session cookie is scoped to the API's own origin
      // (cross-origin from this app's port) — without `credentials:
      // 'include'`, every authenticated request would silently look
      // unauthenticated (docs/adr/013-better-auth-migration.md).
      credentials: 'include',
      headers: {
        ...(options.body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(csrfToken !== undefined ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
        ...options.headers,
      },
      // `exactOptionalPropertyTypes` rejects `body: undefined` explicitly —
      // the key must be entirely absent, not present with an undefined value.
      ...(options.body !== undefined ? { body: isFormData ? (options.body as FormData) : JSON.stringify(options.body) } : {}),
      ...(options.signal !== undefined ? { signal: options.signal } : {}),
    });
  } catch (cause) {
    // A thrown `AbortError` is an intentional cancellation, not a network
    // failure — let it propagate as-is so callers can distinguish the two.
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause;
    }
    throw new NetworkError(cause);
  }

  if (!response.ok) {
    throw await apiErrorFromResponse(response);
  }

  // 204 No Content and similar bodies with nothing to parse.
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
