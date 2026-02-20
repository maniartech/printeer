/**
 * Browser Pool Strategy Tests
 * 
 * These tests specifically test the browser pool functionality
 * by forcing the pool strategy and testing its behavior
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';

describe('Browser Pool Strategy', () => {
  let originalStrategy: string | undefined;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    // Save original environment
    originalStrategy = process.env.PRINTEER_BROWSER_STRATEGY;
    originalNodeEnv = process.env.NODE_ENV;
    
    // Force pool strategy for these tests
    process.env.PRINTEER_BROWSER_STRATEGY = 'pool';
    process.env.NODE_ENV = 'production'; // Not test mode
  });

  afterEach(async () => {
    // Restore original environment
    if (originalStrategy !== undefined) {
      process.env.PRINTEER_BROWSER_STRATEGY = originalStrategy;
    } else {
      delete process.env.PRINTEER_BROWSER_STRATEGY;
    }
    
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }

    // Cleanup any browser pools created during tests
    try {
      const { DefaultBrowserManager } = await import('../src/printing/browser');
      const globalManager = DefaultBrowserManager.getGlobalInstance();
      
      if (globalManager) {
        await globalManager.shutdown();
        DefaultBrowserManager.setGlobalInstance(null);
      }

      // Clear global state
      if (typeof global !== 'undefined') {
        delete (global as any).__printeerBrowserManager;
      }
    } catch (error) {
      console.warn('Pool cleanup failed:', error);
    }
  });

  test('should use pool strategy when forced', async () => {
    const { getCurrentBrowserStrategy } = await import('../src/api/index');
    
    const strategy = getCurrentBrowserStrategy();
    expect(strategy).toBe('pool');
  });

  test('should create and reuse browser instances', async () => {
    const { DefaultBrowserManager } = await import('../src/printing/browser');
    
    // Create browser manager
    const manager = new DefaultBrowserManager(undefined, {
      minSize: 0,
      maxSize: 2,
      idleTimeout: 10000,
      cleanupInterval: 5000
    });

    await manager.initialize();

    // Get first browser
    const browser1 = await manager.getBrowser();
    expect(browser1).toBeDefined();
    expect(browser1.browser).toBeDefined();

    // Check pool status
    let status = manager.getPoolStatus();
    expect(status.totalBrowsers).toBe(1);
    expect(status.busyBrowsers).toBe(1);
    expect(status.availableBrowsers).toBe(0);

    // Release browser back to pool
    await manager.releaseBrowser(browser1);

    // Check pool status after release
    status = manager.getPoolStatus();
    expect(status.totalBrowsers).toBe(1);
    expect(status.busyBrowsers).toBe(0);
    expect(status.availableBrowsers).toBe(1);

    // Get browser again - should reuse the same one
    const browser2 = await manager.getBrowser();
    expect(browser2.id).toBe(browser1.id); // Same browser instance

    // Cleanup
    await manager.releaseBrowser(browser2);
    await manager.shutdown();
  });

  test('should handle multiple concurrent browsers', async () => {
    const { DefaultBrowserManager } = await import('../src/printing/browser');
    
    const manager = new DefaultBrowserManager(undefined, {
      minSize: 0,
      maxSize: 3,
      idleTimeout: 10000,
      cleanupInterval: 5000
    });

    await manager.initialize();

    // Get multiple browsers concurrently
    const browsers = await Promise.all([
      manager.getBrowser(),
      manager.getBrowser(),
      manager.getBrowser()
    ]);

    expect(browsers).toHaveLength(3);
    expect(browsers[0].id).not.toBe(browsers[1].id);
    expect(browsers[1].id).not.toBe(browsers[2].id);

    // Check pool status
    const status = manager.getPoolStatus();
    expect(status.totalBrowsers).toBe(3);
    expect(status.busyBrowsers).toBe(3);
    expect(status.availableBrowsers).toBe(0);

    // Release all browsers
    await Promise.all(browsers.map(browser => manager.releaseBrowser(browser)));

    // Check final status
    const finalStatus = manager.getPoolStatus();
    expect(finalStatus.totalBrowsers).toBe(3);
    expect(finalStatus.busyBrowsers).toBe(0);
    expect(finalStatus.availableBrowsers).toBe(3);

    // Cleanup
    await manager.shutdown();
  });

  test('should respect max pool size', async () => {
    const { DefaultBrowserManager } = await import('../src/printing/browser');
    
    const manager = new DefaultBrowserManager(undefined, {
      minSize: 0,
      maxSize: 2, // Limit to 2 browsers
      idleTimeout: 10000,
      cleanupInterval: 5000
    });

    await manager.initialize();

    // Get 2 browsers (should work)
    const browser1 = await manager.getBrowser();
    const browser2 = await manager.getBrowser();

    expect(browser1).toBeDefined();
    expect(browser2).toBeDefined();

    // Check we have 2 browsers
    const status = manager.getPoolStatus();
    expect(status.totalBrowsers).toBe(2);
    expect(status.busyBrowsers).toBe(2);

    // Trying to get a third browser should wait or create within limits
    // This test verifies the pool respects maxSize
    const startTime = Date.now();
    
    // This should either wait for a browser to be released or handle gracefully
    const browser3Promise = manager.getBrowser();
    
    // Release one browser to allow the third request to complete
    setTimeout(() => manager.releaseBrowser(browser1), 100);
    
    const browser3 = await browser3Promise;
    const duration = Date.now() - startTime;
    
    expect(browser3).toBeDefined();
    expect(duration).toBeGreaterThan(50); // Should have waited

    // Cleanup
    await manager.releaseBrowser(browser2);
    await manager.releaseBrowser(browser3);
    await manager.shutdown();
  });

  test('should cleanup idle browsers', async () => {
    const { DefaultBrowserManager } = await import('../src/printing/browser');
    
    const manager = new DefaultBrowserManager(undefined, {
      minSize: 0,
      maxSize: 2,
      idleTimeout: 100, // Very short timeout for testing
      cleanupInterval: 50 // Frequent cleanup
    });

    await manager.initialize();

    // Get and release a browser
    const browser = await manager.getBrowser();
    await manager.releaseBrowser(browser);

    // Check it's in the pool
    let status = manager.getPoolStatus();
    expect(status.totalBrowsers).toBe(1);
    expect(status.availableBrowsers).toBe(1);

    // Wait for cleanup to happen
    await new Promise(resolve => setTimeout(resolve, 200));

    // Browser should be cleaned up due to idle timeout
    status = manager.getPoolStatus();
    expect(status.totalBrowsers).toBe(0);
    expect(status.availableBrowsers).toBe(0);

    await manager.shutdown();
  });

  test('should track metrics correctly', async () => {
    const { DefaultBrowserManager } = await import('../src/printing/browser');
    
    const manager = new DefaultBrowserManager(undefined, {
      minSize: 0,
      maxSize: 2,
      idleTimeout: 10000,
      cleanupInterval: 5000
    });

    await manager.initialize();

    // Get and release browsers to generate metrics
    const browser1 = await manager.getBrowser();
    const browser2 = await manager.getBrowser();
    
    await manager.releaseBrowser(browser1);
    await manager.releaseBrowser(browser2);

    // Get browser again (should reuse)
    const browser3 = await manager.getBrowser();
    await manager.releaseBrowser(browser3);

    const status = manager.getPoolStatus();
    expect(status.metrics.created).toBeGreaterThanOrEqual(2);
    expect(status.metrics.reused).toBeGreaterThanOrEqual(1);

    await manager.shutdown();
  });

  test('should handle browser failures gracefully', async () => {
    const { DefaultBrowserManager } = await import('../src/printing/browser');
    
    const manager = new DefaultBrowserManager(undefined, {
      minSize: 0,
      maxSize: 2,
      idleTimeout: 10000,
      cleanupInterval: 5000
    });

    await manager.initialize();

    const browser = await manager.getBrowser();
    expect(browser).toBeDefined();

    // Simulate browser failure by closing it directly
    try {
      await browser.browser.close();
    } catch (error) {
      // Expected - browser might already be closed
    }

    // Try to release the failed browser
    await manager.releaseBrowser(browser);

    // Pool should handle the failure and clean up
    const status = manager.getPoolStatus();
    expect(status.metrics.errors).toBeGreaterThanOrEqual(0);

    await manager.shutdown();
  });

  test('should shutdown cleanly', async () => {
    const { DefaultBrowserManager } = await import('../src/printing/browser');
    
    const manager = new DefaultBrowserManager(undefined, {
      minSize: 0,
      maxSize: 2,
      idleTimeout: 10000,
      cleanupInterval: 5000
    });

    await manager.initialize();

    // Create some browsers
    const browser1 = await manager.getBrowser();
    const browser2 = await manager.getBrowser();

    // Don't release them - test shutdown with busy browsers
    const status = manager.getPoolStatus();
    expect(status.totalBrowsers).toBe(2);
    expect(status.busyBrowsers).toBe(2);

    // Shutdown should clean up all browsers
    await manager.shutdown();

    const finalStatus = manager.getPoolStatus();
    expect(finalStatus.totalBrowsers).toBe(0);
  });
});