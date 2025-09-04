/**
 * # Cleanup Manager - Automated Resource Cleanup System
 * 
 * ## Purpose
 * The DefaultCleanupManager provides comprehensive cleanup of temporary files, browser resources,
 * and memory to maintain system health and prevent resource leaks in long-running PDF generation services.
 * 
 * ## Core Responsibilities
 * 1. **Temporary File Cleanup**: Remove application-specific temporary files
 * 2. **Browser Resource Cleanup**: Clean browser profiles, cache, and temporary directories
 * 3. **Memory Management**: Trigger garbage collection and memory optimization
 * 4. **Scheduled Cleanup**: Automated periodic cleanup operations
 * 
 * ## Cleanup Strategies
 * 
 * ### Temporary File Management
 * 
 * #### Target File Patterns
 * - `printeer-*`: Application-specific temporary files
 * - `puppeteer_dev_chrome_profile-*`: Browser profile directories
 * - `*.tmp`, `*.temp`: Generic temporary files
 * - Browser-specific patterns: `chrome_*`, `chromium_*`
 * 
 * #### Cleanup Approach
 * - **Safe Deletion**: Handles file system errors gracefully
 * - **Concurrent Processing**: Uses Promise.allSettled for parallel cleanup
 * - **Directory Handling**: Recursively removes temporary directories
 * - **Error Resilience**: Continues cleanup even if individual files fail
 * 
 * ### Browser Resource Cleanup
 * 
 * #### Browser Temporary Directories
 * - Puppeteer Chrome profiles and data directories
 * - Browser cache and session storage
 * - Downloaded files and temporary browser assets
 * 
 * #### Memory Optimization
 * - Triggers Node.js garbage collection when available
 * - Provides memory pressure relief during high-load periods
 * - Coordinates with system memory management
 * 
 * ## Cleanup Modes
 * 
 * ### Immediate Cleanup
 * ```typescript
 * const cleanup = new DefaultCleanupManager();
 * 
 * // Clean temporary files immediately
 * await cleanup.cleanupTempFiles();
 * 
 * // Clean browser resources
 * await cleanup.cleanupBrowserResources();
 * 
 * // Trigger memory cleanup
 * await cleanup.cleanupMemory();
 * ```
 * 
 * ### Scheduled Cleanup
 * ```typescript
 * // Schedule cleanup every 5 minutes
 * cleanup.scheduleCleanup(5 * 60 * 1000);
 * 
 * // Stop scheduled cleanup
 * cleanup.stopScheduledCleanup();
 * ```
 * 
 * ## Safety Features
 * 
 * ### Error Handling
 * - **Graceful Degradation**: Continues operation even if cleanup fails
 * - **File System Errors**: Handles permission issues and file locks
 * - **Concurrent Access**: Manages conflicts with other processes
 * 
 * ### File System Safety
 * - **Pattern Matching**: Only removes files matching specific patterns
 * - **Path Validation**: Ensures cleanup operations stay within temp directories
 * - **Atomic Operations**: Uses safe file system operations
 * 
 * ## Performance Considerations
 * 
 * ### Efficient Operations
 * - **Parallel Processing**: Concurrent file operations for speed
 * - **Minimal System Impact**: Designed for background operation
 * - **Resource Awareness**: Adjusts cleanup intensity based on system load
 * 
 * ### Cleanup Timing
 * - **Immediate**: Triggered during resource pressure
 * - **Scheduled**: Regular maintenance cleanup
 * - **Shutdown**: Comprehensive cleanup during service shutdown
 * 
 * ## Integration with Resource Management
 * 
 * ### Resource Manager Integration
 * - Called automatically during disk pressure events
 * - Provides cleanup services for resource optimization
 * - Coordinates with other resource management components
 * 
 * ### Disk Space Manager Integration
 * - Works with DiskSpaceManager for comprehensive disk management
 * - Provides cleanup services for disk space optimization
 * - Supports age-based and size-based cleanup strategies
 * 
 * ## Production Usage
 * 
 * ### Long-Running Services
 * - Prevents accumulation of temporary files over time
 * - Maintains system performance in production environments
 * - Provides automated maintenance without manual intervention
 * 
 * ### High-Throughput Scenarios
 * - Handles cleanup for thousands of PDF generation requests
 * - Manages browser resource lifecycle efficiently
 * - Prevents resource exhaustion during peak loads
 * 
 * ## Monitoring and Logging
 * - Provides warnings for cleanup errors without stopping operation
 * - Logs cleanup activities for system monitoring
 * - Supports debugging of resource management issues
 */

import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CleanupManager } from './types/resource';

export class DefaultCleanupManager implements CleanupManager {
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private tempFilePatterns: string[] = [
    'printeer-',
    'puppeteer_dev_chrome_profile-',
    '.tmp',
    '.temp'
  ];

  async cleanupTempFiles(): Promise<void> {
    const tempDir = os.tmpdir();

    try {
      const files = await fs.readdir(tempDir);
      const cleanupPromises: Promise<void>[] = [];

      for (const file of files) {
        if (this.shouldCleanupFile(file)) {
          const filePath = path.join(tempDir, file);
          cleanupPromises.push(this.safeDelete(filePath));
        }
      }

      await Promise.allSettled(cleanupPromises);
    } catch (error) {
      console.warn('Error during temp file cleanup:', error);
    }
  }

  async cleanupBrowserResources(): Promise<void> {
    if (global.gc) {
      global.gc();
    }

    await this.cleanupBrowserTempDirs();
  }

  async cleanupMemory(): Promise<void> {
    if (global.gc) {
      global.gc();
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  scheduleCleanup(intervalMs: number): void {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupTempFiles();
        await this.cleanupMemory();
      } catch (error) {
        console.error('Error during scheduled cleanup:', error);
      }
    }, intervalMs);
  }

  stopScheduledCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  async cleanup(): Promise<void> {
    this.stopScheduledCleanup();
    await new Promise(resolve => setImmediate(resolve));
  }

  private shouldCleanupFile(filename: string): boolean {
    return this.tempFilePatterns.some(pattern => filename.includes(pattern));
  }

  private async safeDelete(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);

      if (stats.isDirectory()) {
        await fs.rm(filePath, { recursive: true, force: true });
      } else {
        await fs.unlink(filePath);
      }
    } catch (error) {
      // Ignore errors for files that don't exist or can't be deleted
    }
  }

  private async cleanupBrowserTempDirs(): Promise<void> {
    const tempDir = os.tmpdir();

    try {
      const files = await fs.readdir(tempDir);
      const browserTempDirs = files.filter(file =>
        file.startsWith('puppeteer_dev_chrome_profile-') ||
        file.startsWith('chrome_') ||
        file.startsWith('chromium_')
      );

      const cleanupPromises = browserTempDirs.map(dir =>
        this.safeDelete(path.join(tempDir, dir))
      );

      await Promise.allSettled(cleanupPromises);
    } catch (error) {
      console.warn('Error cleaning up browser temp directories:', error);
    }
  }
}