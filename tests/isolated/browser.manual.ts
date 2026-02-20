import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { DefaultBrowserFactory, DefaultBrowserManager } from '../../src/printing/browser';
import { Browser } from 'puppeteer';
import { forceKillAllChromiumProcesses } from '../../src/test-utils/test-cleanup';

// Force test environment and use real bundled Chromium only
process.env.NODE_ENV = 'test';
process.env.PRINTEER_BUNDLED_ONLY = '1';

// Set shorter timeouts for faster tests
const TEST_TIMEOUT = 30000; // 30 seconds

describe('DefaultBrowserFactory', () => {
  let browserFactory: DefaultBrowserFactory;
  let createdBrowsers: Browser[] = [];

  beforeAll(async () => {
    // aggressive cleanup before running these sensitive tests
    await forceKillAllChromiumProcesses();
  });

  beforeEach(() => {
    browserFactory = new DefaultBrowserFactory();
    createdBrowsers = [];
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
          // Ignore cleanup errors in tests but log them
          console.warn('Cleanup warning:', error);
        }
      })
    );
    createdBrowsers = [];

    // Explicitly clear any global state if it exists
    // (Future-proofing against singleton leakage)
  });

  describe('createBrowser', () => {
    it('should create browser successfully', async () => {
      // Skipped: Requires actual browser which may not be available in bundled-only test mode
      const browser = await browserFactory.createBrowser();
      createdBrowsers.push(browser);

      expect(browser).toBeDefined();
      expect(browser.isConnected()).toBe(true);

      // Test basic browser functionality
      const page = await browser.newPage();
      await page.goto('data:text/html,<h1>Test</h1>', { timeout: 10000 });
      const title = await page.evaluate(() => (globalThis as unknown as { document: { title: string } }).document.title);
      await page.close();

      expect(typeof title).toBe('string');
    }, TEST_TIMEOUT);

    it('should validate browser correctly', async () => {
      // Skipped: Requires actual browser which may not be available in bundled-only test mode
      const browser = await browserFactory.createBrowser();
      createdBrowsers.push(browser);

      const isValid = await browserFactory.validateBrowser(browser);
      expect(isValid).toBe(true);
    }, TEST_TIMEOUT);

    it('should get browser version', async () => {
      // Skipped: Requires actual browser which may not be available in bundled-only test mode
      const browser = await browserFactory.createBrowser();
      createdBrowsers.push(browser);

      const version = await browserFactory.getBrowserVersion(browser);
      expect(version).toMatch(/Chrome|Chromium/);
    }, TEST_TIMEOUT);

    it('should return optimal launch options', () => {
      const options = browserFactory.getOptimalLaunchOptions();

      expect(options).toHaveProperty('headless', 'new');
      expect(options).toHaveProperty('timeout', 30000);
      expect(options).toHaveProperty('args');
      expect(Array.isArray(options.args)).toBe(true);
    });
  });
});

describe('DefaultBrowserManager', () => {
  let browserManager: DefaultBrowserManager;

  beforeEach(() => {
    // Create browser manager with test configuration
    browserManager = new DefaultBrowserManager(undefined, {
      minSize: 1,
      maxSize: 2,
      idleTimeout: 30000, // Increased to 30s to prevent race conditions during slow tests
      cleanupInterval: 60000 // Increased to 60s
    });
  });

  afterEach(async () => {
    // Clean up browser manager and all browsers
    try {
      await browserManager.shutdown();
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      // Skipped: Requires actual browser which may not be available in bundled-only test mode
      await browserManager.initialize();

      const status = browserManager.getPoolStatus();
      expect(status.totalBrowsers).toBeGreaterThan(0);
    }, 60000); // Increased timeout
  });

  describe('pool status', () => {
    it('should provide accurate pool status', async () => {
      // Tests browser pool status reporting
      await browserManager.initialize();

      const status = browserManager.getPoolStatus();
      expect(status.totalBrowsers).toBeGreaterThanOrEqual(1);
      expect(status.availableBrowsers).toBeGreaterThanOrEqual(0);
      expect(status.busyBrowsers).toBe(0);
      expect(status.healthyBrowsers).toBeGreaterThanOrEqual(0);
      expect(status.metrics).toBeDefined();
    }, TEST_TIMEOUT);
  });
});