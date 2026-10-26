import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/node_modules/', '**/dist/', '**/coverage/', '**/.expo/', '**/expo-env.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      // Constitución, art. VIII.1: nada de `any` ni `@ts-ignore`.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': true, 'ts-expect-error': 'allow-with-description' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Constitución, art. II.2: el dominio es puro.
    files: ['packages/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', 'expo', 'expo-*', '@expo/*'],
              message: 'El dominio no depende de la interfaz.',
            },
            {
              group: ['fastify', '@fastify/*', 'drizzle-orm', 'drizzle-orm/*', 'pg', 'postgres'],
              message: 'El dominio no depende del servidor ni de la base de datos.',
            },
            { group: ['node:*'], message: 'El dominio no usa red, disco ni procesos.' },
            { group: ['@smartnomic/*'], message: 'El dominio no depende de otros paquetes.' },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'El dominio no lee el reloj: la fecha de hoy entra como parámetro.',
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'El dominio no lee el reloj: la fecha de hoy entra como parámetro.',
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: 'El dominio no usa azar.',
        },
      ],
    },
  },
  {
    // Constitución, art. II.1: `packages/api` solo depende del dominio.
    files: ['packages/api/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@smartnomic/server', '@smartnomic/mobile'],
              message: 'El contrato no depende de las apps.',
            },
          ],
        },
      ],
    },
  },
);
