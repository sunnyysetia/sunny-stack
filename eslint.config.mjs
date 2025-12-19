import eslint from '@eslint/js';
import { tanstackConfig } from '@tanstack/eslint-config';
import pluginRouter from '@tanstack/eslint-plugin-router';
import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const TS_FILES = ['**/*.{ts,tsx,mts,cts}'];

/**
 * Some shareable flat configs (for example, TanStack’s) may still set
 * `languageOptions.parserOptions.project` internally.
 *
 * We use typescript-eslint Project Service (`projectService`) for type-aware linting.
 * When Project Service is enabled, `parserOptions.project` is redundant and can cause
 * a parsing error:
 *   "Enabling 'project' does nothing when 'projectService' is enabled..."
 *
 * This helper strips `parserOptions.project` from imported configs so we can keep
 * Project Service enabled without fighting upstream configs.
 *
 * If upstream configs stop setting `parserOptions.project`, you can delete this helper
 * and the `.map(stripParserOptionsProject)` calls.
 */
function stripParserOptionsProject(config) {
  const project = config?.languageOptions?.parserOptions?.project;
  if (project === undefined) return config;

  const next = {
    ...config,
    languageOptions: {
      ...config.languageOptions,
      parserOptions: {
        ...config.languageOptions.parserOptions,
      },
    },
  };

  delete next.languageOptions.parserOptions.project;

  if (Object.keys(next.languageOptions.parserOptions).length === 0) {
    delete next.languageOptions.parserOptions;
  }

  return next;
}

function onlyForTs(config) {
  if (config && 'files' in config) return config;
  return { ...config, files: TS_FILES };
}

export default defineConfig([
  // 1) Global ignores (repo-wide)
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/.vite/**',
      '**/coverage/**',

      // Generated route tree is allowed
      'apps/dashboard/src/**/routeTree.gen.ts',
    ],
  },

  // 2) Base JS recommended (applies to JS files, including eslint.config.mjs)
  eslint.configs.recommended,

  // 3) TypeScript recommended (type-aware) but ONLY for TS/TSX files
  ...tseslint.configs.recommendedTypeChecked.map(onlyForTs),

  // 4) Enable Project Service ONLY for TS/TSX files
  {
    files: TS_FILES,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // 5) Import sorting (autofixable)
  {
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'], // side effect imports
            ['^node:', '^@?\\w'], // node builtins, external packages
            ['^@/'], // your alias
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'], // parent
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'], // same-folder
            ['^.+\\.css$'], // styles
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
    },
  },

  // 6) Enforce kebab-case filenames
  {
    files: [
      'apps/api/{src,scripts,test}/**/*.{ts,tsx,js,jsx}',
      'apps/dashboard/src/**/*.{ts,tsx,js,jsx}',
      'packages/*/src/**/*.{ts,tsx,js,jsx}',
    ],
    plugins: { unicorn },
    rules: {
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
          multipleFileExtensions: true,
        },
      ],
    },
  },

  // 7) API specific (Node + Jest + your rule tweaks)
  {
    files: ['apps/api/**/*.{ts,js,mjs,cjs}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  },

  // 8) Dashboard specific (TanStack config + Router recommended)
  ...tanstackConfig.map(stripParserOptionsProject).map((c) => ({
    ...c,
    files: ['apps/dashboard/**/*.{ts,tsx,js,jsx}'],
  })),

  ...pluginRouter.configs['flat/recommended'].map(stripParserOptionsProject).map((c) => ({
    ...c,
    files: ['apps/dashboard/**/*.{ts,tsx}'],
  })),

  // 8.1) Dashboard: allow Promise-returning handlers in JSX attributes (react-hook-form handleSubmit etc)
  {
    files: ['apps/dashboard/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
    },
  },

  // 9) Disable other import sorting rules globally to avoid circular fixes.
  // We use simple-import-sort as the single source of truth for import ordering.
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    rules: {
      'sort-imports': 'off',
      'import/order': 'off',
    },
  },

  // 10) Router override (optional)
  {
    files: ['apps/dashboard/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/only-throw-error': [
        'error',
        {
          allow: [{ from: 'package', package: '@tanstack/router-core', name: 'Redirect' }],
        },
      ],
    },
  },

  // 11) Prettier compatibility (keep last)
  eslintConfigPrettier,
]);
