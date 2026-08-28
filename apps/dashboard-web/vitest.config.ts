import path from 'node:path';

import react from '@vitejs/plugin-react';
import { vitestBase } from '@repo/test-config/vitest-base';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    ...vitestBase,
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
