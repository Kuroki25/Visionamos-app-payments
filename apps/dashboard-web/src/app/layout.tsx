import type { Metadata } from 'next';

import { common } from '../content/es/common';
import '../env';
import './globals.css';

export const metadata: Metadata = {
  title: common.appName,
  description: common.appDescription,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
