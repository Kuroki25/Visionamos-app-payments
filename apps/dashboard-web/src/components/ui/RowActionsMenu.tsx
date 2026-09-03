'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Link from 'next/link';

import { DotsVerticalIcon } from './icons';

/** Either a real `<Link>` (navigation) or an action callback — never both, never neither. */
export type RowAction =
  | { key: string; label: string; href: string; tone?: 'default' | 'warning' }
  | { key: string; label: string; onSelect: () => void; tone?: 'default' | 'warning' };

const itemClass = (tone: RowAction['tone']) =>
  `block w-full cursor-default select-none px-3.5 py-2.5 text-left text-[13px] font-semibold outline-none data-[highlighted]:bg-(--color-surface-subtle) ${
    tone === 'warning' ? 'text-(--color-orange)' : 'text-(--color-fg)'
  }`;

/**
 * Real, portal-rendered dropdown for per-row "⋮" actions (Portales,
 * Usuarios, and any future table) — replaces the hand-rolled
 * `useState(openMenuId)` + `absolute` `<div>` pattern, which a real bug
 * exposed: any ancestor `overflow-hidden` (needed for `rounded-card`
 * corners) clips the menu once there's no row below it to give it room —
 * most visible on a single-row table (`docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md`,
 * "Functional UI Contracts › Users").
 *
 * `@radix-ui/react-dropdown-menu` renders its content into `document.body`
 * (escapes any ancestor's `overflow`/stacking context), and gives focus
 * trap/return, Escape, click-outside, and full keyboard nav (arrows, Home/
 * End, typeahead) for free — correct behavior this app would otherwise have
 * to hand-roll and re-verify per call site.
 */
export function RowActionsMenu({ label, actions }: { label: string; actions: RowAction[] }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          title={label}
          aria-label={label}
          className="flex h-8 w-8 items-center justify-center rounded-control-sm border border-(--color-border) text-(--color-fg-soft) outline-none hover:bg-(--color-surface-subtle) focus-visible:ring-[3px] focus-visible:ring-(--color-accent-soft)"
        >
          <DotsVerticalIcon />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 w-[150px] overflow-hidden rounded-control border border-(--color-border) bg-(--color-surface) shadow-dropdown"
        >
          {actions.map((action) =>
            'href' in action ? (
              <DropdownMenu.Item key={action.key} asChild className={itemClass(action.tone)}>
                <Link href={action.href}>{action.label}</Link>
              </DropdownMenu.Item>
            ) : (
              <DropdownMenu.Item key={action.key} onSelect={action.onSelect} className={itemClass(action.tone)}>
                {action.label}
              </DropdownMenu.Item>
            ),
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
