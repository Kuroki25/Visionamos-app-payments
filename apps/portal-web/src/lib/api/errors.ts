import { ProblemDetailsSchema, type ProblemDetails } from '@repo/contracts';

/**
 * Frontend-side counterpart to the backend's `application/problem+json`
 * responses (RFC 9457) — same contract dashboard-web's `lib/api/errors.ts`
 * relies on. Portal-web is fully anonymous (no session concept), so this
 * omits `isUnauthenticated`/`isForbidden` — every route this app calls is
 * `@Public()` by construction (docs/frontend/PORTAL_WEB_SOURCE_OF_TRUTH.md,
 * "Public API Architecture"); a 401/403 here would mean a real bug, not a
 * state to render UI for.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(problem: ProblemDetails) {
    // `detail` is the only field allowed to reach a human — `title` alone
    // is a fixed HTTP status label, not a useful message.
    super(problem.detail ?? problem.title);
    this.name = 'ApiError';
    this.status = problem.status;
    this.code = problem.title;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

/**
 * Builds an `ApiError` from a `Response` already confirmed non-ok. Falls
 * back to a generic `ProblemDetails` if the body isn't valid
 * `application/problem+json` — never throws a raw parsing error, never
 * surfaces the unparsed body (it may carry infrastructure detail).
 */
export async function apiErrorFromResponse(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  const parsed = ProblemDetailsSchema.safeParse(body);
  if (parsed.success) {
    return new ApiError(parsed.data);
  }

  return new ApiError({ type: 'about:blank', title: response.statusText || 'Error', status: response.status });
}

/** Network failure, timeout, or abort — the request never got a response to parse. */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('No se pudo completar la solicitud. Verifica tu conexión e inténtalo de nuevo.');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}
