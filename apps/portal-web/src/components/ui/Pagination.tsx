import Link from 'next/link';
import type { PageMeta } from '@repo/contracts';
import type { ReactNode } from 'react';

import { home } from '../../content/es/home';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

interface PaginationProps {
  meta: PageMeta;
  /** Builds the href for a given 1-based page number — the caller owns which query params survive (e.g. `q`). */
  buildHref: (page: number) => string;
}

/**
 * Real pagination driven by `PageMeta` (never a hardcoded "Página 1 de 2" —
 * master prompt §17: "No hardcodear ... Debe basarse en page/pageSize/total/
 * totalPages"). Plain `<Link>`s, not a client click handler — the Server
 * Component page that renders this already re-fetches on navigation
 * (master prompt §11: Server Components first), so no client JS is needed
 * just to turn a page.
 */
export function Pagination({ meta, buildHref }: PaginationProps) {
  if (meta.totalPages <= 1) {
    return null;
  }

  const { page, totalPages } = meta;

  return (
    <nav aria-label="Paginación de portales" className="mt-8 flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <PageArrow href={page > 1 ? buildHref(page - 1) : undefined} label={home.portalDirectory.previousPage}>
          <ChevronLeftIcon className="h-4 w-4" />
        </PageArrow>

        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => {
          const isCurrent = pageNumber === page;
          return (
            <Link
              key={pageNumber}
              href={buildHref(pageNumber)}
              aria-current={isCurrent ? 'page' : undefined}
              aria-label={home.portalDirectory.goToPage(pageNumber)}
              className={
                isCurrent
                  ? 'flex h-9 w-9 items-center justify-center rounded-full bg-(--color-brand-blue) text-sm font-semibold text-white'
                  : 'flex h-9 w-9 items-center justify-center rounded-full bg-(--color-surface-muted) text-sm font-medium text-(--color-fg-soft) hover:bg-(--color-border)'
              }
            >
              {pageNumber}
            </Link>
          );
        })}

        <PageArrow href={page < totalPages ? buildHref(page + 1) : undefined} label={home.portalDirectory.nextPage}>
          <ChevronRightIcon className="h-4 w-4" />
        </PageArrow>
      </div>
      <p className="text-sm text-(--color-fg-faint)">{home.portalDirectory.pageLabel(page, totalPages)}</p>
    </nav>
  );
}

function PageArrow({ href, label, children }: { href: string | undefined; label: string; children: ReactNode }) {
  const className =
    'flex h-9 w-9 items-center justify-center rounded-full bg-(--color-surface-muted) text-(--color-fg-soft)';
  if (!href) {
    return (
      <span aria-hidden="true" className={`${className} cursor-not-allowed opacity-40`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={`${className} hover:bg-(--color-border)`}>
      {children}
    </Link>
  );
}
