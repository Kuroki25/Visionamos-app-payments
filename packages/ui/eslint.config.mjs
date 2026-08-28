import { base } from '@repo/eslint-config/base';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  ...base,
  reactHooks.configs.flat['recommended-latest'],
  {
    ignores: ['dist/**'],
  },
];
