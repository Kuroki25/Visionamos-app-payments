import { Alert } from '@repo/ui';

import { auth } from '../../content/es/auth';
import { common } from '../../content/es/common';

/**
 * Fallback for `(dashboard)/layout.tsx` when `getCurrentUser()` resolves to
 * `null`. Deliberately not a designed login screen — Claude Design's
 * "RedCoop Login.dc.html" is out of scope for this handoff pass (the user
 * scoped this pass to "RedCoop Dashboard.dc.html" only) — this reuses the
 * unauthenticated message that already exists in `content/es/auth.ts` for
 * exactly this case instead of inventing new UI or redirecting to a
 * `/login` route that doesn't exist yet.
 */
export function UnauthenticatedNotice() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-8">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{common.appName}</h1>
      <Alert tone="warning">{auth.unauthenticatedMessage}</Alert>
    </main>
  );
}
