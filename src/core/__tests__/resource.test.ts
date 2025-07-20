import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  DefaultResourceManager,
  DefaultCleanupManager,
  DefaultResourceLimitEnforcer,
  DefaultDegradationStrategy,
  DefaultResourceOptimizer,
  DefaultBrowserPoolOptimizer,
  DefaultDiskSpaceManager
} from '../resource';
import {
  ResourceMetrics,
  ResourcePressure,
  ResourceLimits,
  OptimizationRecommendation
} from '../../types/resource';

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
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

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
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

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
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
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
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

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

describe('DefaultResourceLimitEnforcer', () => {
  let limitEnforcer: DefaultResourceLimitEnforcer;
  const mockTotalmem = vi.mocked(os.totalmem);

  beforeEach(() => {
    limitEnforcer = new DefaultResourceLimitEnforcer();
    vi.clearAllMocks();

    // Setup default mock values - 1GB total memory for easier calculations
    mockTotalmem.mockReturnValue(1024 * 1024 * 1024); // 1GB
  });

  describe('constructor and configuration', () => {
    it('should initialize with default limits', () => {
      const enforcer = new DefaultResourceLimitEnforcer();
      const limits = enforcer.getLimits();

      expect(limits).toMatchObject({
        maxMemoryMB: 512,
        maxCpuPercent: 50,
        maxDiskMB: 1024,
        maxConcurrentRequests: 5,
        maxBrowserInstances: 2
      });
    });

    it('should accept custom limits', () => {
      const customLimits = {
        maxMemoryMB: 256,
        maxCpuPercent: 30,
        maxConcurrentRequests: 3
      };

      const enforcer = new DefaultResourceLimitEnforcer(customLimits);
      const limits = enforcer.getLimits();

      expect(limits.maxMemoryMB).toBe(256);
      expect(limits.maxCpuPercent).toBe(30);
      expect(limits.maxConcurrentRequests).toBe(3);
      expect(limits.maxBrowserInstances).toBe(2); // Should keep default
    });

    it('should allow updating limits', () => {
      const newLimits = { maxMemoryMB: 128 };
      limitEnforcer.setLimits(newLimits);

      const limits = limitEnforcer.getLimits();
      expect(limits.maxMemoryMB).toBe(128);
    });
  });

  describe('limits violation detection', () => {
    it('should detect memory limit violation', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.6, // 60% of 1GB = 614MB, exceeds default 512MB limit
        cpuUsage: 0.3,
        diskUsage: 0.1,
        browserInstances: 1,
        activeRequests: 2,
        timestamp: new Date()
      };

      const isViolation = limitEnforcer.checkLimitsViolation(metrics);
      expect(isViolation).toBe(true);
    });

    it('should detect CPU limit violation', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.3, // 307MB, under 512MB limit
        cpuUsage: 0.6, // 60% CPU, exceeds default 50% limit
        diskUsage: 0.1,
        browserInstances: 1,
        activeRequests: 2,
        timestamp: new Date()
      };

      const isViolation = limitEnforcer.checkLimitsViolation(metrics);
      expect(isViolation).toBe(true);
    });

    it('should detect concurrent requests limit violation', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.3,
        cpuUsage: 0.3,
        diskUsage: 0.1,
        browserInstances: 1,
        activeRequests: 6, // Exceeds default limit of 5
        timestamp: new Date()
      };

      const isViolation = limitEnforcer.checkLimitsViolation(metrics);
      expect(isViolation).toBe(true);
    });

    it('should detect browser instances limit violation', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.3,
        cpuUsage: 0.3,
        diskUsage: 0.1,
        browserInstances: 3, // Exceeds default limit of 2
        activeRequests: 2,
        timestamp: new Date()
      };

      const isViolation = limitEnforcer.checkLimitsViolation(metrics);
      expect(isViolation).toBe(true);
    });

    it('should not detect violation when under limits', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.3, // 307MB, under 512MB limit
        cpuUsage: 0.4, // 40% CPU, under 50% limit
        diskUsage: 0.1,
        browserInstances: 1, // Under limit of 2
        activeRequests: 3, // Under limit of 5
        timestamp: new Date()
      };

      const isViolation = limitEnforcer.checkLimitsViolation(metrics);
      expect(isViolation).toBe(false);
    });
  });

  describe('limits enforcement', () => {
    it('should enforce memory limits', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });

      const metrics: ResourceMetrics = {
        memoryUsage: 0.6, // Exceeds memory limit
        cpuUsage: 0.3,
        diskUsage: 0.1,
        browserInstances: 1,
        activeRequests: 2,
        timestamp: new Date()
      };

      await limitEnforcer.enableGracefulDegradation();
      await limitEnforcer.enforceLimits(metrics);

      expect(mockGc).toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Reducing browser pool size due to resource limits'
      );

      consoleInfoSpy.mockRestore();
    });

    it('should enforce CPU limits', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });

      const metrics: ResourceMetrics = {
        memoryUsage: 0.3,
        cpuUsage: 0.6, // Exceeds CPU limit
        diskUsage: 0.1,
        browserInstances: 1,
        activeRequests: 2,
        timestamp: new Date()
      };

      await limitEnforcer.enableGracefulDegradation();
      await limitEnforcer.enforceLimits(metrics);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Enabling request throttling due to resource limits'
      );

      consoleInfoSpy.mockRestore();
    });

    it('should enforce concurrency limits', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });

      const metrics: ResourceMetrics = {
        memoryUsage: 0.3,
        cpuUsage: 0.3,
        diskUsage: 0.1,
        browserInstances: 1,
        activeRequests: 6, // Exceeds concurrency limit
        timestamp: new Date()
      };

      await limitEnforcer.enableGracefulDegradation();
      await limitEnforcer.enforceLimits(metrics);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Enabling request throttling due to resource limits'
      );

      consoleInfoSpy.mockRestore();
    });

    it('should enforce browser instance limits', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });

      const metrics: ResourceMetrics = {
        memoryUsage: 0.3,
        cpuUsage: 0.3,
        diskUsage: 0.1,
        browserInstances: 3, // Exceeds browser limit
        activeRequests: 2,
        timestamp: new Date()
      };

      await limitEnforcer.enableGracefulDegradation();
      await limitEnforcer.enforceLimits(metrics);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Reducing browser pool size due to resource limits'
      );

      consoleInfoSpy.mockRestore();
    });

    it('should not enforce limits when degradation is disabled', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });

      const metrics: ResourceMetrics = {
        memoryUsage: 0.6, // Exceeds memory limit
        cpuUsage: 0.6, // Exceeds CPU limit
        diskUsage: 0.1,
        browserInstances: 3, // Exceeds browser limit
        activeRequests: 6, // Exceeds concurrency limit
        timestamp: new Date()
      };

      // Don't enable degradation
      await limitEnforcer.enforceLimits(metrics);

      // Should still call gc for memory but not other degradation actions
      expect(mockGc).toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalledWith(
        'Reducing browser pool size due to resource limits'
      );

      consoleInfoSpy.mockRestore();
    });
  });

  describe('graceful degradation management', () => {
    it('should enable graceful degradation', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });

      await limitEnforcer.enableGracefulDegradation();

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Enabling request throttling due to resource limits'
      );

      consoleInfoSpy.mockRestore();
    });

    it('should not enable degradation twice', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });

      await limitEnforcer.enableGracefulDegradation();
      await limitEnforcer.enableGracefulDegradation(); // Second call

      // Should only be called once
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);

      consoleInfoSpy.mockRestore();
    });

    it('should disable graceful degradation', async () => {
      await limitEnforcer.enableGracefulDegradation();
      await limitEnforcer.disableGracefulDegradation();

      // Should complete without errors
      expect(true).toBe(true);
    });
  });
});

