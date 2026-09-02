import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppShell } from '../../components/layout/AppShell';
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
 * No session → redirect to `/login` (a real page as of the E2E-closure
 * pass — it didn't exist during the original Dashboard-only handoff, so
 * this used to render an inert message instead).
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return <AppShell user={{ fullName: user.fullName, role: user.role }}>{children}</AppShell>;
}
