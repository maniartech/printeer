import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DefaultBrowserFactory, DefaultBrowserManager } from '../browser';
import { Browser } from 'puppeteer';
import { execSync } from 'child_process';

// Force test environment and headless mode
process.env.NODE_ENV = 'test';

// Helper function to kill any remaining Chrome processes
async function killRemainingChromeProcesses() {
  try {
    if (process.platform === 'win32') {
      // On Windows, kill Chrome processes that might be left over
      execSync('taskkill /F /IM chrome.exe /T 2>nul || exit 0', { stdio: 'ignore' });
      execSync('taskkill /F /IM chromium.exe /T 2>nul || exit 0', { stdio: 'ignore' });
    } else {
      // On Unix-like systems
      execSync('pkill -f chrome 2>/dev/null || true', { stdio: 'ignore' });
      execSync('pkill -f chromium 2>/dev/null || true', { stdio: 'ignore' });
    }
  } catch (error) {
    // Ignore errors - processes might not exist
  }
}

describe('DefaultBrowserFactory', () => {
  let browserFactory: DefaultBrowserFactory;
  let createdBrowsers: Browser[] = [];

  beforeEach(() => {
    browserFactory = new DefaultBrowserFactory();
    createdBrowsers = [];
  });

  afterEach(async () => {
    // Ensure all created browsers are properly closed and processes terminated
    await Promise.all(
      createdBrowsers.map(async (browser) => {
        try {
          if (browser && browser.isConnected && browser.isConnected()) {
            const process = browser.process();
            
            // Close browser gracefully first
            await browser.close();
            
            // Wait longer for process termination
            if (process && !process.killed) {
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Force kill if still alive
              try {
                if (!process.killed) {
                  process.kill('SIGKILL');
                  // Wait a bit more after force kill
                  await new Promise(resolve => setTimeout(resolve, 200));
                }
              } catch (error) {
                // Process already dead, ignore
              }
            }
          }
        } catch (error) {
          console.warn('Error during browser cleanup:', error);
        }
      })
    );
    createdBrowsers = [];
    
    // Additional cleanup - wait a bit more to ensure all processes are terminated
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Kill any remaining Chrome processes that might have been left behind
    await killRemainingChromeProcesses();
  });

  describe('createBrowser', () => {
    it('should create browser successfully', async () => {
      const browser = await browserFactory.createBrowser();
      createdBrowsers.push(browser);

      expect(browser).toBeDefined();
      expect(browser.isConnected()).toBe(true);
      
      // Test basic browser functionality
      const page = await browser.newPage();
      await page.goto('data:text/html,<h1>Test</h1>');
      const title = await page.evaluate(() => document.title);
      await page.close();
      
      expect(typeof title).toBe('string');
    });

    it('should validate browser correctly', async () => {
      const browser = await browserFactory.createBrowser();
      createdBrowsers.push(browser);

      const isValid = await browserFactory.validateBrowser(browser);
      expect(isValid).toBe(true);
    });

    it('should get browser version', async () => {
      const browser = await browserFactory.createBrowser();
      createdBrowsers.push(browser);

      const version = await browserFactory.getBrowserVersion(browser);
      expect(version).toMatch(/Chrome|Chromium/);
    });

    it('should return optimal launch options', () => {
      const options = browserFactory.getOptimalLaunchOptions() as any;

      expect(options).toHaveProperty('headless', true);
      expect(options).toHaveProperty('timeout', 30000);
      expect(options).toHaveProperty('args');
      expect(Array.isArray(options.args)).toBe(true);
    });
  });
});

