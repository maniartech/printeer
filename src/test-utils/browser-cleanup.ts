/**
 * Browser Cleanup Utilities for Tests
 * 
 * This module provides comprehensive browser cleanup functionality to prevent
 * memory leaks and zombie processes during testing.
 */

import { Browser } from 'puppeteer';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface BrowserProcess {
  browser: Browser;
  pid?: number;
  startTime: number;
}

class BrowserCleanupManager {
  private static instance: BrowserCleanupManager;
  private activeBrowsers = new Map<string, BrowserProcess>();
  private cleanupHandlers: Array<() => Promise<void>> = [];
  private isShuttingDown = false;

  static getInstance(): BrowserCleanupManager {
    if (!BrowserCleanupManager.instance) {
      BrowserCleanupManager.instance = new BrowserCleanupManager();
    }
    return BrowserCleanupManager.instance;
  }

  private constructor() {
    // Register process cleanup handlers
    this.setupProcessCleanup();
  }

  /**
   * Register a browser instance for cleanup tracking
   */
  registerBrowser(browser: Browser, id?: string): string {
    const browserId = id || `browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const browserProcess: BrowserProcess = {
      browser,
      pid: this.getBrowserPid(browser),
      startTime: Date.now()
    };

    this.activeBrowsers.set(browserId, browserProcess);
    
    // Auto-cleanup after browser closes
    browser.on('disconnected', () => {
      this.activeBrowsers.delete(browserId);
    });

    return browserId;
  }

  /**
   * Unregister and cleanup a specific browser
   */
  async unregisterBrowser(browserId: string): Promise<void> {
    const browserProcess = this.activeBrowsers.get(browserId);
    if (!browserProcess) {
      return;
    }

    await this.closeBrowserSafely(browserProcess);
    this.activeBrowsers.delete(browserId);
  }

  /**
   * Get the PID of a browser process
   */
  private getBrowserPid(browser: Browser): number | undefined {
    try {
      const process = browser.process();
      return process?.pid;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Safely close a browser with force-kill fallback
   */
  private async closeBrowserSafely(browserProcess: BrowserProcess): Promise<void> {
    const { browser, pid } = browserProcess;

    try {
      // First, try graceful close
      if (browser.isConnected()) {
        await Promise.race([
          browser.close(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Browser close timeout')), 5000)
          )
        ]);
      }
    } catch (error) {
      console.warn(`Graceful browser close failed: ${error}`);
    }

    // Force kill the process if it's still running
    if (pid) {
      await this.forceKillProcess(pid);
    }
  }

  /**
   * Force kill a process by PID
   */
  private async forceKillProcess(pid: number): Promise<void> {
    try {
      // Check if process is still running
      if (!await this.isProcessRunning(pid)) {
        return;
      }

      if (process.platform === 'win32') {
        // Windows: Use taskkill
        await execAsync(`taskkill /F /PID ${pid} /T`);
      } else {
        // Unix-like: Use kill
        process.kill(pid, 'SIGKILL');
      }

      // Wait a bit and verify process is dead
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (await this.isProcessRunning(pid)) {
        console.warn(`Process ${pid} still running after force kill`);
      }
    } catch (error) {
      // Process might already be dead, which is fine
      console.debug(`Force kill process ${pid} failed (might already be dead): ${error}`);
    }
  }

  /**
   * Check if a process is still running
   */
  private async isProcessRunning(pid: number): Promise<boolean> {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
        return stdout.includes(pid.toString());
      } else {
        // Send signal 0 to check if process exists
        process.kill(pid, 0);
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Cleanup all registered browsers
   */
  async cleanupAllBrowsers(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    const cleanupPromises = Array.from(this.activeBrowsers.entries()).map(
      async ([browserId, browserProcess]) => {
        try {
          await this.closeBrowserSafely(browserProcess);
        } catch (error) {
          console.error(`Failed to cleanup browser ${browserId}:`, error);
        }
      }
    );

    await Promise.all(cleanupPromises);
    this.activeBrowsers.clear();

    // Run additional cleanup handlers
    const handlerPromises = this.cleanupHandlers.map(handler => 
      handler().catch(error => console.error('Cleanup handler failed:', error))
    );
    await Promise.all(handlerPromises);

    this.isShuttingDown = false;
  }

  /**
   * Kill all Chrome/Chromium processes (nuclear option)
   */
  async killAllChromiumProcesses(): Promise<{ killed: number; errors: string[] }> {
    const results = { killed: 0, errors: [] as string[] };
    
    try {
      if (process.platform === 'win32') {
        // Windows - Kill Puppeteer-specific Chrome processes
        const puppeteerProcesses = await this.findPuppeteerProcessesWindows();
        results.killed += await this.killWindowsProcesses(puppeteerProcesses);
        
        // Also kill any remaining chrome/chromium processes
        const chromeProcesses = await this.findChromeProcessesWindows();
        results.killed += await this.killWindowsProcesses(chromeProcesses);
      } else {
        // Unix-like systems
        const processes = await this.findPuppeteerProcessesUnix();
        results.killed += await this.killUnixProcesses(processes);
      }
      
      // Wait for processes to die
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify cleanup
      const remaining = await this.countRemainingProcesses();
      if (remaining > 0) {
        results.errors.push(`${remaining} processes still running after cleanup`);
      }
      
    } catch (error) {
      results.errors.push(`Kill all chromium processes failed: ${error}`);
    }
    
    return results;
  }

  /**
   * Find Puppeteer-specific Chrome processes on Windows
   */
  private async findPuppeteerProcessesWindows(): Promise<number[]> {
    try {
      const { stdout } = await execAsync(`
        Get-WmiObject Win32_Process | 
        Where-Object { 
          $_.CommandLine -like "*puppeteer*chrome-win*" -or 
          $_.CommandLine -like "*--user-data-dir=*" -or
          $_.CommandLine -like "*--remote-debugging-port*" 
        } | 
        Select-Object ProcessId | 
        ConvertTo-Json
      `, { shell: 'powershell' });
      
      const processes = JSON.parse(stdout || '[]');
      return Array.isArray(processes) 
        ? processes.map(p => p.ProcessId).filter(Boolean)
        : processes?.ProcessId ? [processes.ProcessId] : [];
    } catch (error) {
      console.debug('Failed to find Puppeteer processes on Windows:', error);
      return [];
    }
  }

  /**
   * Find Chrome processes on Windows (fallback)
   */
  private async findChromeProcessesWindows(): Promise<number[]> {
    try {
      const { stdout } = await execAsync(`
        Get-WmiObject Win32_Process | 
        Where-Object { 
          $_.Name -eq "chrome.exe" -or 
          $_.Name -eq "chromium.exe" 
        } | 
        Select-Object ProcessId | 
        ConvertTo-Json
      `, { shell: 'powershell' });
      
      const processes = JSON.parse(stdout || '[]');
      return Array.isArray(processes) 
        ? processes.map(p => p.ProcessId).filter(Boolean)
        : processes?.ProcessId ? [processes.ProcessId] : [];
    } catch (error) {
      console.debug('Failed to find Chrome processes on Windows:', error);
      return [];
    }
  }

  /**
   * Kill Windows processes by PID
   */
  private async killWindowsProcesses(pids: number[]): Promise<number> {
    let killed = 0;
    
    for (const pid of pids) {
      try {
        await execAsync(`Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`, { shell: 'powershell' });
        killed++;
      } catch (error) {
        console.debug(`Failed to kill Windows process ${pid}:`, error);
      }
    }
    
    return killed;
  }

  /**
   * Find Puppeteer processes on Unix-like systems
   */
  private async findPuppeteerProcessesUnix(): Promise<number[]> {
    try {
      const { stdout } = await execAsync(`
        ps aux | grep -E "(chrome|chromium)" | 
        grep -E "(puppeteer|user-data-dir|remote-debugging-port)" | 
        grep -v grep | 
        awk '{print $2}'
      `);
      
      return stdout.trim().split('\n')
        .map(pid => parseInt(pid.trim()))
        .filter(pid => !isNaN(pid));
    } catch (error) {
      console.debug('Failed to find Puppeteer processes on Unix:', error);
      return [];
    }
  }

  /**
   * Kill Unix processes by PID
   */
  private async killUnixProcesses(pids: number[]): Promise<number> {
    let killed = 0;
    
    for (const pid of pids) {
      try {
        process.kill(pid, 'SIGKILL');
        killed++;
      } catch (error) {
        console.debug(`Failed to kill Unix process ${pid}:`, error);
      }
    }
    
    return killed;
  }

  /**
   * Count remaining Chrome/Chromium processes
   */
  private async countRemainingProcesses(): Promise<number> {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(`
          (Get-WmiObject Win32_Process | 
           Where-Object { 
             $_.Name -eq "chrome.exe" -or 
             $_.Name -eq "chromium.exe" 
           }).Count
        `, { shell: 'powershell' });
        return parseInt(stdout.trim()) || 0;
      } else {
        const { stdout } = await execAsync(`ps aux | grep -E "(chrome|chromium)" | grep -v grep | wc -l`);
        return parseInt(stdout.trim()) || 0;
      }
    } catch (error) {
      return 0;
    }
  }

  /**
   * Add a custom cleanup handler
   */
  addCleanupHandler(handler: () => Promise<void>): void {
    this.cleanupHandlers.push(handler);
  }

  /**
   * Get status of active browsers
   */
  getStatus(): { count: number; browsers: Array<{ id: string; pid?: number; age: number }> } {
    const now = Date.now();
    const browsers = Array.from(this.activeBrowsers.entries()).map(([id, process]) => ({
      id,
      pid: process.pid,
      age: now - process.startTime
    }));

    return {
      count: this.activeBrowsers.size,
      browsers
    };
  }

  /**
   * Setup process cleanup handlers
   */
  private setupProcessCleanup(): void {
    const cleanup = () => {
      this.cleanupAllBrowsers().catch(error => {
        console.error('Process cleanup failed:', error);
      });
    };

    // Handle various exit scenarios
    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      cleanup();
    });
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled rejection:', reason);
      cleanup();
    });
  }
}

// Export singleton instance
export const browserCleanup = BrowserCleanupManager.getInstance();

/**
 * Test utility functions
 */

/**
 * Wrap a browser instance with automatic cleanup
 */
export function wrapBrowserForCleanup(browser: Browser, id?: string): string {
  return browserCleanup.registerBrowser(browser, id);
}

/**
 * Create a test-safe browser launcher that ensures cleanup
 */
export async function createTestBrowser(launchOptions: any = {}): Promise<{ browser: Browser; cleanup: () => Promise<void> }> {
  const puppeteer = await import('puppeteer');
  
  // Ensure test-friendly options
  const testOptions = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--headless=new'
    ],
    ...launchOptions
  };

  const browser = await puppeteer.launch(testOptions);
  const browserId = browserCleanup.registerBrowser(browser);

  return {
    browser,
    cleanup: async () => {
      await browserCleanup.unregisterBrowser(browserId);
    }
  };
}

/**
 * Setup test environment with browser cleanup
 */
export function setupBrowserCleanup(): {
  cleanup: () => Promise<void>;
  killAll: () => Promise<void>;
  getStatus: () => { count: number; browsers: Array<{ id: string; pid?: number; age: number }> };
} {
  return {
    cleanup: () => browserCleanup.cleanupAllBrowsers(),
    killAll: () => browserCleanup.killAllChromiumProcesses(),
    getStatus: () => browserCleanup.getStatus()
  };
}

/**
 * Test hook for ensuring cleanup after each test
 */
export async function ensureTestCleanup(): Promise<void> {
  await browserCleanup.cleanupAllBrowsers();
  
  // Additional safety: kill any remaining processes
  const status = browserCleanup.getStatus();
  if (status.count > 0) {
    console.warn(`${status.count} browsers still active after cleanup, force killing...`);
    await browserCleanup.killAllChromiumProcesses();
  }
}

export default browserCleanup;