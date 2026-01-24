import { baseConfig, nodeIgnores } from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  nodeIgnores,
  {
    files: ['src/**/*.ts'],
  },
];