describe('DefaultDegradationStrategy', () => {
  let degradationStrategy: DefaultDegradationStrategy;

  beforeEach(() => {
    degradationStrategy = new DefaultDegradationStrategy();
    vi.clearAllMocks();
  });

  describe('degradation actions', () => {
    it('should reduce browser pool size', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });

      await degradationStrategy.reduceBrowserPoolSize();

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Reducing browser pool size due to resource limits'
      );

      consoleInfoSpy.mockRestore();
    });

    it('should reduce rendering quality', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });

      await degradationStrategy.reduceRenderingQuality();

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Reducing rendering quality due to resource limits'
      );
      expect(degradationStrategy.isRenderingQualityReduced()).toBe(true);

      consoleInfoSpy.mockRestore();
    });

    it('should not reduce rendering quality twice', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });

      await degradationStrategy.reduceRenderingQuality();
      await degradationStrategy.reduceRenderingQuality(); // Second call

      // Should only be called once
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);

      consoleInfoSpy.mockRestore();
    });

    it('should enable request throttling', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });

      await degradationStrategy.enableRequestThrottling();

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Enabling request throttling due to resource limits'
      );
      expect(degradationStrategy.isRequestThrottlingEnabled()).toBe(true);

      consoleInfoSpy.mockRestore();
    });

    it('should not enable request throttling twice', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });

      await degradationStrategy.enableRequestThrottling();
      await degradationStrategy.enableRequestThrottling(); // Second call

      // Should only be called once
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);

      consoleInfoSpy.mockRestore();
    });

    it('should disable non-essential features', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });

      await degradationStrategy.disableNonEssentialFeatures();

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Disabling non-essential features due to resource limits'
      );
      expect(degradationStrategy.areNonEssentialFeaturesDisabled()).toBe(true);

      consoleInfoSpy.mockRestore();
    });

    it('should not disable non-essential features twice', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });

      await degradationStrategy.disableNonEssentialFeatures();
      await degradationStrategy.disableNonEssentialFeatures(); // Second call

      // Should only be called once
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);

      consoleInfoSpy.mockRestore();
    });
  });

  describe('degradation state management', () => {
    it('should track degradation state correctly', async () => {
      expect(degradationStrategy.isRequestThrottlingEnabled()).toBe(false);
      expect(degradationStrategy.isRenderingQualityReduced()).toBe(false);
      expect(degradationStrategy.areNonEssentialFeaturesDisabled()).toBe(false);

      await degradationStrategy.enableRequestThrottling();
      await degradationStrategy.reduceRenderingQuality();
      await degradationStrategy.disableNonEssentialFeatures();

      expect(degradationStrategy.isRequestThrottlingEnabled()).toBe(true);
      expect(degradationStrategy.isRenderingQualityReduced()).toBe(true);
      expect(degradationStrategy.areNonEssentialFeaturesDisabled()).toBe(true);
    });

    it('should reset degradation state', async () => {
      // Enable all degradation features
      await degradationStrategy.enableRequestThrottling();
      await degradationStrategy.reduceRenderingQuality();
      await degradationStrategy.disableNonEssentialFeatures();

      // Reset
      await degradationStrategy.resetDegradation();

      expect(degradationStrategy.isRequestThrottlingEnabled()).toBe(false);
      expect(degradationStrategy.isRenderingQualityReduced()).toBe(false);
      expect(degradationStrategy.areNonEssentialFeaturesDisabled()).toBe(false);
    });
  });
});

