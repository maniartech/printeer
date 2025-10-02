/**
 * Test setup file
 * 
 * This ensures most tests use the oneshot browser strategy,
 * except for specific pool tests that need to test pool functionality
 */

import { expect } from 'vitest';

// Get the current test file name
const testFile = expect.getState().testPath || '';

// Only force oneshot for non-pool tests
const isPoolTest = testFile.includes('browser-pool') || 
                   testFile.includes('browser-integration') || 
                   testFile.includes('browser-performance');

if (!isPoolTest) {
  // Force oneshot strategy for regular tests
  process.env.PRINTEER_BROWSER_STRATEGY = 'oneshot';
  process.env.NODE_ENV = 'test';
  process.env.PRINTEER_BUNDLED_ONLY = '1';
  process.env.PRINTEER_CLI_MODE = '1';
}

// Ensure no browser pools persist between tests (for all tests)
beforeEach(() => {
  // Clear any global browser manager
  if (typeof global !== 'undefined') {
    delete (global as any).__printeerBrowserManager;
  }
});

afterEach(async () => {
  // Cleanup any remaining browser processes after each test
  try {
    const { performTestCleanup } = await import('../src/test-utils/test-cleanup');
    await performTestCleanup();
  } catch (error) {
    console.warn('Test cleanup failed:', error);
  }
});