import { next } from '@repo/eslint-config/next';

export default [
  ...next,
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'playwright-report/**',
      'test-results/**',
    ],
  },
];