describe('ResourceManager with Limits Integration', () => {
  let resourceManager: DefaultResourceManager;
  const mockTotalmem = vi.mocked(os.totalmem);
  const mockFreemem = vi.mocked(os.freemem);

  beforeEach(() => {
    const customLimits = {
      maxMemoryMB: 256,
      maxCpuPercent: 40,
      maxConcurrentRequests: 3,
      maxBrowserInstances: 1
    };

    resourceManager = new DefaultResourceManager(undefined, customLimits);
    vi.clearAllMocks();

    // Setup mock values - 1GB total memory
    mockTotalmem.mockReturnValue(1024 * 1024 * 1024); // 1GB
    mockFreemem.mockReturnValue(512 * 1024 * 1024); // 512MB free
  });

  afterEach(() => {
    resourceManager.cleanup();
  });

  describe('integrated limits enforcement', () => {
    it('should set and get resource limits', () => {
      const newLimits = { maxMemoryMB: 128 };
      resourceManager.setResourceLimits(newLimits);

      const limits = resourceManager.getResourceLimits();
      expect(limits.maxMemoryMB).toBe(128);
    });

    it('should enforce limits with degradation', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });

      // Set up high resource usage that exceeds limits
      mockFreemem.mockReturnValue(200 * 1024 * 1024); // 200MB free = 800MB used = 78% usage
      resourceManager.incrementActiveRequests();
      resourceManager.incrementActiveRequests();
      resourceManager.incrementActiveRequests();
      resourceManager.incrementActiveRequests(); // 4 requests, exceeds limit of 3

      // Enable degradation first
      const limits = resourceManager.getResourceLimits();
      const limitEnforcer = (resourceManager as any).limitEnforcer;
      await limitEnforcer.enableGracefulDegradation();

      resourceManager.startMonitoring(50);
      await new Promise(resolve => setTimeout(resolve, 100));

      await resourceManager.enforceResourceLimitsWithDegradation();

      // Should trigger degradation actions
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('due to resource limits')
      );

      resourceManager.stopMonitoring();
      consoleInfoSpy.mockRestore();
    });

    it('should handle both pressure and limits enforcement', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });

      // Set up high memory usage that triggers both pressure and limits
      mockFreemem.mockReturnValue(100 * 1024 * 1024); // 100MB free = 900MB used = 88% usage

      // Enable degradation first
      const limitEnforcer = (resourceManager as any).limitEnforcer;
      await limitEnforcer.enableGracefulDegradation();

      resourceManager.startMonitoring(50);
      await new Promise(resolve => setTimeout(resolve, 100));

      await resourceManager.enforceResourceLimitsWithDegradation();

      // Should trigger both pressure handling and limits enforcement
      expect(mockGc).toHaveBeenCalled(); // From pressure handling
      expect(consoleInfoSpy).toHaveBeenCalled(); // From limits enforcement

      resourceManager.stopMonitoring();
      consoleWarnSpy.mockRestore();
      consoleInfoSpy.mockRestore();
    });
  });
});

