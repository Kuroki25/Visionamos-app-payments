// Shared ESLint flat config: JS/TS correctness rules + architectural import
// boundaries (section 37 of the project spec) + Prettier hand-off.
//
// Type-aware rules (no-floating-promises, no-misused-promises, ...) are enabled
// via `projectService: true`, which auto-discovers the nearest tsconfig.json for
// each linted file instead of requiring a manually maintained `project` array —
// important in a monorepo where every app/package has its own tsconfig.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import tseslint from 'typescript-eslint';

/**
 * Architectural boundaries that must hold across the whole monorepo,
 * independent of framework (see docs/ARCHITECTURE.md):
 *   - No app may reach into another app's internals.
 *   - No consumer may deep-import a shared package's internals; only the
 *     package's public entry point ("@repo/x") is a valid import.
 */
const importBoundaries = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [
              '**/apps/api/src/**',
              '**/apps/portal-web/src/**',
              '**/apps/dashboard-web/src/**',
            ],
            message:
              'No importes código interno (src) de otra aplicación. Usa @repo/contracts para tipos/esquemas compartidos.',
          },
          {
            group: ['@repo/*/src', '@repo/*/src/*'],
            message:
              'No importes rutas internas de un paquete compartido. Usa el export público del paquete (import { X } from "@repo/paquete")).',
          },
        ],
      },
    ],
  },
};

export const base = tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/.turbo/**',
      // *.config.mjs files (eslint.config.mjs, postcss.config.mjs, ...) are
      // trivial plugin-registration files, not part of any app/package
      // tsconfig's "include" — linting them under type-aware rules would
      // need their own project-service entry for no real benefit (same
      // exclusion NestJS's own CLI template ships for its eslint.config.mjs).
      '**/*.config.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  importBoundaries,
  prettier,
);

export default base;
