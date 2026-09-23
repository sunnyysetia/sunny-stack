import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the `@/*` path alias declared in tsconfig.json.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    // Clear mock call history before every test. Vitest 4's
    // `vi.restoreAllMocks()` no longer resets plain `vi.fn()` mocks (only
    // spies), so module-level mocks would otherwise leak calls across tests.
    clearMocks: true,
  },
});
