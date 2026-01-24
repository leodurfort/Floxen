import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Base ESLint configuration shared across all apps
 */
export const baseConfig = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off',
    },
  }
);

/**
 * Ignore patterns for Node.js apps (API)
 */
export const nodeIgnores = {
  ignores: ['node_modules/', 'dist/'],
};

/**
 * Ignore patterns for Next.js apps
 */
export const nextIgnores = {
  ignores: ['node_modules/', '.next/', 'out/'],
};

/**
 * React-specific configuration for Next.js apps
 */
export function withReact(reactPlugin, reactHooksPlugin) {
  return {
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  };
}

export default baseConfig;
