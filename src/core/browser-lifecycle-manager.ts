/**
 * Production Browser Lifecycle Manager
 * 
 * This module provides comprehensive browser lifecycle management for production
 * environments, ensuring no zombie processes are left behind.
 */

import { Browser } from 'puppeteer';
import { EventEmitter } from 'events';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

interface ManagedBrowser {
  browser: Browser;
  pid?: number;
  startTime: number;
  lastUsed: number;
  isActive: boolean;
  processName?: string;
}

interface ProcessCleanupResult {
  totalFound: number;
  totalKilled: number;
  errors: string[];
  warnings: string[];
}

export class BrowserLifecycleManager extends EventEmitter {
  private static instance: BrowserLifecycleManager;
  private browsers = new Map<string, ManagedBrowser>();
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;
  private maxBrowserAge = 30 * 60 * 1000; // 30 minutes
  private maxIdleTime = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval = 60 * 1000; // 1 minute

  static getInstance(): BrowserLifecycleManager {
    if (!BrowserLifecycleManager.instance) {
      BrowserLifecycleManager.instance = new BrowserLifecycleManager();
    }
    return BrowserLifecycleManager.instance;
  }

  private constructor() {
    super();
    this.setupProcessHandlers();
  }

  /**
   * Register a browser for lifecycle management
   */
  registerBrowser(browser: Browser): string {
    const id = this.generateBrowserId();
    const pid = this.getBrowserPid(browser);
    
    const managedBrowser: ManagedBrowser = {
      browser,
      pid,
      startTime: Date.now(),
      lastUsed: Date.now(),
      isActive: true,
      processName: this.getBrowserProcessName(browser)
    };

    this.browsers.set(id, managedBrowser);

    // Set up browser event handlers
    browser.on('disconnected', () => {
      this.handleBrowserDisconnected(id);
    });

    browser.on('targetcreated', () => {
      this.updateLastUsed(id);
    });

    this.emit('browserRegistered', { id, pid, processName: managedBrowser.processName });
    
    // Start monitoring if this is the first browser
    if (this.browsers.size === 1 && !this.isMonitoring) {
      this.startMonitoring();
    }

    return id;
  }

  /**
   * Unregister and cleanup a browser
   */
  async unregisterBrowser(id: string): Promise<void> {
    const managedBrowser = this.browsers.get(id);
    if (!managedBrowser) {
      return;
    }

    await this.closeBrowserSafely(managedBrowser);
    this.browsers.delete(id);
    
    this.emit('browserUnregistered', { id, pid: managedBrowser.pid });

    // Stop monitoring if no browsers left
    if (this.browsers.size === 0 && this.isMonitoring) {
      this.stopMonitoring();
    }
  }

  /**
   * Update last used time for a browser
   */
  updateLastUsed(id: string): void {
    const managedBrowser = this.browsers.get(id);
    if (managedBrowser) {
      managedBrowser.lastUsed = Date.now();
    }
  }

  /**
   * Start monitoring browser processes
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.performCleanupCycle().catch(error => {
        this.emit('error', new Error(`Monitoring cleanup failed: ${error.message}`));
      });
    }, this.cleanupInterval);

    this.emit('monitoringStarted');
  }

  /**
   * Stop monitoring browser processes
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.emit('monitoringStopped');
  }

  /**
   * Perform a cleanup cycle
   */
  private async performCleanupCycle(): Promise<void> {
    const now = Date.now();
    const browsersToCleanup: string[] = [];

    // Find browsers that need cleanup
    for (const [id, managedBrowser] of this.browsers.entries()) {
      const age = now - managedBrowser.startTime;
      const idleTime = now - managedBrowser.lastUsed;

      // Check if browser is too old or idle
      if (age > this.maxBrowserAge || idleTime > this.maxIdleTime) {
        browsersToCleanup.push(id);
        continue;
      }

      // Check if browser process is still alive
      if (managedBrowser.pid && !await this.isProcessAlive(managedBrowser.pid)) {
        browsersToCleanup.push(id);
        continue;
      }

      // Check if browser is still connected
      if (!managedBrowser.browser.isConnected()) {
        browsersToCleanup.push(id);
        continue;
      }
    }

    // Cleanup identified browsers
    for (const id of browsersToCleanup) {
      await this.unregisterBrowser(id);
    }

    // Emit cleanup stats
    if (browsersToCleanup.length > 0) {
      this.emit('cleanupPerformed', {
        cleaned: browsersToCleanup.length,
        remaining: this.browsers.size
      });
    }
  }

