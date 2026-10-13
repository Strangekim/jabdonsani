import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** 엔진의 node:test와 분리하여 실제 React 화면을 jsdom에서 검증한다. */
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: ['tests/basketball-ui/**/*.test.tsx'],
    setupFiles: ['tests/basketball-ui/setup.ts'],
    css: true,
    testTimeout: 30_000,
  },
});
