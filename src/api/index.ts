// API domain - Library public surface
import puppeteer, { Browser } from 'puppeteer';
import { normalize } from 'path';
import { getDefaultBrowserOptions } from '../utils';
import { DefaultBrowserManager } from '../printing/browser';

// networkidle0 - consider navigation to be finished when there are no more than 0 network connections for at least 500 ms
// networkidle2 - consider navigation to be finished when there are no more than 2 network connections for at least 500 ms.

/**
 * Generate the report.
 * @param {string} url The URL to convert
 * @param {string} outputFile The output file path
 * @param {string|null} outputType The output type (pdf or png)
 * @param {any} browserOptions Browser launch options
 * @returns The promise of the report file.
 */
/**
 * Determine the appropriate browser strategy based on usage context
 */
function getBrowserStrategy(): 'oneshot' | 'pool' {
  // Explicit override via environment variable
  if (process.env.PRINTEER_BROWSER_STRATEGY === 'oneshot') {
    return 'oneshot';
  }
  if (process.env.PRINTEER_BROWSER_STRATEGY === 'pool') {
    return 'pool';
  }

  // Check if this is a batch operation (multiple URLs or batch command)
  const isBatchOperation = detectBatchOperation();

  // Use pool for batch operations (performance for multiple conversions)
  if (isBatchOperation) {
    return 'pool';
  }

  // Use one-shot for single CLI commands (simple, clean, no lingering processes)
  if (process.argv[1]?.includes('run-cli.js') ||
      process.argv[1]?.includes('cli.js') ||
      process.env.PRINTEER_CLI_MODE === '1') {
    return 'oneshot';
  }

  // Use one-shot for test environment (clean, predictable)
  // Exception: batch tests should use pool for realistic testing
  if (process.env.NODE_ENV === 'test') {
    return 'oneshot';
  }

  // Use one-shot for Docker/container environments (resource constraints)
  // Exception: batch operations still use pool even in containers
  if (process.env.DOCKER_CONTAINER === 'true' ||
      process.env.KUBERNETES_SERVICE_HOST ||
      existsSync('/.dockerenv')) {
    return 'oneshot';
  }

  // Use one-shot for serverless environments (Lambda, etc.)
  if (process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.VERCEL ||
      process.env.NETLIFY) {
    return 'oneshot';
  }

  // Use pool for server/API usage (performance for high throughput)
  return 'pool';
}

/**
 * Detect if this is a batch operation that would benefit from browser pooling
 */
function detectBatchOperation(): boolean {
  // Check command line arguments for batch indicators
  const args = process.argv;

  // Explicit batch command
  if (args.includes('batch') || args.includes('--batch')) {
    return true;
  }

  // Multiple URLs provided
  const urlCount = args.filter(arg => arg.startsWith('http')).length;
  if (urlCount > 1) {
    return true;
  }

  // Batch file provided
  if (args.some(arg => arg.endsWith('.csv') || arg.endsWith('.json') || arg.endsWith('.yaml'))) {
    return true;
  }

  // Environment variable indicating batch mode
  if (process.env.PRINTEER_BATCH_MODE === '1') {
    return true;
  }

  // Check for batch-related CLI options
  const batchOptions = [
    '--concurrency',
    '--continue-on-error',
    '--output-dir',
    '--batch-file'
  ];

  if (batchOptions.some(option => args.includes(option))) {
    return true;
  }

  return false;
}

/**
 * Check if file exists (for Docker detection)
 */
function existsSync(path: string): boolean {
  try {
    require('fs').accessSync(path);
    return true;
  } catch {
    return false;
  }
}

// Global browser manager instance (only used in pool mode)
let globalBrowserManager: DefaultBrowserManager | null = null;

