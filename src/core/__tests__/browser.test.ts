import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DefaultBrowserFactory, DefaultBrowserManager } from '../browser';
import { Browser } from 'puppeteer';
import { BrowserFactory } from '../../types/browser';

// Mock external dependencies
vi.mock('puppeteer');
vi.mock('fs');
vi.mock('os');

const mockPuppeteer = {
  launch: vi.fn()
};

const mockFs = {
  existsSync: vi.fn(),
  readFileSync: vi.fn()
};

const mockOs = {
  platform: vi.fn(),
  userInfo: vi.fn()
};

// Mock require calls
vi.mock('fs', () => mockFs);
vi.mock('os', () => mockOs);

describe('DefaultBrowserFactory', () => {
  let browserFactory: DefaultBrowserFactory;
  let mockBrowser: Browser;

  beforeEach(() => {
    // Create factory with mocked dependencies
    browserFactory = new DefaultBrowserFactory(mockFs, mockOs);
    
    // Mock browser instance
    mockBrowser = {
      version: vi.fn(),
      newPage: vi.fn(),
      close: vi.fn()
    } as any;

    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockPuppeteer.launch.mockResolvedValue(mockBrowser);
    mockOs.platform.mockReturnValue('linux');
    mockOs.userInfo.mockReturnValue({ username: 'testuser' });
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue('normal-process');
    
    // Mock dynamic import for puppeteer
    vi.doMock('puppeteer', () => mockPuppeteer);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createBrowser', () => {
    it('should create browser with optimal configuration on first try', async () => {
      // Mock successful browser validation
      const mockPage = {
        goto: vi.fn().mockResolvedValue({}),
        evaluate: vi.fn().mockResolvedValue('Browser Test'),
        close: vi.fn().mockResolvedValue({})
      };
      mockBrowser.newPage.mockResolvedValue(mockPage);

      const browser = await browserFactory.createBrowser();

      expect(browser).toBe(mockBrowser);
      expect(mockPuppeteer.launch).toHaveBeenCalledTimes(1);
      expect(mockBrowser.newPage).toHaveBeenCalled();
      expect(mockPage.goto).toHaveBeenCalledWith(
        'data:text/html,<h1>Browser Test</h1>',
        { waitUntil: 'load', timeout: 5000 }
      );
    });

    it('should try fallback configurations when optimal fails', async () => {
      // Mock first launch failure, second success
      mockPuppeteer.launch
        .mockRejectedValueOnce(new Error('Launch failed'))
        .mockResolvedValueOnce(mockBrowser);

      // Mock successful browser validation
      const mockPage = {
        goto: vi.fn().mockResolvedValue({}),
        evaluate: vi.fn().mockResolvedValue('Browser Test'),
        close: vi.fn().mockResolvedValue({})
      };
      mockBrowser.newPage.mockResolvedValue(mockPage);

      const browser = await browserFactory.createBrowser();

      expect(browser).toBe(mockBrowser);
      expect(mockPuppeteer.launch).toHaveBeenCalledTimes(2);
    });

    it('should throw error when all configurations fail', async () => {
      // Mock all launches failing
      mockPuppeteer.launch.mockRejectedValue(new Error('Launch failed'));

      await expect(browserFactory.createBrowser()).rejects.toThrow(
        'Failed to launch browser with any configuration'
      );

      // Should try optimal + 4 fallback configurations
      expect(mockPuppeteer.launch).toHaveBeenCalledTimes(5);
    });

    it('should close invalid browsers during validation', async () => {
      // Mock browser validation failure
      const mockPage = {
        goto: vi.fn().mockRejectedValue(new Error('Navigation failed')),
        close: vi.fn().mockResolvedValue({})
      };
      mockBrowser.newPage.mockResolvedValue(mockPage);
      mockBrowser.close.mockResolvedValue({});

      // First browser fails validation, second succeeds
      mockPuppeteer.launch
        .mockResolvedValueOnce(mockBrowser)
        .mockResolvedValueOnce({
          ...mockBrowser,
          newPage: vi.fn().mockResolvedValue({
            goto: vi.fn().mockResolvedValue({}),
            evaluate: vi.fn().mockResolvedValue('Browser Test'),
            close: vi.fn().mockResolvedValue({})
          })
        });

      const browser = await browserFactory.createBrowser();

      expect(mockBrowser.close).toHaveBeenCalled();
      expect(browser).toBeDefined();
    });
  });

  describe('validateBrowser', () => {
    it('should return true for valid browser', async () => {
      const mockPage = {
        goto: vi.fn().mockResolvedValue({}),
        evaluate: vi.fn().mockResolvedValue('Browser Test'),
        close: vi.fn().mockResolvedValue({})
      };
      mockBrowser.newPage.mockResolvedValue(mockPage);

      const isValid = await browserFactory.validateBrowser(mockBrowser);

      expect(isValid).toBe(true);
      expect(mockBrowser.newPage).toHaveBeenCalled();
      expect(mockPage.goto).toHaveBeenCalled();
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should return false when navigation fails', async () => {
      const mockPage = {
        goto: vi.fn().mockRejectedValue(new Error('Navigation failed')),
        close: vi.fn().mockResolvedValue({})
      };
      mockBrowser.newPage.mockResolvedValue(mockPage);

      const isValid = await browserFactory.validateBrowser(mockBrowser);

      expect(isValid).toBe(false);
    });

    it('should return false when page creation fails', async () => {
      mockBrowser.newPage.mockRejectedValue(new Error('Page creation failed'));

      const isValid = await browserFactory.validateBrowser(mockBrowser);

      expect(isValid).toBe(false);
    });

    it('should return false when evaluation fails', async () => {
      const mockPage = {
        goto: vi.fn().mockResolvedValue({}),
        evaluate: vi.fn().mockRejectedValue(new Error('Evaluation failed')),
        close: vi.fn().mockResolvedValue({})
      };
      mockBrowser.newPage.mockResolvedValue(mockPage);

      const isValid = await browserFactory.validateBrowser(mockBrowser);

      expect(isValid).toBe(false);
    });
  });

  describe('getBrowserVersion', () => {
    it('should return browser version', async () => {
      const expectedVersion = 'HeadlessChrome/120.0.0.0';
      mockBrowser.version.mockResolvedValue(expectedVersion);

      const version = await browserFactory.getBrowserVersion(mockBrowser);

      expect(version).toBe(expectedVersion);
      expect(mockBrowser.version).toHaveBeenCalled();
    });

    it('should return "unknown" when version call fails', async () => {
      mockBrowser.version.mockRejectedValue(new Error('Version failed'));

      const version = await browserFactory.getBrowserVersion(mockBrowser);

      expect(version).toBe('unknown');
    });
  });

  describe('getOptimalLaunchOptions', () => {
    it('should return basic options with environment optimizations', () => {
      const options = browserFactory.getOptimalLaunchOptions();

      expect(options).toHaveProperty('headless', true);
      expect(options).toHaveProperty('timeout', 30000);
      expect(options).toHaveProperty('args');
      expect(Array.isArray(options.args)).toBe(true);
    });

    it('should use custom executable path when provided', () => {
      const customPath = '/custom/chrome/path';
      process.env.PUPPETEER_EXECUTABLE_PATH = customPath;

      const options = browserFactory.getOptimalLaunchOptions();

      expect(options.executablePath).toBe(customPath);

      delete process.env.PUPPETEER_EXECUTABLE_PATH;
    });

    it('should detect and use system browser', () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path === '/usr/bin/google-chrome';
      });

      const options = browserFactory.getOptimalLaunchOptions();

      expect(options.executablePath).toBe('/usr/bin/google-chrome');
    });

    it('should add sandbox flags for root user', () => {
      mockOs.userInfo.mockReturnValue({ username: 'root' });

      const options = browserFactory.getOptimalLaunchOptions();

      expect(options.args).toContain('--no-sandbox');
      expect(options.args).toContain('--disable-setuid-sandbox');
    });

    it('should add Docker optimizations when running in container', () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path === '/.dockerenv';
      });

      const options = browserFactory.getOptimalLaunchOptions();

      expect(options.args).toContain('--no-sandbox');
      expect(options.args).toContain('--disable-dev-shm-usage');
      expect(options.args).toContain('--disable-gpu');
    });

    it('should add headless optimizations for headless environment', () => {
      mockOs.platform.mockReturnValue('linux');
      // Mock no display environment
      delete process.env.DISPLAY;
      delete process.env.WAYLAND_DISPLAY;

      const options = browserFactory.getOptimalLaunchOptions();

      expect(options.args).toContain('--disable-gpu');
      expect(options.args).toContain('--disable-software-rasterizer');
    });

    it('should handle Windows platform correctly', () => {
      mockOs.platform.mockReturnValue('win32');
      mockFs.existsSync.mockImplementation((path) => {
        return path === 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      });

      const options = browserFactory.getOptimalLaunchOptions();

      expect(options.executablePath).toBe('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
    });

    it('should handle macOS platform correctly', () => {
      mockOs.platform.mockReturnValue('darwin');
      mockFs.existsSync.mockImplementation((path) => {
        return path === '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      });

      const options = browserFactory.getOptimalLaunchOptions();

      expect(options.executablePath).toBe('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    });
  });

  describe('environment detection', () => {
    it('should detect Docker environment via .dockerenv', () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path === '/.dockerenv';
      });

      const options = browserFactory.getOptimalLaunchOptions();

      expect(options.args).toContain('--no-sandbox');
      expect(options.args).toContain('--disable-dev-shm-usage');
    });

    it('should detect Docker environment via cgroup', () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path !== '/.dockerenv';
      });
      mockFs.readFileSync.mockImplementation((path) => {
        if (path === '/proc/1/cgroup') {
          return 'docker-container-id';
        }
        return '';
      });

      const options = browserFactory.getOptimalLaunchOptions();

      expect(options.args).toContain('--no-sandbox');
      expect(options.args).toContain('--disable-dev-shm-usage');
    });

    it('should handle cgroup read errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const options = browserFactory.getOptimalLaunchOptions();

      // Should not crash and should return valid options
      expect(options).toHaveProperty('args');
      expect(Array.isArray(options.args)).toBe(true);
    });

    it('should detect root user via process.getuid', () => {
      const originalGetuid = process.getuid;
      process.getuid = vi.fn().mockReturnValue(0);

      const options = browserFactory.getOptimalLaunchOptions();

      expect(options.args).toContain('--no-sandbox');
      expect(options.args).toContain('--disable-setuid-sandbox');

      process.getuid = originalGetuid;
    });

    it('should handle missing process.getuid gracefully', () => {
      const originalGetuid = process.getuid;
      delete (process as any).getuid;
      mockOs.userInfo.mockReturnValue({ username: 'root' });

      const options = browserFactory.getOptimalLaunchOptions();

      expect(options.args).toContain('--no-sandbox');
      expect(options.args).toContain('--disable-setuid-sandbox');

      if (originalGetuid) {
        process.getuid = originalGetuid;
      }
    });
  });

  describe('fallback configurations', () => {
    it('should have multiple fallback configurations', () => {
      // Access private static property for testing
      const configs = (DefaultBrowserFactory as any).FALLBACK_CONFIGURATIONS;
      
      expect(configs).toHaveLength(4);
      expect(configs[0].name).toBe('standard');
      expect(configs[1].name).toBe('minimal');
      expect(configs[2].name).toBe('container-optimized');
      expect(configs[3].name).toBe('headless-server');
    });

    it('should try each fallback configuration in order', async () => {
      // Mock all launches failing except the last one
      mockPuppeteer.launch
        .mockRejectedValueOnce(new Error('Optimal failed'))
        .mockRejectedValueOnce(new Error('Standard failed'))
        .mockRejectedValueOnce(new Error('Minimal failed'))
        .mockRejectedValueOnce(new Error('Container-optimized failed'))
        .mockResolvedValueOnce(mockBrowser);

      // Mock successful browser validation
      const mockPage = {
        goto: vi.fn().mockResolvedValue({}),
        evaluate: vi.fn().mockResolvedValue('Browser Test'),
        close: vi.fn().mockResolvedValue({})
      };
      mockBrowser.newPage.mockResolvedValue(mockPage);

      const browser = await browserFactory.createBrowser();

      expect(browser).toBe(mockBrowser);
      expect(mockPuppeteer.launch).toHaveBeenCalledTimes(5); // Optimal + 4 fallbacks
    });
  });
});

