import type { Metadata } from 'next';

import '../env';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dashboard Visionamos',
  description: 'Panel administrativo de Visionamos',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
