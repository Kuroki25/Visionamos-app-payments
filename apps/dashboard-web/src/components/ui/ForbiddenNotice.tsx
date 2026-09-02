import { Alert } from '@repo/ui';

import { errorsContent } from '../../content/es/errors';

/**
 * Graceful 403 state for a Server Component page whose `serverApiClient`
 * call comes back `ApiError.isForbidden` — e.g. an `ADMIN_PORTAL` viewing
 * another portal's detail page. Without this, the error propagated
 * unhandled straight to Next's generic error boundary ("This page
 * couldn't load"), which is exactly what
 * `docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md`'s UI-states rule forbids —
 * found via real cross-tenant E2E testing, not a hypothetical.
 */
export function ForbiddenNotice() {
  return (
    <div className="px-9 py-10">
      <div className="mb-1 text-lg font-bold text-(--color-fg)">{errorsContent.forbiddenTitle}</div>
      <Alert tone="danger">{errorsContent.forbiddenMessage}</Alert>
    </div>
  );
}
