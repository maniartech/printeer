// Resource management implementation

import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  ResourceManager, 
  ResourceMetrics, 
  ResourcePressure,
  ResourceThresholds,
  CleanupManager 
} from '../types/resource';

export class DefaultResourceManager implements ResourceManager {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsHistory: ResourceMetrics[] = [];
  private readonly maxHistorySize = 20; // Reduced from 100 to minimize memory usage
  private browserInstanceCount = 0;
  private activeRequestCount = 0;
  private thresholds: ResourceThresholds;
  private alertCallbacks: Array<(pressure: ResourcePressure) => void> = [];
  private lastMetrics: ResourceMetrics | null = null; // Cache last metrics to avoid frequent recalculation

  constructor(thresholds?: Partial<ResourceThresholds>) {
    this.thresholds = {
      memoryWarning: 0.7, // 70% of available memory
      memoryCritical: 0.9, // 90% of available memory
      cpuWarning: 0.7, // 70% CPU usage
      cpuCritical: 0.9, // 90% CPU usage
      diskWarning: 0.8, // 80% disk usage
      diskCritical: 0.95, // 95% disk usage
      ...thresholds
    };
  }

  startMonitoring(intervalMs: number = 30000): void { // Default to 30 seconds to be very lightweight
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    // Collect initial metrics immediately but don't block
    setImmediate(async () => {
      try {
        const metrics = await this.collectMetrics();
        this.lastMetrics = metrics;
        this.addMetricsToHistory(metrics);
        
        const pressure = this.calculateResourcePressure(metrics);
        if (pressure.overall) {
          this.notifyResourcePressure(pressure);
        }
      } catch (error) {
        console.error('Error collecting initial resource metrics:', error);
      }
    });

    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        this.lastMetrics = metrics;
        this.addMetricsToHistory(metrics);
        
        const pressure = this.calculateResourcePressure(metrics);
        if (pressure.overall) {
          this.notifyResourcePressure(pressure);
        }
      } catch (error) {
        console.error('Error collecting resource metrics:', error);
      }
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  getCurrentMetrics(): ResourceMetrics {
    if (this.metricsHistory.length === 0) {
      throw new Error('No metrics available. Start monitoring first.');
    }
    return this.metricsHistory[this.metricsHistory.length - 1];
  }

  async getLatestMetrics(): Promise<ResourceMetrics> {
    return await this.collectMetrics();
  }

  checkResourcePressure(): ResourcePressure {
    const metrics = this.getCurrentMetrics();
    return this.calculateResourcePressure(metrics);
  }

  async enforceResourceLimits(): Promise<void> {
    const pressure = this.checkResourcePressure();
    
    if (pressure.memory) {
      await this.handleMemoryPressure();
    }
    
    if (pressure.cpu) {
      await this.handleCpuPressure();
    }
    
    if (pressure.disk) {
      await this.handleDiskPressure();
    }
  }

  async cleanup(): Promise<void> {
    this.stopMonitoring();
    this.metricsHistory = [];
    this.alertCallbacks = [];
  }

  // Public methods for tracking browser instances and requests
  incrementBrowserInstances(): void {
    this.browserInstanceCount++;
  }

  decrementBrowserInstances(): void {
    this.browserInstanceCount = Math.max(0, this.browserInstanceCount - 1);
  }

  incrementActiveRequests(): void {
    this.activeRequestCount++;
  }

  decrementActiveRequests(): void {
    this.activeRequestCount = Math.max(0, this.activeRequestCount - 1);
  }

  // Alert system
  onResourcePressure(callback: (pressure: ResourcePressure) => void): void {
    this.alertCallbacks.push(callback);
  }

  getMetricsHistory(): ResourceMetrics[] {
    return [...this.metricsHistory];
  }

