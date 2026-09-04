import type { PublicPortalsResponse } from '@repo/contracts';

import { Pagination } from '../../../components/ui/Pagination';
import { home } from '../../../content/es/home';
import { PortalSearchForm } from '../../search/components/PortalSearchForm';
import { PortalCard } from './PortalCard';

interface PortalDirectoryProps {
  data: PublicPortalsResponse;
  q?: string | undefined;
}

/**
 * `01-public-home-directory.png` / `02-public-home-support.png`. A Server
 * Component (master prompt §11) — `data` is already fetched server-side by
 * `app/page.tsx` from `searchParams`; only the search input itself
 * (`PortalSearchForm`) is a Client Component.
 */
export function PortalDirectory({ data, q }: PortalDirectoryProps) {
  function buildHref(page: number): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('page', String(page));
    return `/?${params.toString()}`;
  }

  return (
    <section
      aria-labelledby="portal-directory-heading"
      className="rounded-hero bg-(--color-surface) p-6 shadow-(--shadow-card) sm:p-8"
    >
      <h2 id="portal-directory-heading" className="mb-4 text-lg font-bold text-(--color-fg)">
        {home.portalDirectory.title}
      </h2>
      <PortalSearchForm />

      {data.items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-(--color-fg-faint)">{home.portalDirectory.noResults}</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.items.map((portal) => (
            <PortalCard key={portal.id} portal={portal} />
          ))}
        </div>
      )}

      <Pagination meta={data.meta} buildHref={buildHref} />
    </section>
  );
}
