import path from 'node:path';
import swc from 'unplugin-swc';
import type { ViteUserConfig } from 'vitest/config';

// Shared vitest config. SWC handles the TypeScript + decorator transform so
// NestJS DI metadata (emitDecoratorMetadata) survives into tests.
export const sharedVitest: ViteUserConfig = {
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { decoratorMetadata: true, legacyDecorator: true },
        target: 'es2023',
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['reflect-metadata'],
    // Clear mock call history before every test. Vitest 4's
    // `vi.restoreAllMocks()` no longer resets plain `vi.fn()` mocks (only
    // spies), so module-level mocks would otherwise leak calls across tests.
    clearMocks: true,
  },
};
