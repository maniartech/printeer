import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DefaultResourceManager, DefaultCleanupManager } from '../resource';
import { ResourceMetrics, ResourcePressure } from '../../types/resource';

// Mock the os module
vi.mock('os', () => ({
  totalmem: vi.fn(),
  freemem: vi.fn(),
  tmpdir: vi.fn()
}));

// Mock the fs module
vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
  unlink: vi.fn(),
  rmdir: vi.fn()
}));

// Mock path.join to handle cross-platform paths in tests
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    join: vi.fn((...args: string[]) => args.join('/')) // Always use forward slashes in tests
  };
});

const mockPathJoin = vi.mocked(path.join);

// Mock global.gc
const mockGc = vi.fn();
Object.defineProperty(global, 'gc', {
  value: mockGc,
  writable: true,
  configurable: true
});

describe('DefaultResourceManager', () => {
  let resourceManager: DefaultResourceManager;
  const mockTotalmem = vi.mocked(os.totalmem);
  const mockFreemem = vi.mocked(os.freemem);

  beforeEach(() => {
    resourceManager = new DefaultResourceManager();
    vi.clearAllMocks();
    
    // Setup default mock values
    mockTotalmem.mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB
    mockFreemem.mockReturnValue(4 * 1024 * 1024 * 1024); // 4GB free
  });

  afterEach(() => {
    resourceManager.cleanup();
  });

  describe('constructor', () => {
    it('should initialize with default thresholds', () => {
      const manager = new DefaultResourceManager();
      expect(manager).toBeDefined();
    });

    it('should accept custom thresholds', () => {
      const customThresholds = {
        memoryWarning: 0.8,
        cpuWarning: 0.6
      };
      const manager = new DefaultResourceManager(customThresholds);
      expect(manager).toBeDefined();
    });
  });

  describe('monitoring lifecycle', () => {
    it('should start monitoring', () => {
      resourceManager.startMonitoring(1000);
      // Should not throw and should be able to stop
      resourceManager.stopMonitoring();
    });

    it('should not start monitoring twice', () => {
      resourceManager.startMonitoring(1000);
      resourceManager.startMonitoring(1000); // Should not create second interval
      resourceManager.stopMonitoring();
    });

    it('should stop monitoring', () => {
      resourceManager.startMonitoring(1000);
      resourceManager.stopMonitoring();
      // Should be able to start again
      resourceManager.startMonitoring(1000);
      resourceManager.stopMonitoring();
    });
  });

  describe('metrics collection', () => {
    it('should collect latest metrics', async () => {
      const metrics = await resourceManager.getLatestMetrics();
      
      expect(metrics).toMatchObject({
        memoryUsage: expect.any(Number),
        cpuUsage: expect.any(Number),
        diskUsage: expect.any(Number),
        browserInstances: 0,
        activeRequests: 0,
        timestamp: expect.any(Date)
      });
    });

    it('should calculate memory usage correctly', async () => {
      mockTotalmem.mockReturnValue(1000);
      mockFreemem.mockReturnValue(400);
      
      const metrics = await resourceManager.getLatestMetrics();
      expect(metrics.memoryUsage).toBe(0.6); // (1000-400)/1000 = 0.6
    });

    it('should track browser instances', async () => {
      resourceManager.incrementBrowserInstances();
      resourceManager.incrementBrowserInstances();
      
      const metrics = await resourceManager.getLatestMetrics();
      expect(metrics.browserInstances).toBe(2);
      
      resourceManager.decrementBrowserInstances();
      const metrics2 = await resourceManager.getLatestMetrics();
      expect(metrics2.browserInstances).toBe(1);
    });

    it('should track active requests', async () => {
      resourceManager.incrementActiveRequests();
      resourceManager.incrementActiveRequests();
      resourceManager.incrementActiveRequests();
      
      const metrics = await resourceManager.getLatestMetrics();
      expect(metrics.activeRequests).toBe(3);
      
      resourceManager.decrementActiveRequests();
      const metrics2 = await resourceManager.getLatestMetrics();
      expect(metrics2.activeRequests).toBe(2);
    });

    it('should not allow negative browser instances', () => {
      resourceManager.decrementBrowserInstances();
      resourceManager.decrementBrowserInstances();
      
      expect(resourceManager.getLatestMetrics()).resolves.toMatchObject({
        browserInstances: 0
      });
    });

    it('should not allow negative active requests', () => {
      resourceManager.decrementActiveRequests();
      resourceManager.decrementActiveRequests();
      
      expect(resourceManager.getLatestMetrics()).resolves.toMatchObject({
        activeRequests: 0
      });
    });
  });

  describe('resource pressure detection', () => {
    it('should detect memory pressure', async () => {
      // Set up high memory usage
      mockTotalmem.mockReturnValue(1000);
      mockFreemem.mockReturnValue(200); // 80% usage, above 70% threshold
      
      resourceManager.startMonitoring(50);
      
      // Wait for initial metrics to be collected via setImmediate
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const pressure = resourceManager.checkResourcePressure();
      expect(pressure.memory).toBe(true);
      expect(pressure.overall).toBe(true);
      
      resourceManager.stopMonitoring();
    });

    it('should not detect pressure under thresholds', async () => {
      // Set up low resource usage
      mockTotalmem.mockReturnValue(1000);
      mockFreemem.mockReturnValue(600); // 40% usage, below 70% threshold
      
      resourceManager.startMonitoring(50);
      
      // Wait for initial metrics to be collected via setImmediate
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const pressure = resourceManager.checkResourcePressure();
      expect(pressure.memory).toBe(false);
      expect(pressure.cpu).toBe(false);
      expect(pressure.disk).toBe(false);
      expect(pressure.overall).toBe(false);
      
      resourceManager.stopMonitoring();
    });
  });

  describe('resource pressure alerts', () => {
    it('should call alert callbacks on pressure', async () => {
      const alertCallback = vi.fn();
      resourceManager.onResourcePressure(alertCallback);
      
      // Set up high memory usage
      mockTotalmem.mockReturnValue(1000);
      mockFreemem.mockReturnValue(200); // 80% usage
      
      resourceManager.startMonitoring(100);
      
      // Wait for monitoring to detect pressure
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(alertCallback).toHaveBeenCalled();
      const callArgs = alertCallback.mock.calls[0][0] as ResourcePressure;
      expect(callArgs.memory).toBe(true);
      expect(callArgs.overall).toBe(true);
      
      resourceManager.stopMonitoring();
    });

    it('should handle errors in alert callbacks gracefully', async () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      resourceManager.onResourcePressure(errorCallback);
      
      // Set up high memory usage
      mockTotalmem.mockReturnValue(1000);
      mockFreemem.mockReturnValue(200);
      
      resourceManager.startMonitoring(100);
      
      // Wait for monitoring
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(errorCallback).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in resource pressure callback:',
        expect.any(Error)
      );
      
      resourceManager.stopMonitoring();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('resource limits enforcement', () => {
    it('should enforce memory limits', async () => {
      // Set up high memory usage
      mockTotalmem.mockReturnValue(1000);
      mockFreemem.mockReturnValue(200);
      
      resourceManager.startMonitoring(100);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      await resourceManager.enforceResourceLimits();
      
      expect(mockGc).toHaveBeenCalled();
      
      resourceManager.stopMonitoring();
    });

    it('should handle CPU pressure', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Test CPU pressure handling directly by mocking the pressure detection
      const manager = new DefaultResourceManager();
      
      // Mock the checkResourcePressure method to return CPU pressure
      const originalCheckPressure = manager.checkResourcePressure;
      manager.checkResourcePressure = vi.fn().mockReturnValue({
        memory: false,
        cpu: true, // Force CPU pressure
        disk: false,
        network: false,
        overall: true
      });
      
      await manager.enforceResourceLimits();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'CPU pressure detected - consider reducing concurrent operations'
      );
      
      // Restore original method
      manager.checkResourcePressure = originalCheckPressure;
      consoleWarnSpy.mockRestore();
    });
  });

  describe('metrics history', () => {
    it('should maintain metrics history', async () => {
      resourceManager.startMonitoring(50);
      
      // Wait for multiple metrics collections
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const history = resourceManager.getMetricsHistory();
      expect(history.length).toBeGreaterThan(1);
      expect(history[0]).toMatchObject({
        memoryUsage: expect.any(Number),
        timestamp: expect.any(Date)
      });
      
      resourceManager.stopMonitoring();
    });

    it('should limit history size', async () => {
      // Create manager and simulate many metrics
      resourceManager.startMonitoring(10);
      
      // Wait for more than maxHistorySize collections
      await new Promise(resolve => setTimeout(resolve, 250)); // Should collect multiple metrics
      
      const history = resourceManager.getMetricsHistory();
      expect(history.length).toBeLessThanOrEqual(20); // Updated maxHistorySize
      
      resourceManager.stopMonitoring();
    });
  });

  describe('getCurrentMetrics', () => {
    it('should throw error when no metrics available', () => {
      expect(() => resourceManager.getCurrentMetrics()).toThrow(
        'No metrics available. Start monitoring first.'
      );
    });

    it('should return latest metrics after monitoring starts', async () => {
      resourceManager.startMonitoring(100);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const metrics = resourceManager.getCurrentMetrics();
      expect(metrics).toMatchObject({
        memoryUsage: expect.any(Number),
        timestamp: expect.any(Date)
      });
      
      resourceManager.stopMonitoring();
    });
  });

  describe('cleanup', () => {
    it('should cleanup all resources', async () => {
      const alertCallback = vi.fn();
      resourceManager.onResourcePressure(alertCallback);
      resourceManager.startMonitoring(100);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      await resourceManager.cleanup();
      
      // Should not throw when trying to get metrics after cleanup
      expect(() => resourceManager.getCurrentMetrics()).toThrow();
      
      // History should be cleared
      expect(resourceManager.getMetricsHistory()).toHaveLength(0);
    });
  });
});