describe('DefaultResourceOptimizer', () => {
  let optimizer: DefaultResourceOptimizer;
  const mockTmpdir = vi.mocked(os.tmpdir);
  const mockReaddir = vi.mocked(fs.readdir);

  beforeEach(() => {
    optimizer = new DefaultResourceOptimizer();
    vi.clearAllMocks();
    mockTmpdir.mockReturnValue('/tmp');
  });

  describe('browser pool optimization', () => {
    it('should optimize browser pool size', async () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.5,
        cpuUsage: 0.4,
        diskUsage: 0.3,
        browserInstances: 2,
        activeRequests: 4,
        timestamp: new Date()
      };

      const optimalSize = await optimizer.optimizeBrowserPoolSize(metrics);
      expect(optimalSize).toBeGreaterThan(0);
      expect(optimalSize).toBeLessThanOrEqual(4); // Max pool size
    });
  });

  describe('temporary file cleanup', () => {
    it('should cleanup temporary files', async () => {
      mockReaddir.mockResolvedValue(['printeer-123.tmp', 'other-file.txt'] as any);

      await optimizer.cleanupTemporaryFiles();

      expect(mockReaddir).toHaveBeenCalled();
    });
  });

  describe('network optimization', () => {
    it('should provide network optimization recommendations', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });

      await optimizer.optimizeNetworkUsage();

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Network optimization: Consider enabling compression and reducing concurrent requests'
      );

      consoleInfoSpy.mockRestore();
    });
  });

  describe('optimization recommendations', () => {
    it('should provide memory optimization recommendations', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.85, // High memory usage
        cpuUsage: 0.4,
        diskUsage: 0.3,
        browserInstances: 2,
        activeRequests: 3,
        timestamp: new Date()
      };

      const recommendations = optimizer.getOptimizationRecommendations(metrics);

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'memory',
          priority: 'high',
          action: expect.stringContaining('browser pool size')
        })
      );
    });

    it('should provide browser pool optimization recommendations', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.4,
        cpuUsage: 0.3,
        diskUsage: 0.2,
        browserInstances: 4, // High browser count
        activeRequests: 1, // Low request count
        timestamp: new Date()
      };

      const recommendations = optimizer.getOptimizationRecommendations(metrics);

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'browser_pool',
          priority: 'medium',
          action: expect.stringContaining('pool size')
        })
      );
    });

    it('should provide disk optimization recommendations', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.4,
        cpuUsage: 0.3,
        diskUsage: 0.75, // High disk usage
        browserInstances: 2,
        activeRequests: 3,
        timestamp: new Date()
      };

      const recommendations = optimizer.getOptimizationRecommendations(metrics);

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'disk',
          priority: 'medium',
          action: expect.stringContaining('temporary files')
        })
      );
    });

    it('should provide network optimization recommendations', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.4,
        cpuUsage: 0.3,
        diskUsage: 0.3,
        browserInstances: 2,
        activeRequests: 6, // High request count
        timestamp: new Date()
      };

      const recommendations = optimizer.getOptimizationRecommendations(metrics);

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'network',
          priority: 'low',
          action: expect.stringContaining('throttling')
        })
      );
    });

    it('should return empty recommendations for optimal metrics', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.4, // Low memory usage
        cpuUsage: 0.3, // Low CPU usage
        diskUsage: 0.3, // Low disk usage
        browserInstances: 2, // Reasonable browser count
        activeRequests: 3, // Reasonable request count
        timestamp: new Date()
      };

      const recommendations = optimizer.getOptimizationRecommendations(metrics);
      expect(recommendations).toHaveLength(0);
    });
  });
});

