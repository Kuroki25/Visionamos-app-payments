import { ProblemDetailsSchema, type ProblemDetails } from '@repo/contracts';

/**
 * Frontend-side counterpart to `apps/api/src/common/filters/all-exceptions.filter.ts`
 * — every NestJS error response is `application/problem+json` (RFC 9457),
 * validated here against the exact same `ProblemDetailsSchema` the backend
 * builds its responses from (`@repo/contracts`), so this file can never
 * silently drift from what the API actually returns.
 *
 * `ApiError` is the ONLY error type `lib/api/client.ts`/`server.ts` ever
 * throw for a non-2xx response — features must not parse `Response` bodies
 * themselves (docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md, §8.2 "Status
 * codes").
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  /** Per-field validation errors on 400/422 responses, if any (`ProblemDetails.errors`). */
  readonly fieldErrors: ProblemDetails['errors'];

  constructor(problem: ProblemDetails) {
    // `detail` is the only field allowed to reach a human — never `title`
    // alone, which is a fixed HTTP status label, not a useful message.
    super(problem.detail ?? problem.title);
    this.name = 'ApiError';
    this.status = problem.status;
    this.code = problem.title;
    this.fieldErrors = problem.errors;
  }

  /** 401 — no/invalid session. Callers should trigger reauthentication, never treat this the same as 403. */
  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  /** 403 — authenticated but lacking permission. Callers should render a "no permissions" state, never redirect to login. */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** 409 (conflict) or 422/400 (validation) — the request itself needs to change, not be silently retried. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

/**
 * Builds an `ApiError` from a `Response` that was already confirmed non-ok.
 * Falls back to a generic 500 `ProblemDetails` if the body isn't valid
 * `application/problem+json` (e.g. an upstream proxy/HTML error page) —
 * never throws a raw parsing error out of this function, and never surfaces
 * the unparsed body to the caller (it may contain infrastructure detail).
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

  return new ApiError({
    type: 'about:blank',
    title: response.statusText || 'Error',
    status: response.status,
  });
}

/** Network failure, timeout, or abort — the request never got a response to parse. */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('No se pudo completar la solicitud. Verifica tu conexión e inténtalo de nuevo.');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}
