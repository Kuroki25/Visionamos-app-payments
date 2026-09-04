import type { PublicPortal } from '@repo/contracts';
import Link from 'next/link';

import { ImagePlaceholderIcon } from '../../../components/ui/icons';
import { home } from '../../../content/es/home';
import { API_BASE_URL } from '../../../lib/api/config';

/**
 * A published Portal's card in the directory grid
 * (`01-public-home-directory.png`). The reference's "or browse files"
 * placeholders are a design-tool artifact, never public UI (master prompt
 * §2) — this renders the Portal's real logo, or a neutral fallback icon
 * (§40: never a broken image or literal "undefined").
 */
export function PortalCard({ portal }: { portal: PublicPortal }) {
  const title = portal.displayName ?? portal.name;

  return (
    <Link
      href={`/portales/${portal.id}`}
      className="flex flex-col items-center gap-3 rounded-card border border-(--color-border) bg-(--color-surface) p-6 text-center shadow-(--shadow-card) transition-transform hover:-translate-y-0.5"
    >
      <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-(--color-surface-muted)">
        {portal.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- cross-origin content from the API's own origin (same Portal logo endpoint dashboard-web already serves via a plain <img>, see PORTAL_WEB_SOURCE_OF_TRUTH.md "Image & Media Architecture").
          <img
            src={`${API_BASE_URL}${portal.logoUrl}`}
            alt={home.portalDirectory.logoAlt(title)}
            className="h-full w-full object-contain"
          />
        ) : (
          <ImagePlaceholderIcon className="h-7 w-7 text-(--color-fg-faint)" />
        )}
      </span>
      <span className="text-sm font-semibold text-(--color-fg)">{title}</span>
    </Link>
  );
}
