/**
 * Browser Performance Tests
 * 
 * Compare performance characteristics of oneshot vs pool strategies
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync, existsSync } from 'fs';

describe('Browser Performance Tests', () => {
  let tempDir: string;
  let originalStrategy: string | undefined;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    tempDir = join(tmpdir(), `printeer-perf-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    originalStrategy = process.env.PRINTEER_BROWSER_STRATEGY;
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(async () => {
    if (existsSync(tempDir)) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.warn('Failed to cleanup temp dir:', error);
      }
    }

    // Restore environment
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

    // Cleanup browser managers
    try {
      const { DefaultBrowserManager } = await import('../src/printing/browser');
      const globalManager = DefaultBrowserManager.getGlobalInstance();
      
      if (globalManager) {
        await globalManager.shutdown();
        DefaultBrowserManager.setGlobalInstance(null);
      }

      if (typeof global !== 'undefined') {
        delete (global as any).__printeerBrowserManager;
      }
    } catch (error) {
      console.warn('Performance test cleanup failed:', error);
    }
  });

  test('should measure oneshot strategy timing', async () => {
    process.env.PRINTEER_BROWSER_STRATEGY = 'oneshot';
    process.env.NODE_ENV = 'test';

    const { DefaultBrowserManager } = await import('../src/printing/browser');
    
    const manager = new DefaultBrowserManager(undefined, {
      minSize: 0,
      maxSize: 1,
      idleTimeout: 1000,
      cleanupInterval: 500
    });

    const timings: number[] = [];

    // Measure multiple browser creation/destruction cycles
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      
      await manager.initialize();
      const browser = await manager.getBrowser();
      await manager.releaseBrowser(browser);
      await manager.shutdown();
      
      const duration = Date.now() - startTime;
      timings.push(duration);

      // Reset for next iteration
      DefaultBrowserManager.setGlobalInstance(null);
      if (typeof global !== 'undefined') {
        delete (global as any).__printeerBrowserManager;
      }
    }

    const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
    
    console.log(`Oneshot average timing: ${avgTiming}ms`);
    expect(avgTiming).toBeGreaterThan(0);
    expect(timings.length).toBe(3);
  });

  test('should measure pool strategy timing and reuse', async () => {
    process.env.PRINTEER_BROWSER_STRATEGY = 'pool';
    process.env.NODE_ENV = 'production';

    const { DefaultBrowserManager } = await import('../src/printing/browser');
    
    const manager = new DefaultBrowserManager(undefined, {
      minSize: 0,
      maxSize: 2,
      idleTimeout: 10000, // Keep browsers alive
      cleanupInterval: 5000
    });

    await manager.initialize();

    const timings: number[] = [];

    // Measure browser acquisition times (should get faster with reuse)
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      
      const browser = await manager.getBrowser();
      await manager.releaseBrowser(browser);
      
      const duration = Date.now() - startTime;
      timings.push(duration);
    }

    const status = manager.getPoolStatus();
    
    console.log(`Pool timings: ${timings.join(', ')}ms`);
    console.log(`Pool metrics - Created: ${status.metrics.created}, Reused: ${status.metrics.reused}`);
    
    // First acquisition might be slower (browser creation)
    // Subsequent acquisitions should be faster (reuse)
    expect(status.metrics.created).toBeGreaterThanOrEqual(1);
    expect(status.metrics.reused).toBeGreaterThanOrEqual(3); // Should have reused

    await manager.shutdown();
  });

  test('should compare memory usage patterns', async () => {
    const { DefaultBrowserManager } = await import('../src/printing/browser');

    // Test oneshot pattern
    process.env.PRINTEER_BROWSER_STRATEGY = 'oneshot';
    
    const oneshotManager = new DefaultBrowserManager(undefined, {
      minSize: 0,
      maxSize: 1,
      idleTimeout: 1000,
      cleanupInterval: 500
    });

    await oneshotManager.initialize();
    const oneshotBrowser = await oneshotManager.getBrowser();
    await oneshotManager.releaseBrowser(oneshotBrowser);
    
    const oneshotStatus = oneshotManager.getPoolStatus();
    await oneshotManager.shutdown();

    // Test pool pattern
    process.env.PRINTEER_BROWSER_STRATEGY = 'pool';
    
    const poolManager = new DefaultBrowserManager(undefined, {
      minSize: 0,
      maxSize: 2,
      idleTimeout: 10000,
      cleanupInterval: 5000
    });

    await poolManager.initialize();
    const poolBrowser1 = await poolManager.getBrowser();
    const poolBrowser2 = await poolManager.getBrowser();
    await poolManager.releaseBrowser(poolBrowser1);
    await poolManager.releaseBrowser(poolBrowser2);
    
    const poolStatus = poolManager.getPoolStatus();
    await poolManager.shutdown();

    console.log('Oneshot metrics:', oneshotStatus.metrics);
    console.log('Pool metrics:', poolStatus.metrics);

    // Pool should show more browser reuse
    expect(poolStatus.totalBrowsers).toBeGreaterThanOrEqual(oneshotStatus.totalBrowsers);
  });

  test('should handle concurrent load with pool strategy', async () => {
    process.env.PRINTEER_BROWSER_STRATEGY = 'pool';
    process.env.NODE_ENV = 'production';

    const { DefaultBrowserManager } = await import('../src/printing/browser');
    
    const manager = new DefaultBrowserManager(undefined, {
      minSize: 0,
      maxSize: 3,
      idleTimeout: 10000,
      cleanupInterval: 5000
    });

    await manager.initialize();

    const startTime = Date.now();

    // Simulate concurrent load
    const concurrentOperations = Array.from({ length: 6 }, async (_, i) => {
      const browser = await manager.getBrowser();
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await manager.releaseBrowser(browser);
      return i;
    });

    const results = await Promise.all(concurrentOperations);
    const totalTime = Date.now() - startTime;

    const status = manager.getPoolStatus();
    
    console.log(`Concurrent operations completed in ${totalTime}ms`);
    console.log(`Pool handled ${results.length} operations`);
    console.log(`Final pool status:`, status);

    expect(results.length).toBe(6);
    expect(status.metrics.created).toBeLessThanOrEqual(3); // Should not exceed maxSize
    expect(status.metrics.reused).toBeGreaterThanOrEqual(3); // Should have reused browsers

    await manager.shutdown();
  });

  test('should demonstrate pool efficiency vs oneshot', async () => {
    const { DefaultBrowserManager } = await import('../src/printing/browser');

    // Measure oneshot approach (create/destroy each time)
    const oneshotTimes: number[] = [];
    
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      
      const manager = new DefaultBrowserManager(undefined, {
        minSize: 0,
        maxSize: 1,
        idleTimeout: 1000,
        cleanupInterval: 500
      });
      
      await manager.initialize();
      const browser = await manager.getBrowser();
      await manager.releaseBrowser(browser);
      await manager.shutdown();
      
      oneshotTimes.push(Date.now() - startTime);
      
      // Clean up global state
      DefaultBrowserManager.setGlobalInstance(null);
      if (typeof global !== 'undefined') {
        delete (global as any).__printeerBrowserManager;
      }
    }

    // Measure pool approach (reuse browsers)
    const poolManager = new DefaultBrowserManager(undefined, {
      minSize: 0,
      maxSize: 2,
      idleTimeout: 10000,
      cleanupInterval: 5000
    });

    await poolManager.initialize();
    
    const poolTimes: number[] = [];
    
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      
      const browser = await poolManager.getBrowser();
      await poolManager.releaseBrowser(browser);
      
      poolTimes.push(Date.now() - startTime);
    }

    await poolManager.shutdown();

    const avgOneshotTime = oneshotTimes.reduce((a, b) => a + b, 0) / oneshotTimes.length;
    const avgPoolTime = poolTimes.reduce((a, b) => a + b, 0) / poolTimes.length;

    console.log(`Average oneshot time: ${avgOneshotTime}ms`);
    console.log(`Average pool time: ${avgPoolTime}ms`);
    console.log(`Pool efficiency: ${((avgOneshotTime - avgPoolTime) / avgOneshotTime * 100).toFixed(1)}% faster`);

    // Pool should generally be faster after the first browser creation
    expect(avgPoolTime).toBeLessThan(avgOneshotTime);
  });
});