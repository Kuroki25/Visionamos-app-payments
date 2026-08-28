import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

import { base } from './base.js';

export const next = [
  ...base,
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Server Components are the default (section 9); a rule that fires on
      // every "use client" file would be noise, so this stays a warning
      // reviewers can catch, not a hard error.
      'react/react-in-jsx-scope': 'off',
    },
  },
];

export default next;
