import Link from 'next/link';

import { nav } from '../../content/es/nav';
import { SearchIcon } from '../ui/icons';

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface HeaderProps {
  title: string;
  subtitle: string;
  breadcrumbs?: Breadcrumb[];
}

/**
 * Topbar — presentational only, no client interactivity needed yet (the
 * search input is visually faithful to the design but not wired to
 * anything: there is no command-palette/search backend to call). Stays a
 * Server Component per "Server Components por defecto" until it needs
 * real behaviour.
 */
export function Header({ title, subtitle, breadcrumbs }: HeaderProps) {
  return (
    <div className="sticky top-0 z-[5] flex items-center justify-between gap-6 bg-(--color-bg) px-9 pb-[18px] pt-[26px]">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <div className="mb-1.5 flex items-center gap-1.5 text-[13px] text-(--color-fg-faint)">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {crumb.href ? (
                  <Link href={crumb.href} className="font-semibold hover:text-(--color-fg)">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-bold text-(--color-fg)">{crumb.label}</span>
                )}
                {i < breadcrumbs.length - 1 ? <span>/</span> : null}
              </span>
            ))}
          </div>
        ) : null}
        <h1 className="text-[26px] font-extrabold tracking-[-.01em] text-(--color-fg)">{title}</h1>
        <p className="mt-[3px] text-sm text-(--color-fg-faint)">{subtitle}</p>
      </div>
      <div className="relative w-[340px] shrink-0">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-fg-faint)" />
        <input
          type="search"
          placeholder={nav.searchPlaceholder}
          className="w-full rounded-control border border-(--color-border) bg-(--color-surface) py-2.5 pl-[38px] pr-11 text-[13.5px] text-(--color-fg) outline-none transition-[border-color,box-shadow] focus:border-(--color-accent) focus:ring-[3px] focus:ring-(--color-accent-soft)"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 rounded-[5px] border border-(--color-border) px-[5px] py-px text-[11px] text-(--color-fg-faint)">
          ⌘K
        </div>
      </div>
    </div>
  );
}
