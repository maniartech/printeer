import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DefaultBrowserFactory, DefaultBrowserManager } from '../browser';
import { Browser } from 'puppeteer';

// Force test environment and disable real browser launches for unit tests
process.env.NODE_ENV = 'test';

// Mock puppeteer for unit tests to avoid real browser launches
vi.mock('puppeteer', () => {
  const mockBrowser = {
    isConnected: () => true,
    close: vi.fn().mockResolvedValue(undefined),
    newPage: vi.fn().mockResolvedValue({
      goto: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue('Test Title'),
      close: vi.fn().mockResolvedValue(undefined),
      title: vi.fn().mockResolvedValue('Test Title')
    }),
    version: vi.fn().mockResolvedValue('Chrome/91.0.4472.124'),
    process: vi.fn().mockReturnValue({
      pid: 12345,
      killed: false,
      kill: vi.fn()
    })
  };

  return {
    default: {
      launch: vi.fn().mockResolvedValue(mockBrowser),
      executablePath: vi.fn().mockReturnValue('/mock/path/to/chrome')
    },
    launch: vi.fn().mockResolvedValue(mockBrowser),
    executablePath: vi.fn().mockReturnValue('/mock/path/to/chrome')
  };
});

describe('DefaultBrowserFactory', () => {
  let browserFactory: DefaultBrowserFactory;
  let createdBrowsers: Browser[] = [];

  beforeEach(() => {
    browserFactory = new DefaultBrowserFactory();
    createdBrowsers = [];
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up any created browsers
    await Promise.all(
      createdBrowsers.map(async (browser) => {
        try {
          if (browser && browser.isConnected && browser.isConnected()) {
            await browser.close();
          }
        } catch (error) {
          // Ignore cleanup errors in tests
        }
      })
    );
    createdBrowsers = [];
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
      const title = await page.evaluate(() => 'Test Title');
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
      const options = browserFactory.getOptimalLaunchOptions();

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
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up browser manager and all browsers
    try {
      await browserManager.shutdown();
    } catch (error) {
      // Ignore cleanup errors in tests
    }

    // Additional cleanup for any browsers that might have been missed
    await Promise.all(
      createdBrowsers.map(async (browser) => {
        try {
          if (browser && browser.isConnected && browser.isConnected()) {
            await browser.close();
          }
        } catch (error) {
          // Ignore cleanup errors in tests
        }
      })
    );
    createdBrowsers = [];
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
      createdBrowsers.push(browser2.browser);

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
      createdBrowsers.push(browser2.browser);

      const status = browserManager.getPoolStatus();
      expect(status.metrics.reused).toBeGreaterThan(0);
    });
  });
});