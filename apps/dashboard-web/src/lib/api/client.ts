import { API_BASE_URL } from './config';
import { apiErrorFromResponse, NetworkError } from './errors';

/**
 * Browser-originated HTTP client — for Client Component interaction and
 * mutations. Server Components/SSR must use `lib/api/server.ts` instead
 * (different cookie-forwarding story; see that file's docblock).
 * `docs/frontend/DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md`, "Integración con la API".
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

async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      // Better Auth's session cookie is scoped to the API's own origin
      // (cross-origin from this app's port) — without `credentials:
      // 'include'`, every authenticated request would silently look
      // unauthenticated (docs/adr/013-better-auth-migration.md).
      credentials: 'include',
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      // `exactOptionalPropertyTypes` rejects `body: undefined` explicitly —
      // the key must be entirely absent, not present with an undefined value.
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
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
