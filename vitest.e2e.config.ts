import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * End-to-end test config. These tests drive the *built* CLI/library against a
 * real bundled Chromium, so they run SERIALLY (fileParallelism: false) to avoid
 * browser-launch contention — running dozens of browser forks at once is flaky,
 * especially on Windows CI. Requires `npm run build` first.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    fileParallelism: false, // run e2e files one at a time
    include: ['tests/e2e/**/*.{test,spec}.ts'],
    testTimeout: 90000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      PRINTEER_BUNDLED_ONLY: '1',
      PRINTEER_BROWSER_STRATEGY: 'oneshot',
      PRINTEER_CLI_MODE: '1',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
