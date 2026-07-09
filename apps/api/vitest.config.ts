import { defineConfig } from 'vitest/config';

import { sharedVitest } from './vitest.shared';

export default defineConfig({
  ...sharedVitest,
  test: { ...sharedVitest.test, include: ['src/**/*.spec.ts'] },
});
