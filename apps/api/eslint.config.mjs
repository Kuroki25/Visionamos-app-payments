import { nest } from '@repo/eslint-config/nest';

export default [
  ...nest,
  {
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
  {
    ignores: ['eslint.config.mjs', 'dist/**'],
  },
  {
    // supertest's `.body` is `any` by design (it can't know a response's
    // shape ahead of time) — asserting on it in integration tests is the
    // normal, expected use of the library, not a real type-safety gap.
    files: ['test/**/*.ts', 'src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
];
