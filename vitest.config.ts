import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks', // Use child processes (not threads) so each test file gets its own process.env
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', 'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // The browser-driven e2e suite runs under its own serial config
    // (vitest.e2e.config.ts) to avoid Chrome-launch contention when dozens of
    // unit-test forks run in parallel. Keep it out of the default (parallel) run.
    exclude: ['node_modules', 'dist', 'bin', '**/tests/isolated/**', 'tests/isolated/**', '**/isolated/**', 'tests/e2e/**'],
    testTimeout: 30000, // 30 seconds for browser tests
    hookTimeout: 10000, // 10 seconds for hooks
    setupFiles: ['./tests/setup.ts'],
    globalSetup: './tests/global-setup.ts',
    globalTeardown: './tests/global-teardown.ts',
    env: {
      NODE_ENV: 'test',
      PRINTEER_BUNDLED_ONLY: '1',
      PRINTEER_BROWSER_TIMEOUT: '10000',
      PRINTEER_BROWSER_POOL_MIN: '0',
      PRINTEER_BROWSER_POOL_MAX: '1',
      PRINTEER_BROWSER_STRATEGY: 'oneshot', // Force oneshot for all tests
      PRINTEER_CLI_MODE: '1' // Ensure CLI mode detection
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'bin/',
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});