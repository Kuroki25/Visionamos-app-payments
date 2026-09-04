import { API_BASE_URL } from './config';
import { apiErrorFromResponse, NetworkError } from './errors';

/**
 * Browser-originated HTTP client — for Client Component interaction (today:
 * only the global commerce search, `features/search`). GET-only for now
 * (master prompt §43: "no mover todas las requests al browser por
 * comodidad") — a future slice (dynamic form submission) is the first real
 * need for a mutating method here, added then, not speculatively now.
 * Every route this app calls is `@Public()` on the backend, so unlike
 * dashboard-web's `lib/api/client.ts` this sends no credentials/CSRF token
 * — there is no session.
 */
async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...(signal !== undefined ? { signal } : {}) });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause;
    }
    throw new NetworkError(cause);
  }

  if (!response.ok) {
    throw await apiErrorFromResponse(response);
  }

  return (await response.json()) as T;
}

export const apiClient = { get };
