import type { ReactNode } from 'react';

import { AppShell } from '../../components/layout/AppShell';
import { UnauthenticatedNotice } from '../../components/layout/UnauthenticatedNotice';
import { getCurrentUser } from '../../lib/auth/session.server';

/**
 * Route group for every screen behind the admin shell. This is the first
 * real protected route in the app — the `(dashboard)` group and this
 * auth check are exactly what
 * `docs/frontend/DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md` (§5, §8) said to
 * create once a real dashboard page existed, not before.
 *
 * The check itself — `getCurrentUser()` in a Server Component — IS the
 * real mechanism the source of truth describes (§7, §8): "toda decisión
 * de rol/scope se re-verifica en el Server Component/página ... nunca se
 * confía solo en proxy.ts". No `proxy.ts` is added: this already covers
 * both the optimistic redirect and the real check in one place, and NestJS
 * still re-verifies every actual request regardless of what renders here.
 *
 * No session → render the existing unauthenticated fallback instead of
 * the admin chrome (there is no `/login` page yet — see
 * `UnauthenticatedNotice`) rather than a redirect into a route that 404s.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    return <UnauthenticatedNotice />;
  }

  return <AppShell user={{ fullName: user.fullName, role: user.role }}>{children}</AppShell>;
}