async function getBrowserManager(): Promise<DefaultBrowserManager> {
  if (!globalBrowserManager) {
    const browserOptions = getDefaultBrowserOptions();

    // Apply environment-specific overrides
    const exePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (exePath) {
      browserOptions.executablePath = exePath;
    }

    globalBrowserManager = new DefaultBrowserManager(undefined, {
      minSize: 0, // Don't pre-warm browsers
      maxSize: 1, // Single browser for simple API
      idleTimeout: 5000, // 5 seconds - aggressive cleanup
      cleanupInterval: 10000 // 10 seconds - frequent cleanup checks
    });

    await globalBrowserManager.initialize();

    // Register as global instance for cleanup commands
    DefaultBrowserManager.setGlobalInstance(globalBrowserManager);

    // Setup cleanup on process exit
    const cleanup = async () => {
      if (globalBrowserManager) {
        await globalBrowserManager.shutdown();
        globalBrowserManager = null;
      }
    };

    process.once('exit', cleanup);
    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);
    process.once('uncaughtException', cleanup);
    process.once('unhandledRejection', cleanup);
  }

  return globalBrowserManager;
}

/**
 * One-shot browser creation (simple, clean, no pool)
 */
async function createOneshotBrowser(customOptions?: any): Promise<Browser> {
  const browserOptions = customOptions || getDefaultBrowserOptions();

  // Apply environment-specific overrides
  const exePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (exePath && !browserOptions.executablePath) {
    browserOptions.executablePath = exePath;
  }

  // Ensure headless mode if not already set
  if (!browserOptions.headless) {
    browserOptions.headless = "new";
  }

  const baseArgs: string[] = Array.isArray(browserOptions.args) ? browserOptions.args : [];
  const extraArgs = [
    baseArgs.some((a: string) => a.startsWith('--headless')) ? null : '--headless=new',
    process.platform === 'win32' ? '--no-startup-window' : null
  ].filter(Boolean) as string[];
  browserOptions.args = Array.from(new Set([...baseArgs, ...extraArgs]));

  return await puppeteer.launch(browserOptions);
}

export default async (url: string, outputFile: string, outputType: string | null = null, browserOptions: any) => {
  const silent = process.env.PRINTEER_SILENT === '1';
  const strategy = getBrowserStrategy();

  if (!silent) {
    getPackageJson();
    console.debug(`Using browser strategy: ${strategy}`);
  }

  outputFile = normalize(outputFile);
  if (!url.startsWith('http')) {
    throw new Error('URL must start with http or https');
  }

  try {
    if (strategy === 'oneshot') {
      // Simple one-shot approach: create → use → destroy
      return await runOneshotConversion(url, outputFile, outputType, browserOptions);
    } else {
      // Pool-based approach for server/API usage
      return await runPooledConversion(url, outputFile, outputType, browserOptions);
    }
  } catch (error) {
    // If pool strategy fails, fallback to oneshot
    if (strategy === 'pool' && !silent) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn('Pool strategy failed, falling back to oneshot:', errMsg);
      return await runOneshotConversion(url, outputFile, outputType, browserOptions);
    }
    throw error;
  }
}

/**
 * One-shot conversion: Simple, clean, no lingering processes
 */
async function runOneshotConversion(
  url: string,
  outputFile: string,
  outputType: string | null,
  browserOptions: any
): Promise<string> {
  let browser: Browser | null = null;
  let page: any = null;

  try {
    // Create browser with custom options if provided
    browser = await createOneshotBrowser(browserOptions);
    page = await browser.newPage();

    // Navigate and render
    const res = await page.goto(url, { waitUntil: 'networkidle0' });

    if (!res) {
      throw new Error("Could not load the page.");
    }

    outputType = detectOutputType(outputFile, outputType);

    if (res.status() !== 200) {
      throw new Error(`Error: ${res.status()}: ${res.statusText()}`);
    }

    if (outputType === 'png') {
      await page.screenshot({ path: outputFile });
    } else {
      await page.pdf({ format: 'A4', path: outputFile });
    }

    return normalize(outputFile);

  } finally {
    // Guaranteed cleanup - no pools, no lingering processes
    if (page) {
      try {
        await page.close();
      } catch (error) {
        console.warn('Failed to close page:', error);
      }
    }

    if (browser) {
      try {
        await browser.close();

        // Aggressive process cleanup for one-shot mode
        const process = browser.process();
        if (process && !process.killed) {
          // Give it a moment to close gracefully
          await new Promise(resolve => setTimeout(resolve, 500));

          // Force kill if still alive
          if (!process.killed) {
            try {
              process.kill('SIGKILL');
            } catch (error) {
              // Process might already be dead
            }
          }
        }
      } catch (error) {
        console.warn('Failed to close browser:', error);
      }
    }
  }
}

