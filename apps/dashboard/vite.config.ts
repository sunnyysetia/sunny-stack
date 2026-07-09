import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    devtools(),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    viteReact(),
    tailwindcss(),
  ],
  resolve: {
    // Force a single copy of React/React-DOM into the bundle. `@repo/ui` is
    // consumed as source via the alias below and declares its own `react`
    // dependency, so without dedupe the bundle can end up with two React
    // copies — which nulls the hooks dispatcher and crashes the app with
    // "Cannot read 'useRef' of null".
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@repo/ui': fileURLToPath(new URL('../../packages/ui/src', import.meta.url)),
    },
  },
});