describe('DefaultBrowserManager', () => {
  let browserManager: DefaultBrowserManager;
  let mockFactory: BrowserFactory;
  let mockBrowser: Browser;

  beforeEach(() => {
    // Mock browser factory
    mockFactory = {
      createBrowser: vi.fn(),
      validateBrowser: vi.fn(),
      getBrowserVersion: vi.fn(),
      getOptimalLaunchOptions: vi.fn()
    };

    // Mock browser instance
    mockBrowser = {
      version: vi.fn(),
      newPage: vi.fn(),
      close: vi.fn(),
      process: vi.fn()
    } as unknown;

    // Setup default mock implementations
    mockFactory.createBrowser.mockResolvedValue(mockBrowser);
    mockFactory.validateBrowser.mockResolvedValue(true);
    mockFactory.getBrowserVersion.mockResolvedValue('HeadlessChrome/120.0.0.0');

    // Create browser manager with test configuration
    browserManager = new DefaultBrowserManager(mockFactory, {
      minSize: 1,
      maxSize: 3,
      idleTimeout: 1000, // 1 second for faster tests
      cleanupInterval: 500 // 0.5 seconds for faster tests
    });

    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up browser manager
    try {
      await browserManager.shutdown();
    } catch (error) {
      // Ignore shutdown errors in tests
    }
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await browserManager.initialize();

      const status = browserManager.getPoolStatus();
      expect(status.totalBrowsers).toBeGreaterThan(0);
      expect(mockFactory.createBrowser).toHaveBeenCalled();
    });

    it('should not initialize twice', async () => {
      await browserManager.initialize();
      await browserManager.initialize();

      // Should only create browsers once
      expect(mockFactory.createBrowser).toHaveBeenCalledTimes(1);
    });

    it('should throw error if initialization fails', async () => {
      mockFactory.createBrowser.mockRejectedValue(new Error('Browser creation failed'));

      await expect(browserManager.initialize()).rejects.toThrow('Failed to initialize browser manager');
    });
  });

  describe('browser acquisition and release', () => {
    beforeEach(async () => {
      await browserManager.initialize();
    });

    it('should get browser from pool', async () => {
      const browser = await browserManager.getBrowser();

      expect(browser).toBeDefined();
      expect(browser.id).toBeDefined();
      expect(browser.browser).toBe(mockBrowser);
      expect(browser.isHealthy).toBe(true);

      const status = browserManager.getPoolStatus();
      expect(status.busyBrowsers).toBe(1);
      expect(status.availableBrowsers).toBe(0);
    });

    it('should release browser back to pool', async () => {
      const browser = await browserManager.getBrowser();
      await browserManager.releaseBrowser(browser);

      const status = browserManager.getPoolStatus();
      expect(status.busyBrowsers).toBe(0);
      expect(status.availableBrowsers).toBe(1);
    });

    it('should reuse released browsers', async () => {
      const browser1 = await browserManager.getBrowser();
      await browserManager.releaseBrowser(browser1);

      const browser2 = await browserManager.getBrowser();
      
      expect(browser2.id).toBe(browser1.id);
      expect(mockFactory.createBrowser).toHaveBeenCalledTimes(1); // Only created once
    });

    it('should create new browser when pool is empty', async () => {
      const browser1 = await browserManager.getBrowser();
      const browser2 = await browserManager.getBrowser();

      expect(browser1.id).not.toBe(browser2.id);
      expect(mockFactory.createBrowser).toHaveBeenCalledTimes(2);
    });

    it('should wait for available browser when pool is at max capacity', async () => {
      // Get all browsers from pool (max 3)
      const browser1 = await browserManager.getBrowser();
      const browser2 = await browserManager.getBrowser();
      const browser3 = await browserManager.getBrowser();

      // Start getting 4th browser (should wait)
      const getBrowserPromise = browserManager.getBrowser();

      // Release one browser after a delay
      setTimeout(async () => {
        await browserManager.releaseBrowser(browser1);
      }, 100);

      const browser4 = await getBrowserPromise;
      expect(browser4.id).toBe(browser1.id); // Should reuse released browser
    });

    it('should handle unhealthy browsers during release', async () => {
      mockFactory.validateBrowser.mockResolvedValue(false);

      const browser = await browserManager.getBrowser();
      await browserManager.releaseBrowser(browser);

      const status = browserManager.getPoolStatus();
      expect(status.availableBrowsers).toBe(0); // Unhealthy browser should be destroyed
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should warn when releasing unknown browser', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const fakeBrowser = {
        id: 'fake-browser',
        browser: mockBrowser,
        createdAt: new Date(),
        lastUsed: new Date(),
        isHealthy: true
      };

      await browserManager.releaseBrowser(fakeBrowser);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Attempted to release browser fake-browser that is not in busy pool')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('pool management', () => {
    beforeEach(async () => {
      await browserManager.initialize();
    });

    it('should provide accurate pool status', async () => {
      const browser1 = await browserManager.getBrowser();
      const browser2 = await browserManager.getBrowser();

      const status = browserManager.getPoolStatus();
      
      expect(status.totalBrowsers).toBe(2);
      expect(status.busyBrowsers).toBe(2);
      expect(status.availableBrowsers).toBe(0);
      expect(status.healthyBrowsers).toBe(2);
      expect(status.unhealthyBrowsers).toBe(0);
      expect(status.metrics).toBeDefined();
    });

    it('should warm up pool to minimum size', async () => {
      const status = browserManager.getPoolStatus();
      expect(status.totalBrowsers).toBeGreaterThanOrEqual(1); // minSize = 1
    });

    it('should handle warm up failures gracefully', async () => {
      // Create a fresh browser manager that hasn't been initialized
      const freshBrowserManager = new DefaultBrowserManager(mockFactory, {
        minSize: 1,
        maxSize: 3,
        idleTimeout: 1000,
        cleanupInterval: 500
      });
      
      mockFactory.createBrowser.mockRejectedValue(new Error('Creation failed'));
      
      await freshBrowserManager.warmUp();
      
      const status = freshBrowserManager.getPoolStatus();
      expect(status.metrics.errors).toBeGreaterThan(0);
      
      await freshBrowserManager.shutdown();
    });
  });

  describe('cleanup and health monitoring', () => {
    beforeEach(async () => {
      await browserManager.initialize();
    });

    it('should perform cleanup of idle browsers', async () => {
      // Get multiple browsers to exceed minimum size
      const browser1 = await browserManager.getBrowser();
      const browser2 = await browserManager.getBrowser();
      
      // Release both browsers
      await browserManager.releaseBrowser(browser1);
      await browserManager.releaseBrowser(browser2);

      // Wait for cleanup interval + idle timeout
      await new Promise(resolve => setTimeout(resolve, 1600));

      const status = browserManager.getPoolStatus();
      // Browser should be cleaned up if idle timeout exceeded and above min size
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should maintain minimum pool size during cleanup', async () => {
      // Wait for cleanup to run
      await new Promise(resolve => setTimeout(resolve, 600));

      const status = browserManager.getPoolStatus();
      expect(status.totalBrowsers).toBeGreaterThanOrEqual(1); // Should maintain minSize
    });

    it('should remove unhealthy browsers during cleanup', async () => {
      const browser = await browserManager.getBrowser();
      await browserManager.releaseBrowser(browser);

      // Make browser unhealthy
      mockFactory.validateBrowser.mockResolvedValue(false);

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    beforeEach(async () => {
      await browserManager.initialize();
    });

    it('should shutdown gracefully', async () => {
      const browser = await browserManager.getBrowser();
      
      await browserManager.shutdown();

      expect(mockBrowser.close).toHaveBeenCalled();
      
      const status = browserManager.getPoolStatus();
      expect(status.totalBrowsers).toBe(0);
    });

    it('should prevent new browser acquisition during shutdown', async () => {
      await browserManager.shutdown();

      await expect(browserManager.getBrowser()).rejects.toThrow('Browser manager is shutting down');
    });

    it('should handle shutdown errors gracefully', async () => {
      mockBrowser.close.mockRejectedValue(new Error('Close failed'));
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      await browserManager.shutdown();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not shutdown twice', async () => {
      await browserManager.shutdown();
      await browserManager.shutdown();

      // Should only close browsers once
      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await browserManager.initialize();
    });

    it('should handle browser creation failures', async () => {
      // Create a fresh browser manager that will fail during initialization
      const failingBrowserManager = new DefaultBrowserManager(mockFactory, {
        minSize: 1,
        maxSize: 3,
        idleTimeout: 1000,
        cleanupInterval: 500
      });

      // Mock the factory to fail
      mockFactory.createBrowser.mockRejectedValue(new Error('Creation failed'));

      // Try to get a browser - should fail during initialization
      await expect(failingBrowserManager.getBrowser()).rejects.toThrow('Failed to initialize browser manager');

      await failingBrowserManager.shutdown();
    });

    it('should handle browser validation failures', async () => {
      mockFactory.validateBrowser.mockRejectedValue(new Error('Validation failed'));

      const browser = await browserManager.getBrowser();
      await browserManager.releaseBrowser(browser);

      // Browser should be destroyed due to validation failure
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle timeout when waiting for available browser', async () => {
      // Create a browser manager with shorter timeout for testing
      const timeoutBrowserManager = new DefaultBrowserManager(mockFactory, {
        minSize: 1,
        maxSize: 2, // Small pool
        idleTimeout: 1000,
        cleanupInterval: 500
      });
      await timeoutBrowserManager.initialize();

      // Fill up the pool to max capacity
      const browsers = await Promise.all([
        timeoutBrowserManager.getBrowser(),
        timeoutBrowserManager.getBrowser()
      ]);

      // Mock the factory to fail browser creation so it can't create new browsers
      mockFactory.createBrowser.mockRejectedValue(new Error('No more browsers'));

      // Modify the waitForAvailableBrowser method to use a shorter timeout
      const originalMethod = timeoutBrowserManager['waitForAvailableBrowser'];
      timeoutBrowserManager['waitForAvailableBrowser'] = async function(timeout = 1000) {
        return originalMethod.call(this, timeout);
      };

      // Try to get another browser - should timeout since pool is full and can't create new ones
      await expect(
        timeoutBrowserManager.getBrowser()
      ).rejects.toThrow('Timeout waiting for available browser');

      // Clean up
      for (const browser of browsers) {
        await timeoutBrowserManager.releaseBrowser(browser);
      }
      await timeoutBrowserManager.shutdown();
    }, 10000);
  });

  describe('metrics tracking', () => {
    beforeEach(async () => {
      await browserManager.initialize();
    });

    it('should track browser creation metrics', async () => {
      await browserManager.getBrowser();
      
      const status = browserManager.getPoolStatus();
      expect(status.metrics.created).toBeGreaterThan(0);
    });

    it('should track browser reuse metrics', async () => {
      const browser = await browserManager.getBrowser();
      await browserManager.releaseBrowser(browser);
      await browserManager.getBrowser();
      
      const status = browserManager.getPoolStatus();
      expect(status.metrics.reused).toBeGreaterThan(0);
    });

    it('should track error metrics', async () => {
      // Create a fresh browser manager
      const freshBrowserManager = new DefaultBrowserManager(mockFactory, {
        minSize: 1,
        maxSize: 3,
        idleTimeout: 1000,
        cleanupInterval: 500
      });
      
      mockFactory.createBrowser.mockRejectedValue(new Error('Creation failed'));
      
      try {
        await freshBrowserManager.getBrowser();
      } catch (error) {
        // Expected to fail
      }
      
      const status = freshBrowserManager.getPoolStatus();
      expect(status.metrics.errors).toBeGreaterThan(0);
      
      await freshBrowserManager.shutdown();
    });
  });
});