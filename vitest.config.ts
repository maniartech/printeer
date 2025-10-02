import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', 'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'bin'],
    testTimeout: 30000, // 30 seconds - reduced for faster feedback
    hookTimeout: 10000, // 10 seconds for beforeEach/afterEach hooks
    setupFiles: ['./tests/setup.ts'],
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