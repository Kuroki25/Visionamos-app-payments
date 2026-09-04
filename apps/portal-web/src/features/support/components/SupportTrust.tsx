import Link from 'next/link';

import { home } from '../../../content/es/home';

/** `02-public-home-support.png` "¿Tienes dudas?" / "Paga con confianza" pair. Static, server-rendered — no interaction. */
export function SupportTrust() {
  return (
    <div id="soporte" className="grid gap-4 sm:grid-cols-2">
      <div
        className="flex flex-col justify-between gap-6 rounded-hero p-8"
        style={{ background: 'linear-gradient(135deg, var(--color-brand-navy), var(--color-brand-cyan))' }}
      >
        <h2 className="text-2xl font-bold text-white">{home.support.title}</h2>
        <Link
          href="mailto:soporte@redcooppagos.com"
          className="w-fit rounded-pill bg-white px-6 py-3 text-sm font-semibold text-(--color-ink) transition-opacity hover:opacity-90"
        >
          {home.support.cta}
        </Link>
      </div>

      <div className="flex flex-col justify-center gap-2 rounded-hero border border-(--color-border) bg-(--color-surface) p-8">
        <h2 className="text-2xl font-bold text-(--color-fg)">
          {home.trust.title} <span className="text-(--color-brand-blue)">{home.trust.titleAccent}</span>
        </h2>
        <p className="text-sm text-(--color-fg-faint)">{home.trust.description}</p>
      </div>
    </div>
  );
}
