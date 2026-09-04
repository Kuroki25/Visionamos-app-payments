import { Faq } from '../features/faq/components/Faq';
import { listPublishedPortals } from '../features/portal-directory/api';
import { PortalDirectory } from '../features/portal-directory/components/PortalDirectory';
import { GlobalCommerceSearch } from '../features/search/components/GlobalCommerceSearch';
import { SupportTrust } from '../features/support/components/SupportTrust';
import { home } from '../content/es/home';

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Home (`01-public-home-directory.png`, `02-public-home-support.png`,
 * `03-public-home-faq.png`). A Server Component (master prompt §11) —
 * `q`/`page` come from `searchParams` and drive a real server-side fetch of
 * the portal directory on every navigation (§14: shareable/refresh-safe
 * URL-driven search). Only `GlobalCommerceSearch`, `PortalSearchForm`
 * (inside `PortalDirectory`) and `Faq` are Client Components.
 */
export default async function Home(props: PageProps<'/'>) {
  const searchParams = await props.searchParams;
  const q = firstValue(searchParams.q);
  const pageRaw = Number(firstValue(searchParams.page));
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : undefined;

  const portals = await listPublishedPortals({ q, page });

  return (
    <>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <section
          className="rounded-hero p-6 shadow-(--shadow-hero) sm:p-10"
          style={{ background: 'linear-gradient(135deg, var(--color-brand-navy), var(--color-brand-cyan))' }}
        >
          <div className="rounded-hero bg-(--color-surface) p-6 sm:p-8">
            <h1 className="mb-4 text-lg font-bold text-(--color-fg)">{home.hero.title}</h1>
            <GlobalCommerceSearch />
          </div>
        </section>

        <PortalDirectory data={portals} q={q} />

        <SupportTrust />
      </main>

      <Faq />
    </>
  );
}
