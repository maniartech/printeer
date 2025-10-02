/**
 * Batch Strategy Tests
 * 
 * Verify that batch operations use the pool strategy for performance
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';

describe('Batch Strategy Selection', () => {
  let originalStrategy: string | undefined;
  let originalBatchMode: string | undefined;

  beforeEach(() => {
    // Save original environment
    originalStrategy = process.env.PRINTEER_BROWSER_STRATEGY;
    originalBatchMode = process.env.PRINTEER_BATCH_MODE;
  });

  afterEach(() => {
    // Restore original environment
    if (originalStrategy !== undefined) {
      process.env.PRINTEER_BROWSER_STRATEGY = originalStrategy;
    } else {
      delete process.env.PRINTEER_BROWSER_STRATEGY;
    }
    
    if (originalBatchMode !== undefined) {
      process.env.PRINTEER_BATCH_MODE = originalBatchMode;
    } else {
      delete process.env.PRINTEER_BATCH_MODE;
    }

    // Cleanup any browser managers
    try {
      const { DefaultBrowserManager } = require('../src/printing/browser');
      const globalManager = DefaultBrowserManager.getGlobalInstance();
      
      if (globalManager) {
        globalManager.shutdown();
        DefaultBrowserManager.setGlobalInstance(null);
      }

      if (typeof global !== 'undefined') {
        delete (global as any).__printeerBrowserManager;
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('should use pool strategy when PRINTEER_BATCH_MODE is set', async () => {
    // Simulate batch mode
    process.env.PRINTEER_BATCH_MODE = '1';
    process.env.NODE_ENV = 'production'; // Not test mode
    delete process.env.PRINTEER_BROWSER_STRATEGY; // No explicit override

    const { getCurrentBrowserStrategy } = await import('../src/api/index');
    
    const strategy = getCurrentBrowserStrategy();
    expect(strategy).toBe('pool');
  });

  test('should detect batch operation from command line args', async () => {
    // Save original argv
    const originalArgv = [...process.argv];
    
    try {
      // Simulate batch command
      process.argv = ['node', 'run-cli.js', 'batch', 'batch-file.csv'];
      process.env.NODE_ENV = 'production';
      delete process.env.PRINTEER_BROWSER_STRATEGY;

      // Re-import to get fresh strategy detection
      delete require.cache[require.resolve('../src/api/index')];
      const { getCurrentBrowserStrategy } = await import('../src/api/index');
      
      const strategy = getCurrentBrowserStrategy();
      expect(strategy).toBe('pool');
    } finally {
      // Restore argv
      process.argv = originalArgv;
    }
  });

  test('should detect batch operation from multiple URLs', async () => {
    const originalArgv = [...process.argv];
    
    try {
      // Simulate multiple URLs
      process.argv = [
        'node', 'run-cli.js', 'convert',
        'https://example.com/page1',
        'https://example.com/page2',
        'https://example.com/page3'
      ];
      process.env.NODE_ENV = 'production';
      delete process.env.PRINTEER_BROWSER_STRATEGY;

      delete require.cache[require.resolve('../src/api/index')];
      const { getCurrentBrowserStrategy } = await import('../src/api/index');
      
      const strategy = getCurrentBrowserStrategy();
      expect(strategy).toBe('pool');
    } finally {
      process.argv = originalArgv;
    }
  });

  test('should detect batch operation from batch file argument', async () => {
    const originalArgv = [...process.argv];
    
    try {
      // Simulate batch file
      process.argv = ['node', 'run-cli.js', 'convert', 'batch-jobs.csv'];
      process.env.NODE_ENV = 'production';
      delete process.env.PRINTEER_BROWSER_STRATEGY;

      delete require.cache[require.resolve('../src/api/index')];
      const { getCurrentBrowserStrategy } = await import('../src/api/index');
      
      const strategy = getCurrentBrowserStrategy();
      expect(strategy).toBe('pool');
    } finally {
      process.argv = originalArgv;
    }
  });

  test('should detect batch operation from concurrency option', async () => {
    const originalArgv = [...process.argv];
    
    try {
      // Simulate concurrency option (indicates batch processing)
      process.argv = ['node', 'run-cli.js', 'convert', '--concurrency', '3', 'https://example.com'];
      process.env.NODE_ENV = 'production';
      delete process.env.PRINTEER_BROWSER_STRATEGY;

      delete require.cache[require.resolve('../src/api/index')];
      const { getCurrentBrowserStrategy } = await import('../src/api/index');
      
      const strategy = getCurrentBrowserStrategy();
      expect(strategy).toBe('pool');
    } finally {
      process.argv = originalArgv;
    }
  });

  test('should use oneshot for single URL without batch indicators', async () => {
    const originalArgv = [...process.argv];
    
    try {
      // Simulate single URL conversion
      process.argv = ['node', 'run-cli.js', 'convert', 'https://example.com', 'output.pdf'];
      process.env.NODE_ENV = 'production';
      delete process.env.PRINTEER_BROWSER_STRATEGY;
      delete process.env.PRINTEER_BATCH_MODE;

      delete require.cache[require.resolve('../src/api/index')];
      const { getCurrentBrowserStrategy } = await import('../src/api/index');
      
      const strategy = getCurrentBrowserStrategy();
      expect(strategy).toBe('oneshot');
    } finally {
      process.argv = originalArgv;
    }
  });

  test('should override batch detection with explicit strategy', async () => {
    // Set batch mode but override with explicit strategy
    process.env.PRINTEER_BATCH_MODE = '1';
    process.env.PRINTEER_BROWSER_STRATEGY = 'oneshot'; // Explicit override
    process.env.NODE_ENV = 'production';

    const { getCurrentBrowserStrategy } = await import('../src/api/index');
    
    const strategy = getCurrentBrowserStrategy();
    expect(strategy).toBe('oneshot'); // Should respect explicit override
  });

  test('should use pool strategy in test environment when batch mode is set', async () => {
    // Even in test environment, batch operations should use pool
    process.env.PRINTEER_BATCH_MODE = '1';
    process.env.NODE_ENV = 'test';
    delete process.env.PRINTEER_BROWSER_STRATEGY;

    const { getCurrentBrowserStrategy } = await import('../src/api/index');
    
    const strategy = getCurrentBrowserStrategy();
    expect(strategy).toBe('pool'); // Batch should override test environment default
  });
});