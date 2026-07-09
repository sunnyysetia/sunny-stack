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

// ─── Shared — applies across every package ───────────────────────────
const sharedConfig = [
  // Global ignores (repo-wide).
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/.vite/**',
      '**/.next/**',
      '**/coverage/**',
      '**/.venv/**',
      // Ambient declaration files carry no logic to lint, and type-aware
      // linting can't associate a bare `.d.ts` with the project service.
      '**/*.d.ts',
      // Claude Code worktrees are gitignored scratch copies of the repo; they
      // must not be linted because they duplicate every source file.
      '.claude/worktrees/**',

      // Local research / scratch (gitignored)
      '.research/**',

      // Archived code kept for reference; will be deleted later.
      '.archive/**',

      // Generated route tree is allowed
      'apps/dashboard/src/**/routeTree.gen.ts',
    ],
  },

  // Base JS recommended (applies to JS files, including eslint.config.mjs).
  eslint.configs.recommended,

  // TypeScript recommended (type-aware) but ONLY for TS/TSX files.
  ...tseslint.configs.recommendedTypeChecked.map(onlyForTs),

  // Enable Project Service ONLY for TS/TSX files.
  {
    files: TS_FILES,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Import sorting (autofixable).
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

  // Enforce kebab-case filenames.
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
          ignore: [/^\$.*$/u], // TanStack Router param files ($caseId.tsx, etc.)
        },
      ],
    },
  },
];

// ─── apps/api ─────────────────────────────────────────────────────────
const apiConfig = [
  // Node globals + rule tweaks.
  {
    files: ['apps/api/**/*.{ts,js,mjs,cjs}'],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // Honour the `_`-prefix convention for intentionally-unused names.
      // Lets `const { content: _content, ...rest } = obj` drop a field
      // without a lint hack. Mirrors what every popular TS preset does.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  // API scripts: operator scripts that parse arbitrary third-party API
  // JSON. Turning off the unsafe-* rules here keeps the scripts ergonomic
  // without weakening the production codebase.
  {
    files: ['apps/api/scripts/**/*.{ts,js,mjs,cjs}'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },

  // Generic engineering guardrails for the Drizzle + NestJS backend.
  {
    files: ['apps/api/src/**/*.{ts,tsx,mts,cts}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        // Ban hand-annotated `sql<Date>` aggregates. Drizzle's node-postgres
        // driver returns timestamp/timestamptz/date columns as raw STRINGS and
        // decodes them to `Date` only through a column codec. A bare
        // ``sql<Date>`max(...)` `` has no codec, so the `<Date>` is a runtime
        // lie: the value is a string and `.getTime()` throws. Use Drizzle's
        // max()/min() helpers (which attach the column's codec), or
        // `.mapWith(column)` for expressions with no helper.
        {
          selector:
            'TaggedTemplateExpression[tag.name="sql"] TSTypeParameterInstantiation TSTypeReference[typeName.name="Date"]',
          message:
            'Do not annotate `sql<Date>` — node-postgres returns timestamps as strings, ' +
            'so without a column codec this is a string at runtime, not a Date. ' +
            'Use Drizzle’s max()/min() helpers, or `.mapWith(column)` for date_trunc/subqueries.',
        },
        // Ban ModuleRef / forwardRef. Both are bandaids over a NestJS module
        // cycle: they hide a real dependency from the constructor and defer the
        // miswire from boot to a runtime call. Cut the cycle structurally with a
        // leaf module instead (a dependency-free data layer both sides can
        // import). `DiscoveryService` / `Reflector` for bootstrap scanning stay
        // allowed — only ModuleRef/forwardRef are banned.
        {
          selector: 'ImportSpecifier[imported.name="ModuleRef"]',
          message:
            'Do not use ModuleRef to resolve a provider at call time — it is a service-locator ' +
            'escape hatch for a module cycle. Break the cycle with a leaf module, ' +
            'then constructor-inject the dependency.',
        },
        {
          selector: 'ImportSpecifier[imported.name="forwardRef"]',
          message:
            'Do not use forwardRef — it keeps the cyclic module graph and only defers reference ' +
            'resolution. Break the cycle structurally with a leaf module, ' +
            'then constructor-inject the dependency.',
        },
      ],
    },
  },
];

// ─── apps/dashboard ───────────────────────────────────────────────────
const dashboardConfig = [
  // TanStack base config + Router recommended.
  ...tanstackConfig.map(stripParserOptionsProject).map((c) => ({
    ...c,
    files: ['apps/dashboard/**/*.{ts,tsx,js,jsx}'],
  })),

  ...pluginRouter.configs['flat/recommended'].map(stripParserOptionsProject).map((c) => ({
    ...c,
    files: ['apps/dashboard/**/*.{ts,tsx}'],
  })),

  // Override TanStack's array-type rule and allow Promise-returning handlers.
  {
    files: ['apps/dashboard/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/array-type': 'off',
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

  // Disable other import-sorting rules so simple-import-sort stays the
  // single source of truth (avoids circular fixes). Lives in this group
  // because it must come AFTER the TanStack config — that's what turns
  // `import/order` on.
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    rules: {
      'sort-imports': 'off',
      'import/order': 'off',
    },
  },

  // Router: allow throwing TanStack's `Redirect`.
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
];

// Flat config is order-sensitive — later entries override earlier ones for
// a matching file. Keep the package groups in this order, and Prettier
// last so it wins any formatting-rule conflict.
export default defineConfig([
  ...sharedConfig,
  ...apiConfig,
  ...dashboardConfig,
  eslintConfigPrettier,
]);