describe('DefaultBrowserPoolOptimizer', () => {
  let poolOptimizer: DefaultBrowserPoolOptimizer;

  beforeEach(() => {
    poolOptimizer = new DefaultBrowserPoolOptimizer();
  });

  describe('pool size calculation', () => {
    it('should calculate optimal pool size based on metrics', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.5,
        cpuUsage: 0.4,
        diskUsage: 0.3,
        browserInstances: 2,
        activeRequests: 4,
        timestamp: new Date()
      };

      const optimalSize = poolOptimizer.calculateOptimalPoolSize(metrics);
      expect(optimalSize).toBeGreaterThanOrEqual(1);
      expect(optimalSize).toBeLessThanOrEqual(4);
    });

    it('should limit pool size to minimum', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.2,
        cpuUsage: 0.1,
        diskUsage: 0.1,
        browserInstances: 0,
        activeRequests: 0,
        timestamp: new Date()
      };

      const optimalSize = poolOptimizer.calculateOptimalPoolSize(metrics);
      expect(optimalSize).toBe(1); // Minimum pool size
    });

    it('should limit pool size to maximum', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.3, // Low memory usage
        cpuUsage: 0.2,
        diskUsage: 0.2,
        browserInstances: 10,
        activeRequests: 20, // Very high request count
        timestamp: new Date()
      };

      const optimalSize = poolOptimizer.calculateOptimalPoolSize(metrics);
      expect(optimalSize).toBe(4); // Maximum pool size
    });

    it('should reduce pool size for high memory usage', () => {
      const lowMemoryMetrics: ResourceMetrics = {
        memoryUsage: 0.3,
        cpuUsage: 0.4,
        diskUsage: 0.3,
        browserInstances: 2,
        activeRequests: 4,
        timestamp: new Date()
      };

      const highMemoryMetrics: ResourceMetrics = {
        ...lowMemoryMetrics,
        memoryUsage: 0.85 // High memory usage
      };

      const lowMemorySize = poolOptimizer.calculateOptimalPoolSize(lowMemoryMetrics);
      const highMemorySize = poolOptimizer.calculateOptimalPoolSize(highMemoryMetrics);

      expect(highMemorySize).toBeLessThan(lowMemorySize);
    });
  });

  describe('pool expansion decisions', () => {
    it('should recommend expansion for high load and low memory usage', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.4, // Low memory usage
        cpuUsage: 0.3,
        diskUsage: 0.2,
        browserInstances: 2,
        activeRequests: 5, // High request load relative to browsers
        timestamp: new Date()
      };

      const shouldExpand = poolOptimizer.shouldExpandPool(metrics);
      expect(shouldExpand).toBe(true);
    });

    it('should not recommend expansion for high memory usage', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.8, // High memory usage
        cpuUsage: 0.3,
        diskUsage: 0.2,
        browserInstances: 2,
        activeRequests: 5,
        timestamp: new Date()
      };

      const shouldExpand = poolOptimizer.shouldExpandPool(metrics);
      expect(shouldExpand).toBe(false);
    });

    it('should not recommend expansion when at max pool size', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.4,
        cpuUsage: 0.3,
        diskUsage: 0.2,
        browserInstances: 4, // At max pool size
        activeRequests: 8,
        timestamp: new Date()
      };

      const shouldExpand = poolOptimizer.shouldExpandPool(metrics);
      expect(shouldExpand).toBe(false);
    });
  });

  describe('pool shrinking decisions', () => {
    it('should recommend shrinking for high memory usage', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.85, // High memory usage
        cpuUsage: 0.3,
        diskUsage: 0.2,
        browserInstances: 3,
        activeRequests: 2,
        timestamp: new Date()
      };

      const shouldShrink = poolOptimizer.shouldShrinkPool(metrics);
      expect(shouldShrink).toBe(true);
    });

    it('should recommend shrinking for low utilization', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.4,
        cpuUsage: 0.3,
        diskUsage: 0.2,
        browserInstances: 4,
        activeRequests: 1, // Low utilization
        timestamp: new Date()
      };

      const shouldShrink = poolOptimizer.shouldShrinkPool(metrics);
      expect(shouldShrink).toBe(true);
    });

    it('should not recommend shrinking when at minimum pool size', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.9, // High memory usage
        cpuUsage: 0.3,
        diskUsage: 0.2,
        browserInstances: 1, // At minimum pool size
        activeRequests: 0,
        timestamp: new Date()
      };

      const shouldShrink = poolOptimizer.shouldShrinkPool(metrics);
      expect(shouldShrink).toBe(false);
    });

    it('should not recommend shrinking for optimal conditions', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 0.5, // Moderate memory usage
        cpuUsage: 0.4,
        diskUsage: 0.3,
        browserInstances: 2,
        activeRequests: 3, // Good utilization
        timestamp: new Date()
      };

      const shouldShrink = poolOptimizer.shouldShrinkPool(metrics);
      expect(shouldShrink).toBe(false);
    });
  });
});

