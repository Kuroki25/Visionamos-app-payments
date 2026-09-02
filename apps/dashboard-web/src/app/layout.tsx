import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { common } from '../content/es/common';
import '../env';
import './globals.css';

/**
 * Self-hosted via `next/font` — same visual font Claude Design's mock
 * loads from a Google Fonts `<link>` (Inter, weights 400/500/600/700/800),
 * but without an external request or layout shift. `next/font` ships with
 * Next.js itself, so this isn't a new dependency.
 */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: common.appName,
  description: common.appDescription,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
