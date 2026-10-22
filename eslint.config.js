import js from '@eslint/js';
import globals from 'globals';
import babelParser from '@babel/eslint-parser';
import hooks from 'eslint-plugin-react-hooks';
import a11y from 'eslint-plugin-jsx-a11y';
export default [
  {
    ignores: ['**/node_modules/**', '**/.next/**', '**/test-results/**', '**/playwright-report/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: { presets: ['@babel/preset-react'] },
      },
      globals: { ...globals.node, ...globals.browser },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^[_A-Z]', varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    files: ['apps/web/**/*.{js,jsx}'],
    plugins: { 'react-hooks': hooks, 'jsx-a11y': a11y },
    rules: {
      ...a11y.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