describe('DefaultCleanupManager', () => {
  let cleanupManager: DefaultCleanupManager;
  const mockReaddir = vi.mocked(fs.readdir);
  const mockStat = vi.mocked(fs.stat);
  const mockUnlink = vi.mocked(fs.unlink);
  const mockRmdir = vi.mocked(fs.rmdir);
  const mockTmpdir = vi.mocked(os.tmpdir);

  beforeEach(() => {
    cleanupManager = new DefaultCleanupManager();
    vi.clearAllMocks();
    
    mockTmpdir.mockReturnValue('/tmp');
  });

  describe('temp file cleanup', () => {
    it('should cleanup matching temp files', async () => {
      mockReaddir.mockResolvedValue([
        'printeer-123.tmp',
        'puppeteer_dev_chrome_profile-456',
        'other-file.txt',
        'test.temp'
      ] as any);
      
      mockStat.mockResolvedValue({ isDirectory: () => false } as any);
      mockUnlink.mockResolvedValue(undefined);

      await cleanupManager.cleanupTempFiles();

      expect(mockUnlink).toHaveBeenCalledWith('/tmp/printeer-123.tmp');
      expect(mockUnlink).toHaveBeenCalledWith('/tmp/puppeteer_dev_chrome_profile-456');
      expect(mockUnlink).toHaveBeenCalledWith('/tmp/test.temp');
      expect(mockUnlink).not.toHaveBeenCalledWith('/tmp/other-file.txt');
    });

    it('should cleanup temp directories', async () => {
      mockReaddir.mockResolvedValue(['printeer-temp-dir'] as any);
      mockStat.mockResolvedValue({ isDirectory: () => true } as any);
      mockRmdir.mockResolvedValue(undefined);

      await cleanupManager.cleanupTempFiles();

      expect(mockRmdir).toHaveBeenCalledWith('/tmp/printeer-temp-dir', { recursive: true });
    });

    it('should handle cleanup errors gracefully', async () => {
      mockReaddir.mockResolvedValue(['printeer-123.tmp'] as any);
      mockStat.mockRejectedValue(new Error('File not found'));

      // Should not throw
      await expect(cleanupManager.cleanupTempFiles()).resolves.toBeUndefined();
    });

    it('should handle readdir errors gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockReaddir.mockRejectedValue(new Error('Permission denied'));

      await cleanupManager.cleanupTempFiles();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Error during temp file cleanup:',
        expect.any(Error)
      );
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('browser resource cleanup', () => {
    it('should call garbage collection', async () => {
      await cleanupManager.cleanupBrowserResources();
      expect(mockGc).toHaveBeenCalled();
    });

    it('should cleanup browser temp directories', async () => {
      mockReaddir.mockResolvedValue([
        'puppeteer_dev_chrome_profile-123',
        'chrome_temp_456',
        'chromium_data_789',
        'other-dir'
      ] as any);
      
      mockStat.mockResolvedValue({ isDirectory: () => true } as any);
      mockRmdir.mockResolvedValue(undefined);

      await cleanupManager.cleanupBrowserResources();

      expect(mockRmdir).toHaveBeenCalledWith('/tmp/puppeteer_dev_chrome_profile-123', { recursive: true });
      expect(mockRmdir).toHaveBeenCalledWith('/tmp/chrome_temp_456', { recursive: true });
      expect(mockRmdir).toHaveBeenCalledWith('/tmp/chromium_data_789', { recursive: true });
      expect(mockRmdir).not.toHaveBeenCalledWith('/tmp/other-dir', { recursive: true });
    });
  });

  describe('memory cleanup', () => {
    it('should call garbage collection', async () => {
      await cleanupManager.cleanupMemory();
      expect(mockGc).toHaveBeenCalled();
    });

    it('should complete even without gc available', async () => {
      const originalGc = global.gc;
      (global as any).gc = undefined;

      await expect(cleanupManager.cleanupMemory()).resolves.toBeUndefined();

      (global as any).gc = originalGc;
    });
  });

  describe('scheduled cleanup', () => {
    it('should schedule cleanup', async () => {
      cleanupManager.scheduleCleanup(100);
      
      // Wait for at least one cleanup cycle
      await new Promise(resolve => setTimeout(resolve, 150));
      
      cleanupManager.stopScheduledCleanup();
      
      // Should have called gc at least once
      expect(mockGc).toHaveBeenCalled();
    });

    it('should not schedule twice', () => {
      cleanupManager.scheduleCleanup(100);
      cleanupManager.scheduleCleanup(100); // Should not create second interval
      cleanupManager.stopScheduledCleanup();
    });

    it('should stop scheduled cleanup', () => {
      cleanupManager.scheduleCleanup(100);
      cleanupManager.stopScheduledCleanup();
      
      // Should be able to schedule again
      cleanupManager.scheduleCleanup(100);
      cleanupManager.stopScheduledCleanup();
    });

    it('should handle errors during scheduled cleanup', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock readdir to return a non-iterable value to cause the "files is not iterable" error
      mockReaddir.mockResolvedValue(null as any);
      
      cleanupManager.scheduleCleanup(30); // Shorter interval for faster test
      
      // Wait for cleanup to run and error - need to wait for the interval to trigger
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // The error is caught by cleanupTempFiles and logged as a warning
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Error during temp file cleanup:',
        expect.any(Error)
      );
      
      cleanupManager.stopScheduledCleanup();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('file pattern matching', () => {
    it('should match wildcard patterns correctly', async () => {
      mockReaddir.mockResolvedValue([
        'printeer-abc123.tmp',
        'printeer-xyz789.log',
        'puppeteer_dev_chrome_profile-456',
        'random.tmp',
        'test.temp',
        'normal-file.txt'
      ] as any);
      
      mockStat.mockResolvedValue({ isDirectory: () => false } as any);
      mockUnlink.mockResolvedValue(undefined);

      await cleanupManager.cleanupTempFiles();

      // Should match wildcard patterns
      expect(mockUnlink).toHaveBeenCalledWith('/tmp/printeer-abc123.tmp');
      expect(mockUnlink).toHaveBeenCalledWith('/tmp/printeer-xyz789.log');
      expect(mockUnlink).toHaveBeenCalledWith('/tmp/puppeteer_dev_chrome_profile-456');
      expect(mockUnlink).toHaveBeenCalledWith('/tmp/random.tmp');
      expect(mockUnlink).toHaveBeenCalledWith('/tmp/test.temp');
      
      // Should not match non-matching files
      expect(mockUnlink).not.toHaveBeenCalledWith('/tmp/normal-file.txt');
    });
  });
});