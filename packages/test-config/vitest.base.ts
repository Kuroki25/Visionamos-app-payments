// Shared Vitest project defaults for React apps in this monorepo. Each app's
// vitest.config.ts spreads this in and only overrides what it needs (e.g. its
// own `root`/plugins) — the coverage/environment/reporter policy stays
// consistent across portal-web and dashboard-web.
import type { TestUserConfig } from 'vitest/config';

export const vitestBase: TestUserConfig = {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['@repo/test-config/vitest-setup'],
  css: true,
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html', 'lcov'],
    exclude: ['node_modules/**', '.next/**', '**/*.config.*', '**/*.d.ts', '**/*.stories.*'],
  },
};

export default vitestBase;