describe('DefaultBrowserManager', () => {
  let browserManager: DefaultBrowserManager;
  let createdBrowsers: Browser[] = [];

  beforeEach(() => {
    // Create browser manager with test configuration
    browserManager = new DefaultBrowserManager(undefined, {
      minSize: 1,
      maxSize: 3,
      idleTimeout: 1000, // 1 second for faster tests
      cleanupInterval: 500 // 0.5 seconds for faster tests
    });
  });

  afterEach(async () => {
    // Clean up browser manager and all browsers
    try {
      await browserManager.shutdown();
    } catch (error) {
      console.warn('Error during browser manager shutdown:', error);
    }

    // Additional cleanup for any browsers that might have been missed
    await Promise.all(
      createdBrowsers.map(async (browser) => {
        try {
          if (browser && browser.isConnected && browser.isConnected()) {
            const process = browser.process();
            
            // Close browser gracefully first
            await browser.close();
            
            // Wait longer for process termination
            if (process && !process.killed) {
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Force kill if still alive
              try {
                if (!process.killed) {
                  process.kill('SIGKILL');
                  // Wait a bit more after force kill
                  await new Promise(resolve => setTimeout(resolve, 200));
                }
              } catch (error) {
                // Process already dead, ignore
              }
            }
          }
        } catch (error) {
          console.warn('Error during additional browser cleanup:', error);
        }
      })
    );
    createdBrowsers = [];
    
    // Additional cleanup - wait a bit more to ensure all processes are terminated
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Kill any remaining Chrome processes that might have been left behind
    await killRemainingChromeProcesses();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await browserManager.initialize();

      const status = browserManager.getPoolStatus();
      expect(status.totalBrowsers).toBeGreaterThan(0);
    });

    it('should not initialize twice', async () => {
      await browserManager.initialize();
      const status1 = browserManager.getPoolStatus();
      
      await browserManager.initialize();
      const status2 = browserManager.getPoolStatus();

      // Should have same number of browsers
      expect(status2.totalBrowsers).toBe(status1.totalBrowsers);
    });
  });

  describe('browser acquisition and release', () => {
    beforeEach(async () => {
      await browserManager.initialize();
    });

    it('should get browser from pool', async () => {
      const browserInstance = await browserManager.getBrowser();
      createdBrowsers.push(browserInstance.browser);

      expect(browserInstance).toBeDefined();
      expect(browserInstance.id).toBeDefined();
      expect(browserInstance.browser).toBeDefined();
      expect(browserInstance.isHealthy).toBe(true);

      const status = browserManager.getPoolStatus();
      expect(status.busyBrowsers).toBe(1);
    });

    it('should release browser back to pool', async () => {
      const browserInstance = await browserManager.getBrowser();
      createdBrowsers.push(browserInstance.browser);
      
      await browserManager.releaseBrowser(browserInstance);

      const status = browserManager.getPoolStatus();
      expect(status.busyBrowsers).toBe(0);
      expect(status.availableBrowsers).toBe(1);
    });

    it('should reuse released browsers', async () => {
      const browser1 = await browserManager.getBrowser();
      createdBrowsers.push(browser1.browser);
      
      await browserManager.releaseBrowser(browser1);

      const browser2 = await browserManager.getBrowser();
      
      expect(browser2.id).toBe(browser1.id);
    });

    it('should create new browser when pool is empty', async () => {
      const browser1 = await browserManager.getBrowser();
      const browser2 = await browserManager.getBrowser();
      
      createdBrowsers.push(browser1.browser, browser2.browser);

      expect(browser1.id).not.toBe(browser2.id);
    });
  });

  describe('pool management', () => {
    beforeEach(async () => {
      await browserManager.initialize();
    });

    it('should provide accurate pool status', async () => {
      const browser1 = await browserManager.getBrowser();
      const browser2 = await browserManager.getBrowser();
      
      createdBrowsers.push(browser1.browser, browser2.browser);

      const status = browserManager.getPoolStatus();
      
      expect(status.totalBrowsers).toBe(2);
      expect(status.busyBrowsers).toBe(2);
      expect(status.availableBrowsers).toBe(0);
      expect(status.healthyBrowsers).toBe(2);
      expect(status.metrics).toBeDefined();
    });

    it('should warm up pool to minimum size', async () => {
      const status = browserManager.getPoolStatus();
      expect(status.totalBrowsers).toBeGreaterThanOrEqual(1); // minSize = 1
    });
  });

  describe('shutdown', () => {
    beforeEach(async () => {
      await browserManager.initialize();
    });

    it('should shutdown gracefully', async () => {
      const browserInstance = await browserManager.getBrowser();
      createdBrowsers.push(browserInstance.browser);
      
      await browserManager.shutdown();
      
      const status = browserManager.getPoolStatus();
      expect(status.totalBrowsers).toBe(0);
    });

    it('should prevent new browser acquisition during shutdown', async () => {
      await browserManager.shutdown();

      await expect(browserManager.getBrowser()).rejects.toThrow('Browser manager is shutting down');
    });
  });

  describe('metrics tracking', () => {
    beforeEach(async () => {
      await browserManager.initialize();
    });

    it('should track browser creation metrics', async () => {
      const browserInstance = await browserManager.getBrowser();
      createdBrowsers.push(browserInstance.browser);
      
      const status = browserManager.getPoolStatus();
      expect(status.metrics.created).toBeGreaterThan(0);
    });

    it('should track browser reuse metrics', async () => {
      const browser1 = await browserManager.getBrowser();
      createdBrowsers.push(browser1.browser);
      
      await browserManager.releaseBrowser(browser1);
      
      const browser2 = await browserManager.getBrowser();
      
      const status = browserManager.getPoolStatus();
      expect(status.metrics.reused).toBeGreaterThan(0);
    });
  });
});