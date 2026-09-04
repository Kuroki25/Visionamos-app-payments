import 'server-only';

import { API_BASE_URL } from './config';
import { apiErrorFromResponse, NetworkError } from './errors';

/**
 * Server-originated HTTP client — for Server Components/layouts (Home, the
 * Portal directory, Portal detail). Every route this app calls is public
 * (`@Public()` on the backend), so unlike dashboard-web's `lib/api/server.ts`
 * this never forwards cookies — there is no session to forward.
 *
 * `revalidate` defaults to 30s, not `no-store`: this is genuinely public,
 * shared content (docs/frontend/PORTAL_WEB_SOURCE_OF_TRUTH.md, "Performance
 * Contract" / "Publication Contract") — a Dashboard publish/unpublish
 * reflects here within, at most, that window (master prompt §46: "no dejar
 * datos despublicados visibles indefinidamente por cache"). Callers that
 * need a stronger guarantee (e.g. right after a known mutation) can pass
 * `revalidate: 0`.
 */
export interface ServerApiRequestOptions {
  /** Next.js fetch revalidation window, in seconds. `0` disables caching for this call. Default: 30. */
  revalidate?: number;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: ServerApiRequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      next: { revalidate: options.revalidate ?? 30 },
      ...(options.signal !== undefined ? { signal: options.signal } : {}),
    });
  } catch (cause) {
    throw new NetworkError(cause);
  }

  if (!response.ok) {
    throw await apiErrorFromResponse(response);
  }

  return (await response.json()) as T;
}

export const serverApiClient = {
  get: <T>(path: string, options?: ServerApiRequestOptions) => request<T>(path, options),
};