describe('DefaultDiskSpaceManager', () => {
  let diskManager: DefaultDiskSpaceManager;
  const mockTmpdir = vi.mocked(os.tmpdir);
  const mockReaddir = vi.mocked(fs.readdir);
  const mockStat = vi.mocked(fs.stat);
  const mockUnlink = vi.mocked(fs.unlink);
  const mockRmdir = vi.mocked(fs.rmdir);

  beforeEach(() => {
    diskManager = new DefaultDiskSpaceManager();
    vi.clearAllMocks();
    mockTmpdir.mockReturnValue('/tmp');
  });

  describe('disk usage calculation', () => {
    it('should get total disk usage', async () => {
      mockStat.mockResolvedValue({ size: 1000 } as any);

      const usage = await diskManager.getTotalDiskUsage();
      expect(usage).toBe(0.1); // Conservative placeholder
    });

    it('should handle disk usage calculation errors', async () => {
      mockStat.mockRejectedValue(new Error('Permission denied'));

      const usage = await diskManager.getTotalDiskUsage();
      expect(usage).toBe(0.1); // Default fallback
    });
  });

  describe('old file cleanup', () => {
    it('should cleanup old temp files', async () => {
      const oldTime = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago

      mockReaddir.mockResolvedValue(['printeer-old.tmp', 'other-file.txt'] as any);
      mockStat.mockResolvedValue({
        mtime: new Date(oldTime),
        isDirectory: () => false
      } as any);
      mockUnlink.mockResolvedValue(undefined);

      const cleanedCount = await diskManager.cleanupOldTempFiles(24 * 60 * 60 * 1000); // 24 hours

      expect(cleanedCount).toBe(1);
      expect(mockUnlink).toHaveBeenCalledWith('/tmp/printeer-old.tmp');
    });

    it('should not cleanup recent files', async () => {
      const recentTime = Date.now() - (1 * 60 * 60 * 1000); // 1 hour ago

      mockReaddir.mockResolvedValue(['printeer-recent.tmp'] as any);
      mockStat.mockResolvedValue({
        mtime: new Date(recentTime),
        isDirectory: () => false
      } as any);

      const cleanedCount = await diskManager.cleanupOldTempFiles(24 * 60 * 60 * 1000); // 24 hours

      expect(cleanedCount).toBe(0);
      expect(mockUnlink).not.toHaveBeenCalled();
    });

    it('should cleanup old directories', async () => {
      const oldTime = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago

      mockReaddir.mockResolvedValue(['puppeteer_dev_chrome_profile-old'] as any);
      mockStat.mockResolvedValue({
        mtime: new Date(oldTime),
        isDirectory: () => true
      } as any);
      mockRmdir.mockResolvedValue(undefined);

      const cleanedCount = await diskManager.cleanupOldTempFiles(24 * 60 * 60 * 1000);

      expect(cleanedCount).toBe(1);
      expect(mockRmdir).toHaveBeenCalledWith('/tmp/puppeteer_dev_chrome_profile-old', { recursive: true });
    });

    it('should handle cleanup errors gracefully', async () => {
      mockReaddir.mockResolvedValue(['printeer-error.tmp'] as any);
      mockStat.mockRejectedValue(new Error('File not found'));

      const cleanedCount = await diskManager.cleanupOldTempFiles(24 * 60 * 60 * 1000);

      expect(cleanedCount).toBe(0);
    });
  });

  describe('large file cleanup', () => {
    it('should cleanup large temp files', async () => {
      const largeSize = 10 * 1024 * 1024; // 10MB

      mockReaddir.mockResolvedValue(['printeer-large.tmp', 'other-file.txt'] as any);
      mockStat.mockResolvedValue({
        size: largeSize,
        isDirectory: () => false
      } as any);
      mockUnlink.mockResolvedValue(undefined);

      const cleanedCount = await diskManager.cleanupLargeTempFiles(5); // 5MB limit

      expect(cleanedCount).toBe(1);
      expect(mockUnlink).toHaveBeenCalledWith('/tmp/printeer-large.tmp');
    });

    it('should not cleanup small files', async () => {
      const smallSize = 1 * 1024 * 1024; // 1MB

      mockReaddir.mockResolvedValue(['printeer-small.tmp'] as any);
      mockStat.mockResolvedValue({
        size: smallSize,
        isDirectory: () => false
      } as any);

      const cleanedCount = await diskManager.cleanupLargeTempFiles(5); // 5MB limit

      expect(cleanedCount).toBe(0);
      expect(mockUnlink).not.toHaveBeenCalled();
    });

    it('should cleanup large directories', async () => {
      const largeSize = 20 * 1024 * 1024; // 20MB

      mockReaddir.mockResolvedValue(['chrome_large_profile'] as any);
      mockStat.mockResolvedValue({
        size: largeSize,
        isDirectory: () => true
      } as any);
      mockRmdir.mockResolvedValue(undefined);

      const cleanedCount = await diskManager.cleanupLargeTempFiles(10); // 10MB limit

      expect(cleanedCount).toBe(1);
      expect(mockRmdir).toHaveBeenCalledWith('/tmp/chrome_large_profile', { recursive: true });
    });
  });

  describe('cleanup recommendations', () => {
    it('should recommend cleanup for many temp files', async () => {
      const manyFiles = Array.from({ length: 60 }, (_, i) => `printeer-${i}.tmp`);
      mockReaddir.mockResolvedValue(manyFiles as any);

      const recommendations = await diskManager.getRecommendedCleanupActions();

      expect(recommendations).toContain('Clean up temporary files (50+ files found)');
    });

    it('should recommend browser cleanup for browser files', async () => {
      mockReaddir.mockResolvedValue([
        'puppeteer_dev_chrome_profile-123',
        'chrome_temp_456'
      ] as any);

      const recommendations = await diskManager.getRecommendedCleanupActions();

      expect(recommendations).toContain('Clean up browser temporary directories');
    });

    it('should recommend cache cleanup for temp files', async () => {
      mockReaddir.mockResolvedValue([
        'cache.tmp',
        'temp.temp'
      ] as any);

      const recommendations = await diskManager.getRecommendedCleanupActions();

      expect(recommendations).toContain('Clean up temporary cache files');
    });

    it('should return no recommendations for clean directory', async () => {
      mockReaddir.mockResolvedValue(['normal-file.txt'] as unknown);

      const recommendations = await diskManager.getRecommendedCleanupActions();

      expect(recommendations).toHaveLength(0);
    });

    it('should handle readdir errors gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
      mockReaddir.mockRejectedValue(new Error('Permission denied'));

      const recommendations = await diskManager.getRecommendedCleanupActions();

      expect(recommendations).toHaveLength(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Error getting cleanup recommendations:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });
});

describe('ResourceManager with Optimization Integration', () => {
  let resourceManager: DefaultResourceManager;
  const mockTotalmem = vi.mocked(os.totalmem);
  const mockFreemem = vi.mocked(os.freemem);

  beforeEach(() => {
    resourceManager = new DefaultResourceManager();
    vi.clearAllMocks();

    // Setup mock values
    mockTotalmem.mockReturnValue(1024 * 1024 * 1024); // 1GB
    mockFreemem.mockReturnValue(512 * 1024 * 1024); // 512MB free
  });

  afterEach(() => {
    resourceManager.cleanup();
  });

  describe('resource optimization', () => {
    it('should optimize resources', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });

      resourceManager.startMonitoring(50);
      await new Promise(resolve => setTimeout(resolve, 100));

      await resourceManager.optimizeResources();

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Optimal browser pool size:')
      );
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Network optimization: Consider enabling compression and reducing concurrent requests'
      );

      resourceManager.stopMonitoring();
      consoleInfoSpy.mockRestore();
    });

    it('should get optimization recommendations', async () => {
      resourceManager.startMonitoring(50);
      await new Promise(resolve => setTimeout(resolve, 100));

      const recommendations = resourceManager.getOptimizationRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);

      resourceManager.stopMonitoring();
    });

    it('should get optimal browser pool size', async () => {
      resourceManager.startMonitoring(50);
      await new Promise(resolve => setTimeout(resolve, 100));

      const optimalSize = await resourceManager.getOptimalBrowserPoolSize();

      expect(optimalSize).toBeGreaterThanOrEqual(1);
      expect(optimalSize).toBeLessThanOrEqual(4);

      resourceManager.stopMonitoring();
    });

    it('should provide recommendations for high resource usage', async () => {
      // Set up high memory usage
      mockFreemem.mockReturnValue(100 * 1024 * 1024); // 100MB free = 900MB used = 88% usage
      resourceManager.incrementBrowserInstances();
      resourceManager.incrementBrowserInstances();
      resourceManager.incrementBrowserInstances();
      resourceManager.incrementBrowserInstances(); // 4 browser instances
      resourceManager.incrementActiveRequests(); // 1 active request (low utilization)

      resourceManager.startMonitoring(50);
      await new Promise(resolve => setTimeout(resolve, 100));

      const recommendations = resourceManager.getOptimizationRecommendations();

      // Should have recommendations for high memory usage and low browser utilization
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.type === 'memory')).toBe(true);
      expect(recommendations.some(r => r.type === 'browser_pool')).toBe(true);

      resourceManager.stopMonitoring();
    });
  });
});