import type { Metadata } from 'next';

import '../env';
import './globals.css';

export const metadata: Metadata = {
  title: 'Portal Visionamos',
  description: 'Portal público de Visionamos',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
