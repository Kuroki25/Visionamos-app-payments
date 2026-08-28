import { base } from './base.js';

export const nest = [
  ...base,
  {
    rules: {
      // Nest modules/controllers/providers are classes used purely for DI
      // metadata (decorators) - "extraneous" is the whole point of a Module.
      '@typescript-eslint/no-extraneous-class': 'off',
      // Constructor-only parameter-property injection is the standard Nest
      // pattern and often has an intentionally empty body.
      '@typescript-eslint/no-empty-function': ['error', { allow: ['constructors'] }],
    },
  },
];

export default nest;
