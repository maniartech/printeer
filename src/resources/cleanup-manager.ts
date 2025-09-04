// Cleanup Manager Implementation

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