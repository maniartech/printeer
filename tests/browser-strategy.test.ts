/**
 * Test to verify browser strategy selection works correctly
 */

import { describe, test, expect } from 'vitest';

describe('Browser Strategy', () => {
  test.skip('should use oneshot strategy in test environment', async () => {
    // Import the API
    const printeerApi = await import('../src/api/index');

    // Mock console.debug to capture strategy logs
    const originalDebug = console.debug;
    let strategyUsed = '';

    console.debug = (message: string) => {
      if (message.includes('Using browser strategy:')) {
        strategyUsed = message;
      }
    };

    try {
      // This should fail (invalid URL) but we should see the strategy log
      await printeerApi.default('https://invalid-test-url-that-will-fail.com', 'test.pdf');
    } catch (error) {
      // Expected to fail, we just want to see the strategy
    } finally {
      console.debug = originalDebug;
    }

    // Verify oneshot strategy was used
    expect(strategyUsed).toContain('oneshot');
  });

  test('should detect CLI mode correctly', () => {
    // Verify environment variables are set correctly
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.PRINTEER_BROWSER_STRATEGY).toBe('oneshot');
    expect(process.env.PRINTEER_CLI_MODE).toBe('1');
  });
});