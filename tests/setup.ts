/**
 * Test setup file
 *
 * This ensures most tests use the oneshot browser strategy,
 * except for specific pool tests that need to test pool functionality.
 *
 * IMPORTANT: Heavy cleanup (process killing, taskkill) is ONLY done in
 * global-teardown.ts, NOT after every test. Per-test cleanup is lightweight
 * (just clearing global state references) to avoid adding seconds of
 * overhead to each of the 300+ tests.
 */

import { expect, beforeEach, afterEach } from 'vitest';

// Get the current test file name
const testFile = expect.getState().testPath || '';

// Only force oneshot for non-pool tests
const isPoolTest = testFile.includes('browser-pool') ||
                   testFile.includes('browser-integration') ||
                   testFile.includes('browser.test.ts') ||
                   testFile.includes('browser-performance');

if (!isPoolTest) {
  // Force oneshot strategy for regular tests
  process.env.PRINTEER_BROWSER_STRATEGY = 'oneshot';
  process.env.NODE_ENV = 'test';
  process.env.PRINTEER_BUNDLED_ONLY = '1';
  process.env.PRINTEER_CLI_MODE = '1';
}

// Lightweight per-test cleanup: only clear in-memory global state.
// No process killing, no sleeps, no shell commands.
beforeEach(() => {
  if (typeof global !== 'undefined') {
    delete (global as any).__printeerBrowserManager;
  }
});

afterEach(() => {
  // Only clear global references — no expensive process cleanup here.
  // Heavy cleanup (killing chrome processes) happens once in global-teardown.ts.
  if (typeof global !== 'undefined') {
    delete (global as any).__printeerBrowserManager;
  }
});