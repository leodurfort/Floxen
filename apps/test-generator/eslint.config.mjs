import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import { baseConfig, nextIgnores, withReact } from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  nextIgnores,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ...withReact(reactPlugin, reactHooksPlugin),
  },
];