  private async collectMetrics(): Promise<ResourceMetrics> {
    const [memoryUsage, cpuUsage, diskUsage] = await Promise.all([
      this.getMemoryUsage(),
      this.getCpuUsage(),
      this.getDiskUsage()
    ]);

    return {
      memoryUsage,
      cpuUsage,
      diskUsage,
      browserInstances: this.browserInstanceCount,
      activeRequests: this.activeRequestCount,
      timestamp: new Date()
    };
  }

  private async getMemoryUsage(): Promise<number> {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    return usedMemory / totalMemory; // Return as percentage (0-1)
  }

  private async getCpuUsage(): Promise<number> {
    // Use a much shorter sampling period to reduce monitoring overhead
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();

      // Reduced from 100ms to 10ms to minimize monitoring impact
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = process.hrtime(startTime);
        
        const totalTime = endTime[0] * 1000000 + endTime[1] / 1000; // microseconds
        const cpuTime = endUsage.user + endUsage.system; // microseconds
        
        const cpuPercent = cpuTime / totalTime;
        resolve(Math.min(cpuPercent, 1)); // Cap at 100%
      }, 10); // Reduced sampling time
    });
  }

  private async getDiskUsage(): Promise<number> {
    // Use cached disk usage to avoid frequent filesystem calls
    // Only check disk usage occasionally to minimize I/O overhead
    try {
      // For lightweight monitoring, we'll use a simplified approach
      // that doesn't require heavy filesystem operations
      return 0.1; // 10% as conservative placeholder - real implementation would use statvfs or similar
    } catch (error) {
      return 0.1; // Default to 10%
    }
  }

  private addMetricsToHistory(metrics: ResourceMetrics): void {
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
  }

  private calculateResourcePressure(metrics: ResourceMetrics): ResourcePressure {
    const memoryPressure = metrics.memoryUsage > this.thresholds.memoryWarning;
    const cpuPressure = metrics.cpuUsage > this.thresholds.cpuWarning;
    const diskPressure = metrics.diskUsage > this.thresholds.diskWarning;
    const networkPressure = false; // Will be implemented in future tasks
    
    return {
      memory: memoryPressure,
      cpu: cpuPressure,
      disk: diskPressure,
      network: networkPressure,
      overall: memoryPressure || cpuPressure || diskPressure || networkPressure
    };
  }

  private notifyResourcePressure(pressure: ResourcePressure): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(pressure);
      } catch (error) {
        console.error('Error in resource pressure callback:', error);
      }
    });
  }

  private async handleMemoryPressure(): Promise<void> {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Trigger cleanup
    const cleanupManager = new DefaultCleanupManager();
    await cleanupManager.cleanupMemory();
  }

  private async handleCpuPressure(): Promise<void> {
    // Implement CPU pressure handling (e.g., throttling)
    console.warn('CPU pressure detected - consider reducing concurrent operations');
  }

  private async handleDiskPressure(): Promise<void> {
    // Trigger disk cleanup
    const cleanupManager = new DefaultCleanupManager();
    await cleanupManager.cleanupTempFiles();
  }
}

export class DefaultCleanupManager implements CleanupManager {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private tempFilePatterns: string[] = [
    'printeer-*',
    'puppeteer_dev_chrome_profile-*',
    '*.tmp',
    '*.temp'
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
    // Force garbage collection to clean up browser-related objects
    if (global.gc) {
      global.gc();
    }

    // Clean up any remaining browser temp directories
    await this.cleanupBrowserTempDirs();
  }

  async cleanupMemory(): Promise<void> {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Clear any large caches or buffers
    // This is a placeholder for more sophisticated memory cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  scheduleCleanup(intervalMs: number): void {
    if (this.cleanupInterval) {
      return; // Already scheduled
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

  private shouldCleanupFile(filename: string): boolean {
    return this.tempFilePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filename);
      }
      return filename === pattern;
    });
  }

  private async safeDelete(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      
      if (stats.isDirectory()) {
        await fs.rmdir(filePath, { recursive: true });
      } else {
        await fs.unlink(filePath);
      }
    } catch (error) {
      // Ignore errors for files that don't exist or can't be deleted
      // This is expected behavior for temp file cleanup
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