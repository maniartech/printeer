// Browser management implementation placeholder

import {
  BrowserManager,
  BrowserInstance,
  PoolStatus,
  BrowserFactory,
  BrowserPoolState
} from './types/browser';
import { Browser, PuppeteerLaunchOptions } from 'puppeteer';
import * as NodeFS from 'fs';
import * as NodeOS from 'os';

export class DefaultBrowserManager implements BrowserManager {
  private pool: BrowserPoolState;
  private factory: BrowserFactory;
  private cleanupInterval?: ReturnType<typeof setInterval>;
  private isInitialized = false;
  private isShuttingDown = false;

  constructor(
    factory?: BrowserFactory,
    private config: {
      minSize?: number;
      maxSize?: number;
      idleTimeout?: number;
      cleanupInterval?: number;
    } = {}
  ) {
    this.factory = factory || new DefaultBrowserFactory();

    // Default configuration
    const defaultConfig = {
      minSize: 1,
      maxSize: 5,
      idleTimeout: 30000, // 30 seconds
      cleanupInterval: 60000 // 1 minute
    };

    this.config = { ...defaultConfig, ...this.config };

    // Initialize pool state
    this.pool = {
      available: [],
      busy: new Map(),
      total: 0,
      maxSize: this.config.maxSize!,
      minSize: this.config.minSize!,
      lastCleanup: new Date(),
      metrics: {
        created: 0,
        destroyed: 0,
        reused: 0,
        errors: 0
      }
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Pre-warm the pool with minimum browsers
      await this.warmUp();

      // Check if we have any browsers after warm-up
      if (this.pool.total === 0) {
        throw new Error('Failed to create any browsers during initialization');
      }

      // Start cleanup interval
      this.startCleanupInterval();

      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize browser manager: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getBrowser(): Promise<BrowserInstance> {
    if (this.isShuttingDown) {
      throw new Error('Browser manager is shutting down');
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    // Try to get an available browser from the pool
    let browserInstance = this.getAvailableBrowser();

    if (!browserInstance) {
      // Create a new browser if pool is not at max capacity
      if (this.pool.total < this.pool.maxSize) {
        browserInstance = await this.createBrowserInstance();
      } else {
        // Wait for a browser to become available
        browserInstance = await this.waitForAvailableBrowser();
      }
    }

    // Mark browser as busy
    this.pool.busy.set(browserInstance.id, browserInstance);
    browserInstance.lastUsed = new Date();
    this.pool.metrics.reused++;

    return browserInstance;
  }

  async releaseBrowser(browser: BrowserInstance): Promise<void> {
    if (!this.pool.busy.has(browser.id)) {
      console.warn(`Attempted to release browser ${browser.id} that is not in busy pool`);
      return;
    }

    // Remove from busy pool
    this.pool.busy.delete(browser.id);

    // Check if browser is still healthy
    const isHealthy = await this.checkBrowserHealth(browser);
    browser.isHealthy = isHealthy;

    if (isHealthy && !this.isShuttingDown) {
      // Return to available pool
      browser.lastUsed = new Date();
      this.pool.available.push(browser);
    } else {
      // Destroy unhealthy browser
      await this.destroyBrowserInstance(browser);
    }
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    // Close all browsers
    const allBrowsers = [
      ...this.pool.available,
      ...Array.from(this.pool.busy.values())
    ];

    await Promise.all(
      allBrowsers.map(browser => this.destroyBrowserInstance(browser))
    );

    // Reset pool state
    this.pool.available = [];
    this.pool.busy.clear();
    this.pool.total = 0;
    this.isInitialized = false;
    // Keep isShuttingDown = true to prevent new browser acquisition
  }

  getPoolStatus(): PoolStatus {
    const healthyBrowsers = this.pool.available.filter(b => b.isHealthy).length +
      Array.from(this.pool.busy.values()).filter(b => b.isHealthy).length;

    return {
      totalBrowsers: this.pool.total,
      availableBrowsers: this.pool.available.length,
      busyBrowsers: this.pool.busy.size,
      healthyBrowsers,
      unhealthyBrowsers: this.pool.total - healthyBrowsers,
      uptime: Date.now() - this.pool.lastCleanup.getTime(),
      metrics: { ...this.pool.metrics }
    };
  }

  async warmUp(): Promise<void> {
    const browsersToCreate = Math.max(0, this.pool.minSize - this.pool.total);

    if (browsersToCreate === 0) {
      return;
    }

    const createPromises = Array.from({ length: browsersToCreate }, async () => {
      try {
        return await this.createBrowserInstance();
      } catch (error) {
        console.warn(`Failed to create browser during warm-up: ${error instanceof Error ? error.message : 'Unknown error'}`);
        this.pool.metrics.errors++;
        return null;
      }
    });

    const browsers = await Promise.all(createPromises);

    // Add successfully created browsers to available pool
    browsers.forEach(browser => {
      if (browser) {
        this.pool.available.push(browser);
      }
    });
  }

  private getAvailableBrowser(): BrowserInstance | null {
    // Find the most recently used healthy browser
    const healthyBrowsers = this.pool.available.filter(b => b.isHealthy);

    if (healthyBrowsers.length === 0) {
      return null;
    }

    // Sort by last used (most recent first) and take the first one
    healthyBrowsers.sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
    const browser = healthyBrowsers[0];

    // Remove from available pool
    const index = this.pool.available.indexOf(browser);
    if (index > -1) {
      this.pool.available.splice(index, 1);
    }

    return browser;
  }

  private async createBrowserInstance(): Promise<BrowserInstance> {
    try {
      const browser = await this.factory.createBrowser();
      const browserInstance: BrowserInstance = {
        id: this.generateBrowserId(),
        browser,
        createdAt: new Date(),
        lastUsed: new Date(),
        isHealthy: true,
        processId: this.getBrowserProcessId(browser)
      };

      this.pool.total++;
      this.pool.metrics.created++;

      return browserInstance;
    } catch (error) {
      this.pool.metrics.errors++;
      throw error;
    }
  }

  private async destroyBrowserInstance(browserInstance: BrowserInstance): Promise<void> {
    try {
      const process = browserInstance.browser.process();

      // Close browser gracefully first
      await browserInstance.browser.close();

      // Wait for process termination and force kill if necessary
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

      this.pool.total--;
      this.pool.metrics.destroyed++;
    } catch (error) {
      console.warn(`Error closing browser ${browserInstance.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.pool.metrics.errors++;
    }
  }

  private async waitForAvailableBrowser(timeout = 30000): Promise<BrowserInstance> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const browser = this.getAvailableBrowser();
      if (browser) {
        return browser;
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('Timeout waiting for available browser');
  }

  private async checkBrowserHealth(browserInstance: BrowserInstance): Promise<boolean> {
    try {
      // Check if browser process is still alive
      if (!this.isBrowserProcessAlive(browserInstance)) {
        return false;
      }

      // Use the factory's validation method for functional testing
      const isValid = await this.factory.validateBrowser(browserInstance.browser);

      if (!isValid) {
        console.warn(`Browser ${browserInstance.id} failed functional validation`);
        return false;
      }

      return true;
    } catch (error) {
      console.warn(`Browser health check failed for ${browserInstance.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  private isBrowserProcessAlive(browserInstance: BrowserInstance): boolean {
    try {
      // For testing environments, assume browser is alive
      if (process.env.NODE_ENV === 'test') {
        return true;
      }

      // Check if browser has a process and it's still running
      const browserProcess = browserInstance.browser.process();
      if (!browserProcess) {
        return false; // No process means browser is closed
      }

      // Check if browser is connected (not closed)
      if (browserInstance.browser.isConnected && !browserInstance.browser.isConnected()) {
        return false;
      }

      return true;
    } catch (error) {
      // In test environments, don't fail on process check errors
      return process.env.NODE_ENV === 'test';
    }
  }

  private async performHealthCheck(): Promise<void> {
    const allBrowsers = [
      ...this.pool.available,
      ...Array.from(this.pool.busy.values())
    ];

    const healthChecks = allBrowsers.map(async browser => {
      const isHealthy = await this.checkBrowserHealth(browser);
      browser.isHealthy = isHealthy;

      if (!isHealthy) {
        // Remove from appropriate pool and destroy
        if (this.pool.busy.has(browser.id)) {
          this.pool.busy.delete(browser.id);
        } else {
          const index = this.pool.available.indexOf(browser);
          if (index > -1) {
            this.pool.available.splice(index, 1);
          }
        }

        await this.destroyBrowserInstance(browser);
        console.info(`Removed unhealthy browser ${browser.id} from pool`);
      }
    });

    await Promise.all(healthChecks);
  }

  private async recoverFromFailures(): Promise<void> {
    // Ensure we have minimum browsers after health checks
    if (this.pool.total < this.pool.minSize) {
      console.info(`Pool below minimum size (${this.pool.total}/${this.pool.minSize}), creating new browsers`);
      await this.warmUp();
    }

    // If we have no healthy browsers, force create at least one
    const healthyBrowsers = this.pool.available.filter(b => b.isHealthy).length +
      Array.from(this.pool.busy.values()).filter(b => b.isHealthy).length;

    if (healthyBrowsers === 0 && this.pool.total === 0) {
      console.warn('No healthy browsers available, attempting emergency recovery');
      try {
        const emergencyBrowser = await this.createBrowserInstance();
        this.pool.available.push(emergencyBrowser);
        console.info(`Emergency browser ${emergencyBrowser.id} created successfully`);
      } catch (error) {
        console.error(`Emergency browser creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        this.pool.metrics.errors++;
      }
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup().catch(error => {
        console.warn(`Cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      });
    }, this.config.cleanupInterval);
  }

  private async performCleanup(): Promise<void> {
    const now = new Date();
    const idleTimeout = this.config.idleTimeout!;

    // Find idle browsers to remove
    const idleBrowsers = this.pool.available.filter(browser => {
      const idleTime = now.getTime() - browser.lastUsed.getTime();
      return idleTime > idleTimeout && this.pool.total > this.pool.minSize;
    });

    // Remove idle browsers
    for (const browser of idleBrowsers) {
      const index = this.pool.available.indexOf(browser);
      if (index > -1) {
        this.pool.available.splice(index, 1);
        await this.destroyBrowserInstance(browser);
      }
    }

    // Check health of remaining browsers
    const healthChecks = this.pool.available.map(async browser => {
      const isHealthy = await this.checkBrowserHealth(browser);
      browser.isHealthy = isHealthy;

      if (!isHealthy) {
        const index = this.pool.available.indexOf(browser);
        if (index > -1) {
          this.pool.available.splice(index, 1);
          await this.destroyBrowserInstance(browser);
        }
      }
    });

    await Promise.all(healthChecks);

    // Ensure minimum pool size
    if (this.pool.total < this.pool.minSize) {
      await this.warmUp();
    }

    this.pool.lastCleanup = now;
  }

  private generateBrowserId(): string {
    return `browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getBrowserProcessId(browser: Browser): number | undefined {
    try {
      // Try to get process ID from browser instance
      return browser.process()?.pid;
    } catch (error) {
      return undefined;
    }
  }
}

export class DefaultBrowserFactory implements BrowserFactory {
  private fs: typeof NodeFS;
  private os: typeof NodeOS;

  constructor(private config: PuppeteerLaunchOptions = {}, fsImpl: typeof NodeFS = NodeFS, osImpl: typeof NodeOS = NodeOS) {
    // Allow dependency injection for testing
    this.fs = fsImpl;
    this.os = osImpl;
  }

  private static readonly FALLBACK_CONFIGURATIONS = [
    {
      name: 'standard',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    },
    {
      name: 'minimal',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    },
    {
      name: 'container-optimized',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    },
    {
      name: 'headless-server',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--single-process',
        '--no-zygote'
      ]
    }
  ];

  async createBrowser(): Promise<Browser> {
    const puppeteer = await import('puppeteer');
    const launchOptions = this.getOptimalLaunchOptions();

    // If bundled-only mode is enabled, force use of bundled Chromium
    const bundledOnly = process.env.PRINTEER_BUNDLED_ONLY === '1';
    if (bundledOnly) {
      // Don't set executablePath for bundled Chromium - let Puppeteer use its default
      // The bundled browser is used by default when no executablePath is specified
      delete launchOptions.executablePath;
    }

    // Try to launch browser with optimal configuration first
    try {
      console.log('Launching browser with optimal configuration...');
      const browser = await puppeteer.launch(launchOptions);

      // Validate the browser is working
      const isValid = await this.validateBrowser(browser);
      if (isValid) {
        console.log('Browser launched and validated successfully');
        return browser;
      }

      // Close invalid browser
      await browser.close();
      console.warn('Browser launched but failed validation');
    } catch (error) {
      console.warn(`Failed to launch browser with optimal configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Skip fallback configurations if bundled-only mode is enabled
    if (bundledOnly) {
      throw new Error('Failed to launch bundled Chromium and PRINTEER_BUNDLED_ONLY is set');
    }

    // Try fallback configurations
    for (const config of DefaultBrowserFactory.FALLBACK_CONFIGURATIONS) {
      try {
        const fallbackOptions: PuppeteerLaunchOptions = {
          ...launchOptions,
          args: config.args
        };

        const browser = await puppeteer.launch(fallbackOptions);

        // Validate the browser is working
        const isValid = await this.validateBrowser(browser);
        if (isValid) {
          console.info(`Browser launched successfully with '${config.name}' configuration`);
          return browser;
        }

        // Close invalid browser
        await browser.close();
      } catch (error) {
        console.warn(`Failed to launch browser with '${config.name}' configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    throw new Error('Failed to launch browser with any configuration. Please check system requirements and browser installation.');
  }

  async validateBrowser(browser: Browser): Promise<boolean> {
    try {
      // Test basic browser functionality
      const page = await browser.newPage();

      // Test navigation to a simple data URL
      await page.goto('data:text/html,<h1>Browser Test</h1>', {
        waitUntil: 'load',
        timeout: 5000
      });

      // Test basic page evaluation
  const title = await page.title();

      // Clean up test page
      await page.close();

      // Browser is valid if we can navigate and evaluate
      return typeof title === 'string';
    } catch (error) {
      console.warn(`Browser validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  async getBrowserVersion(browser: Browser): Promise<string> {
    try {
      const version = await browser.version();
      return version;
    } catch (error) {
      console.warn(`Failed to get browser version: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 'unknown';
    }
  }

  getOptimalLaunchOptions(): PuppeteerLaunchOptions {
    const baseOptions: PuppeteerLaunchOptions = {
      headless: "new", // Use new headless mode (Chrome 112+)
      timeout: 30000,
      args: []
    };

    // Merge constructor config, allowing it to override defaults
    const launchOptions: PuppeteerLaunchOptions = { ...baseOptions, ...this.config };

    // Force headless mode in test environment to prevent UI windows
    if (process.env.NODE_ENV === 'test') {
      launchOptions.headless = "new";
      // Use minimal args for tests to avoid launch issues
      launchOptions.args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--headless=new'
      ];
      return launchOptions;
    }

    // Check if we should use bundled Chromium only
    const bundledOnly = process.env.PRINTEER_BUNDLED_ONLY === '1';

    if (!bundledOnly) {
      // Detect system Chrome/Chromium first (only if not bundled-only)
      const systemBrowserPath = this.detectSystemBrowser();
      if (systemBrowserPath && !launchOptions.executablePath) {
        launchOptions.executablePath = systemBrowserPath;
      }

      // Check for custom executable path from environment
      const customPath = process.env.PUPPETEER_EXECUTABLE_PATH;
      if (customPath) {
        launchOptions.executablePath = customPath;
      }
    }

    // Add environment-specific optimizations
    const optimizedArgs = this.getEnvironmentOptimizedArgs();
    const alwaysArgs: string[] = [];
    if (!(launchOptions.args || []).some(a => a.startsWith('--headless'))) {
      alwaysArgs.push('--headless=new');
    }
    if (this.os.platform() === 'win32') {
      alwaysArgs.push('--no-startup-window');
    }
    const allArgs = (launchOptions.args || []).concat(optimizedArgs).concat(alwaysArgs);
    launchOptions.args = Array.from(new Set(allArgs));

    return launchOptions;
  }

  private detectSystemBrowser(): string | null {
    const platform = this.os.platform();

    let browserPaths: string[] = [];

    switch (platform) {
      case 'win32':
        browserPaths = [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files\\Chromium\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe'
        ];
        break;
      case 'darwin':
        browserPaths = [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium'
        ];
        break;
      case 'linux':
      default:
        browserPaths = [
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
          '/snap/bin/chromium',
          '/usr/bin/chrome'
        ];
        break;
    }

    // Find first available browser
    for (const browserPath of browserPaths) {
      try {
        if (this.fs.existsSync(browserPath)) {
          return browserPath;
        }
      } catch (error) {
        // Continue to next path
      }
    }

    return null;
  }

  private getEnvironmentOptimizedArgs(): string[] {
    const platform = this.os.platform();
    const isRoot = this.isCurrentUserRoot();
    const isDocker = this.isRunningInDocker();
    const isHeadless = this.isHeadlessEnvironment();

    let args = [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection'
    ];

    // Always disable sandbox for root users or Docker environments
    if (isRoot || isDocker) {
      args.push('--no-sandbox', '--disable-setuid-sandbox');
    }

    // Add memory optimizations for containers
    if (isDocker) {
      args.push(
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security'
      );
    }

    // Add headless server optimizations
    if (isHeadless) {
      args.push(
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-background-timer-throttling'
      );
    }

    // Platform-specific optimizations
    if (platform === 'linux') {
      args.push('--disable-dev-shm-usage');

      // Check for display server
      if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
        args.push('--virtual-time-budget=1000');
      }
    }

    return args;
  }

  private isCurrentUserRoot(): boolean {
    try {
      if (process && process.getuid) {
        return process.getuid() === 0;
      }

      return this.os.userInfo().username === 'root';
    } catch (error) {
      return false;
    }
  }

  private isRunningInDocker(): boolean {
    try {
      // Check for .dockerenv file
      if (this.fs.existsSync('/.dockerenv')) {
        return true;
      }

      // Check cgroup for docker
      try {
        const cgroup = this.fs.readFileSync('/proc/1/cgroup', 'utf8');
        return cgroup.includes('docker') || cgroup.includes('containerd');
      } catch (error) {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  private isHeadlessEnvironment(): boolean {
    const platform = this.os.platform();

    if (platform === 'win32' || platform === 'darwin') {
      return false; // Assume GUI available on Windows/macOS
    }

    // Linux - check for display
    return !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY;
  }
}