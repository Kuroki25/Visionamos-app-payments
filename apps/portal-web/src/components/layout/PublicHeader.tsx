import Link from 'next/link';

import { HomeIcon } from '../ui/icons';
import { navigation } from '../../content/es/navigation';

/**
 * `01-public-home-directory.png` header. A Server Component (master prompt
 * §11/§101 — no interaction lives here, so no `"use client"`); the global
 * commerce search that visually sits inside the hero below is its own
 * Client Component (`features/search`).
 */
export function PublicHeader() {
  return (
    <header className="border-b border-(--color-border) bg-(--color-surface)">
      {/*
       * Nav stays visible (wraps) at every width instead of `hidden md:flex`
       * with no mobile alternative — a real gap this pass found and fixed:
       * no hamburger/drawer exists yet, so hiding the nav below `md` would
       * make Inicio/Preguntas frecuentes/Mis Pagos unreachable on mobile
       * (master prompt §33/§56 — "no comprimir desktop" cuts both ways: a
       * capability real on desktop must stay reachable on mobile too).
       */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center text-(--color-brand-blue)">
            <HomeIcon className="h-7 w-7" />
          </span>
          <span className="leading-tight">
            <span className="block text-xs font-medium text-(--color-fg-faint)">{navigation.portalLabel}</span>
            <span className="flex items-baseline gap-1.5 text-lg">
              <span className="font-bold text-(--color-brand-blue)">{navigation.brandName}</span>
              <span className="font-bold text-(--color-orange)">{navigation.brandNameAccent}</span>
              <span className="text-xs font-semibold text-(--color-fg-faint)">{navigation.brandBadge}</span>
            </span>
          </span>
        </Link>

        <nav
          aria-label="Principal"
          className="order-3 flex w-full flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-(--color-brand-blue) sm:order-none sm:w-auto"
        >
          <Link href="/" className="hover:underline">
            {navigation.inicio}
          </Link>
          <Link href="/#faq" className="hover:underline">
            {navigation.preguntasFrecuentes}
          </Link>
          <Link href="/mis-pagos" className="hover:underline">
            {navigation.misPagos}
          </Link>
        </nav>

        <Link
          href="/#soporte"
          className="rounded-pill bg-(--color-ink) px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {navigation.soporte}
        </Link>
      </div>
    </header>
  );
}
