import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // packages/ui ships TypeScript/JSX source (no build step of its own, see
  // docs/ARCHITECTURE.md "Package exports"); Next must transpile it itself.
  transpilePackages: ['@repo/ui'],
};

export default nextConfig;
