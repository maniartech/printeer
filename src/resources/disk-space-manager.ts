// Disk Space Manager Implementation

import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DiskSpaceManager } from './types/resource';

export class DefaultDiskSpaceManager implements DiskSpaceManager {
  private readonly tempDir = os.tmpdir();

  async getTotalDiskUsage(): Promise<number> {
    try {
      return 0.1; // 10% as placeholder
    } catch (error) {
      return 0.1;
    }
  }

  async cleanupOldTempFiles(maxAgeMs: number): Promise<number> {
    let cleanedCount = 0;
    const cutoffTime = Date.now() - maxAgeMs;

    try {
      const files = await fs.readdir(this.tempDir);
      const cleanupPromises: Promise<void>[] = [];

      for (const file of files) {
        if (this.shouldCleanupTempFile(file)) {
          const filePath = path.join(this.tempDir, file);
          cleanupPromises.push(this.cleanupOldFile(filePath, cutoffTime).then(cleaned => {
            if (cleaned) cleanedCount++;
          }));
        }
      }

      await Promise.allSettled(cleanupPromises);
    } catch (error) {
      console.warn('Error during old temp file cleanup:', error);
    }

    return cleanedCount;
  }

  async cleanupLargeTempFiles(maxSizeMB: number): Promise<number> {
    let cleanedCount = 0;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    try {
      const files = await fs.readdir(this.tempDir);
      const cleanupPromises: Promise<void>[] = [];

      for (const file of files) {
        if (this.shouldCleanupTempFile(file)) {
          const filePath = path.join(this.tempDir, file);
          cleanupPromises.push(this.cleanupLargeFile(filePath, maxSizeBytes).then(cleaned => {
            if (cleaned) cleanedCount++;
          }));
        }
      }

      await Promise.allSettled(cleanupPromises);
    } catch (error) {
      console.warn('Error during large temp file cleanup:', error);
    }

    return cleanedCount;
  }

  async getRecommendedCleanupActions(): Promise<string[]> {
    const actions: string[] = [];

    try {
      const files = await fs.readdir(this.tempDir);
      const tempFiles = files.filter(file => this.shouldCleanupTempFile(file));

      if (tempFiles.length > 50) {
        actions.push('Clean up temporary files (50+ files found)');
      }

      if (tempFiles.some(file => file.includes('chrome') || file.includes('puppeteer'))) {
        actions.push('Clean up browser temporary directories');
      }

      if (tempFiles.some(file => file.endsWith('.tmp') || file.endsWith('.temp'))) {
        actions.push('Clean up temporary cache files');
      }
    } catch (error) {
      console.warn('Error getting cleanup recommendations:', error);
    }

    return actions;
  }

  private shouldCleanupTempFile(filename: string): boolean {
    const tempPatterns = [
      'printeer-',
      'puppeteer_dev_chrome_profile-',
      'chrome_',
      'chromium_',
      '.tmp',
      '.temp'
    ];

    return tempPatterns.some(pattern => filename.includes(pattern));
  }

  private async cleanupOldFile(filePath: string, cutoffTime: number): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);

      if (stats.mtime.getTime() < cutoffTime) {
        if (stats.isDirectory()) {
          await fs.rm(filePath, { recursive: true, force: true });
        } else {
          await fs.unlink(filePath);
        }
        return true;
      }
    } catch (error) {
      // Ignore errors - file might not exist or be in use
    }
    return false;
  }

  private async cleanupLargeFile(filePath: string, maxSizeBytes: number): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);

      if (stats.size > maxSizeBytes) {
        if (stats.isDirectory()) {
          await fs.rm(filePath, { recursive: true, force: true });
        } else {
          await fs.unlink(filePath);
        }
        return true;
      }
    } catch (error) {
      // Ignore errors - file might not exist or be in use
    }
    return false;
  }
}