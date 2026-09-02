'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import type { Role } from '@repo/contracts';

import { nav } from '../../content/es/nav';
import { roleLabels } from '../../content/es/roles';
import { getInitials } from '../../lib/format';
import { BellIcon, MenuIcon, MoonIcon } from './icons';
import { navItems } from './nav-config';
import { useDarkMode } from './use-dark-mode';

export interface SidebarUser {
  fullName: string;
  role: Role;
}

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const { dark, toggle: toggleDark } = useDarkMode();
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  // No notifications backend exists yet — see the handoff analysis, "Datos
  // estáticos → datos reales". Kept as a variable (not inlined) so wiring a
  // real source later is a one-line change.
  const unreadCount = 0;

  return (
    <div
      className="flex shrink-0 flex-col border-r border-(--color-border) bg-(--color-sidebar) p-4 transition-[width] duration-150"
      style={{ width: collapsed ? '76px' : '264px' }}
    >
      <div className={`flex items-center gap-2.5 pb-5 ${collapsed ? 'justify-center' : ''}`}>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={nav.toggleSidebar}
          aria-label={nav.toggleSidebar}
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-control bg-(--color-accent-soft) text-(--color-accent) transition-colors hover:bg-(--color-surface-subtle)"
        >
          <MenuIcon />
        </button>
        {!collapsed ? (
          <div className="leading-tight">
            <div className="text-[15px] font-bold text-(--color-fg)">{nav.brand}</div>
            <div className="text-xs font-semibold text-(--color-orange)">{nav.brandSub}</div>
          </div>
        ) : null}
      </div>

      {!collapsed ? (
        <div className="px-2 pb-2 pt-3 text-[11px] font-bold tracking-[.06em] text-(--color-fg-faint)">
          {nav.menuLabel}
        </div>
      ) : null}

      <nav className="flex flex-col gap-0.5">
        {navItems.map(({ id, href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={id}
              href={href}
              title={label}
              className={`flex items-center rounded-control text-sm transition-colors ${
                collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2.5'
              } ${
                active
                  ? 'bg-(--color-accent-soft) font-bold text-(--color-accent)'
                  : 'font-medium text-(--color-fg-soft) hover:bg-(--color-surface-subtle) hover:text-(--color-fg)'
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed ? <span>{label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex flex-col gap-0.5 border-t border-(--color-border) pt-3">
        <button
          type="button"
          onClick={toggleDark}
          className={`flex items-center rounded-control px-2.5 py-2.5 transition-colors hover:bg-(--color-surface-subtle) ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <span className="flex items-center gap-2.5 text-sm font-medium text-(--color-fg-soft)">
            <MoonIcon />
            {!collapsed ? <span>{nav.darkMode}</span> : null}
          </span>
          {!collapsed ? (
            <span
              aria-hidden
              className="relative inline-block h-5 w-9 rounded-full transition-colors"
              style={{ background: dark ? 'var(--color-accent)' : 'var(--color-border)' }}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left]"
                style={{ left: dark ? '18px' : '2px' }}
              />
            </span>
          ) : null}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className={`flex w-full items-center rounded-control px-2.5 py-2.5 transition-colors hover:bg-(--color-surface-subtle) ${
              collapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            <span className="relative flex items-center gap-2.5 text-sm font-medium text-(--color-fg-soft)">
              <BellIcon />
              {!collapsed ? <span>{nav.notifications}</span> : null}
            </span>
            {/* No notifications backend yet (see the handoff analysis) — `unreadCount` is always 0 today, so the badge stays hidden rather than permanently showing a literal "0" to users. */}
            {unreadCount > 0 ? (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-(--color-danger) px-1.5 text-[11px] font-bold text-white">
                {unreadCount}
              </span>
            ) : null}
          </button>

          {notifOpen ? (
            <div
              className="absolute bottom-14 z-40 w-[330px] overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface) shadow-panel"
              style={{ left: collapsed ? '76px' : '16px' }}
            >
              <div className="flex items-center justify-between border-b border-(--color-border) px-4 py-3.5">
                <div className="text-sm font-bold text-(--color-fg)">{nav.notificationsTitle}</div>
              </div>
              <div className="px-4 py-6 text-center text-[13px] text-(--color-fg-faint)">
                {nav.notificationsEmpty}
              </div>
            </div>
          ) : null}
        </div>

        <div className={`flex items-center gap-2.5 px-2.5 pb-1 pt-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--color-accent-soft) text-[13px] font-bold text-(--color-accent)">
            {getInitials(user.fullName)}
          </div>
          {!collapsed ? (
            <div className="leading-tight">
              <div className="text-[13px] font-semibold text-(--color-fg)">{user.fullName}</div>
              <div className="text-[11.5px] text-(--color-fg-faint)">{roleLabels[user.role]}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
