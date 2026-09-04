import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ImagePlaceholderIcon } from '../../../components/ui/icons';
import { portalDetail } from '../../../content/es/portal';
import { getPublishedPortal } from '../../../features/portal-directory/api';
import { API_BASE_URL } from '../../../lib/api/config';

/**
 * Minimal, real Portal detail page — deliberately NOT the full Slice 3 the
 * master prompt describes (categories/comercios/paginación —
 * docs/frontend/PORTAL_WEB_SOURCE_OF_TRUTH.md, "Deferred Features"). It
 * exists so links from Home (a Portal card, a global commerce search
 * result) land somewhere real instead of a dead link, with real branding
 * fetched server-side — never invented commerce data.
 */
export async function generateMetadata(props: PageProps<'/portales/[portalId]'>): Promise<Metadata> {
  const { portalId } = await props.params;
  const portal = await getPublishedPortal(portalId);
  if (!portal) {
    return { title: portalDetail.comingSoonTitle };
  }
  const title = portal.displayName ?? portal.name;
  return { title, description: portal.description ?? undefined };
}

export default async function PortalDetailPage(props: PageProps<'/portales/[portalId]'>) {
  const { portalId } = await props.params;
  const portal = await getPublishedPortal(portalId);

  if (!portal) {
    notFound();
  }

  const title = portal.displayName ?? portal.name;

  return (
    <main className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center">
      <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-(--color-surface-muted)">
        {portal.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- cross-origin content from the API's own origin, same pattern as PortalCard.
          <img src={`${API_BASE_URL}${portal.logoUrl}`} alt={title} className="h-full w-full object-contain" />
        ) : (
          <ImagePlaceholderIcon className="h-9 w-9 text-(--color-fg-faint)" />
        )}
      </span>
      <h1 className="text-2xl font-bold text-(--color-fg)">{title}</h1>
      {portal.description ? <p className="text-sm text-(--color-fg-soft)">{portal.description}</p> : null}

      <div className="mt-8 rounded-card border border-dashed border-(--color-border) bg-(--color-surface-muted) px-6 py-8">
        <p className="text-sm font-semibold text-(--color-fg)">{portalDetail.comingSoonTitle}</p>
        <p className="mt-1 text-sm text-(--color-fg-faint)">{portalDetail.comingSoonMessage}</p>
      </div>

      <Link href="/" className="text-sm font-semibold text-(--color-brand-blue) hover:underline">
        {portalDetail.backToHome}
      </Link>
    </main>
  );
}