/**
 * Pool-based conversion: Efficient for high-throughput scenarios
 */
async function runPooledConversion(
  url: string,
  outputFile: string,
  outputType: string | null,
  browserOptions: unknown
): Promise<string> {
  const browserManager = await getBrowserManager();
  const browserInstance = await browserManager.getBrowser();

  let page: unknown = null;

  try {
    page = await browserInstance.browser.newPage();
    const res = await page.goto(url, { waitUntil: 'networkidle0' });

    if (!res) {
      throw new Error("Could not load the page.");
    }

    outputType = detectOutputType(outputFile, outputType);

    if (res.status() !== 200) {
      throw new Error(`Error: ${res.status()}: ${res.statusText()}`);
    }

    if (outputType === 'png') {
      await page.screenshot({ path: outputFile });
    } else {
      await page.pdf({ format: 'A4', path: outputFile });
    }

    return normalize(outputFile);

  } finally {
    // Close page
    if (page) {
      try {
        await page.close();
      } catch (error) {
        console.warn('Failed to close page:', error);
      }
    }

    // Return browser to pool
    try {
      await browserManager.releaseBrowser(browserInstance);
    } catch (error) {
      console.error('Failed to release browser to pool:', error);
    }

    // Schedule cleanup for idle browsers
    scheduleAutomaticCleanup(browserManager);
  }
}

/**
 * Schedule automatic cleanup after a short delay
 * This ensures browsers are cleaned up after CLI commands complete
 */
function scheduleAutomaticCleanup(browserManager: DefaultBrowserManager): void {
  // Use a short delay to allow for potential follow-up commands
  // but ensure cleanup happens for one-off commands
  setTimeout(async () => {
    try {
      const status = browserManager.getPoolStatus();

      // Only cleanup if no browsers are currently busy
      if (status.busyBrowsers === 0) {
        await browserManager.shutdown();
        globalBrowserManager = null;
        DefaultBrowserManager.setGlobalInstance(null);

        if (!process.env.PRINTEER_SILENT) {
          console.debug('Automatic browser cleanup completed');
        }
      }
    } catch (error) {
      console.warn('Automatic cleanup failed:', error);
    }
  }, 2000); // 2 second delay
}

function getPackageJson() {
  // Get package.json for version info
}

function detectOutputType(fname: string, outputType: string | null) {
  const validOutputTypes: string[] = ['pdf', 'png']

  if (!outputType) {
    const ext = fname.split('.').pop()
    if (!ext) { return 'pdf' }
    if (validOutputTypes.includes(ext)) { return ext }
    return 'pdf'
  }

  if (!validOutputTypes.includes(outputType)) { return 'pdf' }
  return outputType
}

// Enhanced exports
export * from '../types';
// Export interfaces from their domain modules
export * from '../config/types/command-manager';
export * from '../printing/types/service';

// Export config types with explicit naming to avoid conflicts
export * from '../config';

// Export printing types
export * from '../printing';

// Export resources with renamed ValidationResult to avoid conflict
export {
  DefaultResourceManager,
  ResourceValidator,
  DefaultResourceOptimizer,
  DefaultBrowserPoolOptimizer,
  DefaultNetworkOptimizer,
  DefaultResourceLimitEnforcer,
  DefaultDegradationStrategy,
  DefaultDiskSpaceManager,
  DefaultCleanupManager,
  ProductionMonitor,
  ValidationResult as ResourceValidationResult
} from '../resources';
export * from '../resources/types/resource';

export * from '../diagnostics';
export * from '../utils';

// Doctor functionality
export async function doctor(): Promise<unknown[]> {
  const { DefaultDoctorModule } = await import('../diagnostics/doctor');
  const doctorModule = new DefaultDoctorModule();
  return await doctorModule.runFullDiagnostics();
}

// Enhanced conversion function (placeholder for future implementation)
export async function convert(_options: unknown): Promise<unknown> {
  throw new Error('Enhanced convert function not implemented yet - will be implemented in task 8');
}

// Utility function to get current browser strategy (for debugging)
export function getCurrentBrowserStrategy(): 'oneshot' | 'pool' {
  return getBrowserStrategy();
}

// Utility function to check if browser manager exists (for debugging)
export function hasBrowserManager(): boolean {
  return globalBrowserManager !== null;
}