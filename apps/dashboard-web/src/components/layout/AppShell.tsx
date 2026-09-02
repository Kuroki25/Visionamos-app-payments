import type { ReactNode } from 'react';

import { Sidebar, type SidebarUser } from './Sidebar';

export interface AppShellProps {
  user: SidebarUser;
  children: ReactNode;
}

/**
 * Persistent admin chrome — sidebar + scrollable content area (Claude
 * Design's outer `display:flex;height:100vh` shell). The topbar
 * (`Header`) is NOT rendered here: its title/subtitle are page-specific,
 * so each page renders its own `<Header/>` as the first thing inside its
 * content — `AppShell` only owns what's truly cross-page (the sidebar and
 * the scroll container `Header`'s `sticky top-0` relies on).
 *
 * Stays a Server Component: it composes the client `Sidebar` and doesn't
 * itself need interactivity or browser APIs.
 */
export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-(--color-bg) text-(--color-fg)">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
    </div>
  );
}
