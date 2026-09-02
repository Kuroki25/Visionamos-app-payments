import { describe, expect, it } from 'vitest';

import { apiErrorFromResponse, ApiError } from './errors';

/**
 * Fixtures mirror the exact shape `apps/api/src/common/filters/all-exceptions.filter.ts`
 * produces (RFC 9457 `application/problem+json`), not a guessed/simplified
 * one — see that file for the source of truth.
 */
function problemResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}

describe('apiErrorFromResponse', () => {
  it('parses a real ProblemDetails body into an ApiError', async () => {
    const response = problemResponse(
      { type: 'about:blank', title: 'Unauthorized', status: 401, detail: 'Missing or invalid session.' },
      401,
    );

    const error = await apiErrorFromResponse(response);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(error.isUnauthenticated).toBe(true);
    expect(error.isForbidden).toBe(false);
    expect(error.message).toBe('Missing or invalid session.');
  });

  it('treats 403 as forbidden, distinct from 401', async () => {
    const response = problemResponse({ type: 'about:blank', title: 'Forbidden', status: 403 }, 403);

    const error = await apiErrorFromResponse(response);

    expect(error.isForbidden).toBe(true);
    expect(error.isUnauthenticated).toBe(false);
  });

  it('carries field errors from a 400 validation response', async () => {
    const response = problemResponse(
      {
        type: 'about:blank',
        title: 'Bad Request',
        status: 400,
        detail: 'La solicitud no cumple el esquema esperado.',
        errors: [{ field: 'email', message: 'Invalid email' }],
      },
      400,
    );

    const error = await apiErrorFromResponse(response);

    expect(error.fieldErrors).toEqual([{ field: 'email', message: 'Invalid email' }]);
  });

  it('falls back to a generic error when the body is not valid ProblemDetails', async () => {
    const response = new Response('<html>not json</html>', { status: 502, statusText: 'Bad Gateway' });

    const error = await apiErrorFromResponse(response);

    expect(error.status).toBe(502);
    expect(error.message).toBe('Bad Gateway');
  });
});
