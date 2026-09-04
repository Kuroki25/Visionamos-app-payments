import Link from 'next/link';
import type { Metadata } from 'next';

import { misPagos } from '../../content/es/portal';

/**
 * Honest "próximamente" placeholder, not a fake payment history (master
 * prompt §19: "No crear historial de pagos ficticio" — no backend model for
 * a payer's own payment history exists yet, see
 * docs/frontend/PORTAL_WEB_SOURCE_OF_TRUTH.md, "Known Limitations").
 */
export const metadata: Metadata = { title: misPagos.title };

export default function MisPagosPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-20 text-center">
      <h1 className="text-2xl font-bold text-(--color-fg)">{misPagos.title}</h1>
      <p className="text-sm text-(--color-fg-soft)">{misPagos.comingSoonMessage}</p>
      <Link href="/" className="mt-4 text-sm font-semibold text-(--color-brand-blue) hover:underline">
        {misPagos.backToHome}
      </Link>
    </main>
  );
}
