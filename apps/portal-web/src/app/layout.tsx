import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { PublicHeader } from '../components/layout/PublicHeader';
import { common } from '../content/es/common';
import '../env';
import './globals.css';

/**
 * Self-hosted via `next/font`, same family/weights dashboard-web already
 * uses — no external request, no layout shift.
 */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: { default: common.appName, template: `%s — ${common.appName}` },
  description: common.appDescription,
};

/**
 * `PublicHeader` lives here, not in `page.tsx` — it's the shared public
 * shell for every route (Home, Portal detail, Mis Pagos), not Home-specific
 * markup (docs/frontend/PORTAL_WEB_SOURCE_OF_TRUTH.md, "Component Map").
 */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans antialiased">
        <PublicHeader />
        {children}
      </body>
    </html>
  );
}