  /**
   * Emergency cleanup - kill all managed browsers
   */
  async emergencyCleanup(): Promise<ProcessCleanupResult> {
    const result: ProcessCleanupResult = {
      totalFound: this.browsers.size,
      totalKilled: 0,
      errors: [],
      warnings: []
    };

    // Close all managed browsers
    const cleanupPromises = Array.from(this.browsers.entries()).map(
      async ([id, managedBrowser]) => {
        try {
          await this.closeBrowserSafely(managedBrowser);
          result.totalKilled++;
        } catch (error) {
          result.errors.push(`Failed to close browser ${id}: ${error.message}`);
        }
      }
    );

    await Promise.all(cleanupPromises);
    this.browsers.clear();

    return result;
  }

  /**
   * System-wide Chromium process cleanup
   */
  async cleanupOrphanedProcesses(): Promise<ProcessCleanupResult> {
    const result: ProcessCleanupResult = {
      totalFound: 0,
      totalKilled: 0,
      errors: [],
      warnings: []
    };

    try {
      if (process.platform === 'win32') {
        return await this.cleanupWindowsProcesses();
      } else {
        return await this.cleanupUnixProcesses();
      }
    } catch (error) {
      result.errors.push(`System cleanup failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Windows-specific process cleanup
   */
  private async cleanupWindowsProcesses(): Promise<ProcessCleanupResult> {
    const result: ProcessCleanupResult = {
      totalFound: 0,
      totalKilled: 0,
      errors: [],
      warnings: []
    };

    try {
      // Find Puppeteer Chrome processes
      const { stdout } = await execAsync(`
        Get-WmiObject Win32_Process | 
        Where-Object { 
          ($_.CommandLine -like "*puppeteer*chrome-win*") -or
          ($_.CommandLine -like "*--user-data-dir=*") -or
          ($_.CommandLine -like "*--remote-debugging-port*") -or
          ($_.CommandLine -like "*--headless*" -and $_.Name -eq "chrome.exe")
        } | 
        Select-Object ProcessId, CommandLine, CreationDate | 
        ConvertTo-Json
      `, { shell: 'powershell', timeout: 30000 });

      const processes = JSON.parse(stdout || '[]');
      const processList = Array.isArray(processes) ? processes : (processes ? [processes] : []);
      
      result.totalFound = processList.length;

      // Kill each process
      for (const proc of processList) {
        try {
          await execAsync(`Stop-Process -Id ${proc.ProcessId} -Force -ErrorAction SilentlyContinue`, 
            { shell: 'powershell', timeout: 5000 });
          result.totalKilled++;
        } catch (error) {
          result.errors.push(`Failed to kill process ${proc.ProcessId}: ${error.message}`);
        }
      }

      // Wait for processes to die
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify cleanup
      const remaining = await this.countRemainingWindowsProcesses();
      if (remaining > 0) {
        result.warnings.push(`${remaining} Chrome processes still running after cleanup`);
      }

    } catch (error) {
      result.errors.push(`Windows cleanup failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Unix-specific process cleanup
   */
  private async cleanupUnixProcesses(): Promise<ProcessCleanupResult> {
    const result: ProcessCleanupResult = {
      totalFound: 0,
      totalKilled: 0,
      errors: [],
      warnings: []
    };

    try {
      // Find Chrome/Chromium processes with Puppeteer indicators
      const { stdout } = await execAsync(`
        ps aux | grep -E "(chrome|chromium)" | 
        grep -E "(puppeteer|user-data-dir|remote-debugging-port|headless)" | 
        grep -v grep | 
        awk '{print $2}'
      `, { timeout: 30000 });

      const pids = stdout.trim().split('\n')
        .map(pid => parseInt(pid.trim()))
        .filter(pid => !isNaN(pid));

      result.totalFound = pids.length;

      // Kill each process
      for (const pid of pids) {
        try {
          process.kill(pid, 'SIGKILL');
          result.totalKilled++;
        } catch (error) {
          result.errors.push(`Failed to kill process ${pid}: ${error.message}`);
        }
      }

      // Wait for processes to die
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify cleanup
      const remaining = await this.countRemainingUnixProcesses();
      if (remaining > 0) {
        result.warnings.push(`${remaining} Chrome processes still running after cleanup`);
      }

    } catch (error) {
      result.errors.push(`Unix cleanup failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Get browser process information
   */
  private getBrowserPid(browser: Browser): number | undefined {
    try {
      return browser.process()?.pid;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get browser process name
   */
  private getBrowserProcessName(browser: Browser): string | undefined {
    try {
      const process = browser.process();
      return process?.spawnfile || 'chrome';
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Check if a process is still alive
   */
  private async isProcessAlive(pid: number): Promise<boolean> {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(`Get-Process -Id ${pid} -ErrorAction SilentlyContinue | Select-Object Id`, 
          { shell: 'powershell', timeout: 5000 });
        return stdout.trim().length > 0;
      } else {
        process.kill(pid, 0); // Signal 0 checks if process exists
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Safely close a browser
   */
  private async closeBrowserSafely(managedBrowser: ManagedBrowser): Promise<void> {
    const { browser, pid } = managedBrowser;

    try {
      // Try graceful close first
      if (browser.isConnected()) {
        await Promise.race([
          browser.close(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Browser close timeout')), 10000)
          )
        ]);
      }
    } catch (error) {
      // Graceful close failed, force kill
      if (pid && await this.isProcessAlive(pid)) {
        try {
          if (process.platform === 'win32') {
            await execAsync(`Stop-Process -Id ${pid} -Force`, { shell: 'powershell', timeout: 5000 });
          } else {
            process.kill(pid, 'SIGKILL');
          }
        } catch (killError) {
          throw new Error(`Failed to force kill browser process ${pid}: ${killError.message}`);
        }
      }
    }
  }

  /**
   * Count remaining Windows Chrome processes
   */
  private async countRemainingWindowsProcesses(): Promise<number> {
    try {
      const { stdout } = await execAsync(`
        (Get-WmiObject Win32_Process | 
         Where-Object { $_.Name -eq "chrome.exe" -or $_.Name -eq "chromium.exe" }).Count
      `, { shell: 'powershell', timeout: 10000 });
      return parseInt(stdout.trim()) || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Count remaining Unix Chrome processes
   */
  private async countRemainingUnixProcesses(): Promise<number> {
    try {
      const { stdout } = await execAsync(`ps aux | grep -E "(chrome|chromium)" | grep -v grep | wc -l`, 
        { timeout: 10000 });
      return parseInt(stdout.trim()) || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Handle browser disconnection
   */
  private handleBrowserDisconnected(id: string): void {
    const managedBrowser = this.browsers.get(id);
    if (managedBrowser) {
      managedBrowser.isActive = false;
      this.emit('browserDisconnected', { id, pid: managedBrowser.pid });
    }
  }

  /**
   * Generate unique browser ID
   */
  private generateBrowserId(): string {
    return `browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup process exit handlers
   */
  private setupProcessHandlers(): void {
    const cleanup = async () => {
      try {
        await this.emergencyCleanup();
      } catch (error) {
        console.error('Emergency cleanup failed:', error);
      }
    };

    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception, performing emergency cleanup:', error);
      cleanup().finally(() => process.exit(1));
    });
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled rejection, performing emergency cleanup:', reason);
      cleanup().finally(() => process.exit(1));
    });
  }

  /**
   * Get current status
   */
  getStatus(): {
    isMonitoring: boolean;
    activeBrowsers: number;
    browsers: Array<{
      id: string;
      pid?: number;
      age: number;
      idleTime: number;
      isActive: boolean;
    }>;
  } {
    const now = Date.now();
    const browsers = Array.from(this.browsers.entries()).map(([id, browser]) => ({
      id,
      pid: browser.pid,
      age: now - browser.startTime,
      idleTime: now - browser.lastUsed,
      isActive: browser.isActive
    }));

    return {
      isMonitoring: this.isMonitoring,
      activeBrowsers: this.browsers.size,
      browsers
    };
  }
}

// Export singleton instance
export const browserLifecycle = BrowserLifecycleManager.getInstance();
export default browserLifecycle;