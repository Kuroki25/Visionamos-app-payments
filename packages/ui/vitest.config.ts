import react from '@vitejs/plugin-react';
import { vitestBase } from '@repo/test-config/vitest-base';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: vitestBase,
});
