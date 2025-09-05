import { describe, it, expect } from 'vitest';
import type { 
  BrowserInstance, 
  BrowserPoolState, 
  PoolStatus,
  BrowserPoolMetrics
} from '../../src/printing/types/browser';

describe('Browser Types', () => {
  describe('BrowserInstance', () => {
    it('should have correct structure for browser instance', () => {
      const instance: BrowserInstance = {
        id: 'browser-123',
        browser: {} as any, // Mock browser object
        createdAt: new Date(),
        lastUsed: new Date(),
        isHealthy: true,
        processId: 12345
      };

      expect(instance.id).toBe('browser-123');
      expect(instance.isHealthy).toBe(true);
      expect(instance.processId).toBe(12345);
      expect(instance.createdAt).toBeInstanceOf(Date);
      expect(instance.lastUsed).toBeInstanceOf(Date);
    });
  });

  describe('BrowserPoolMetrics', () => {
    it('should have correct structure for pool metrics', () => {
      const metrics: BrowserPoolMetrics = {
        created: 10,
        destroyed: 2,
        reused: 50,
        errors: 1
      };

      expect(metrics.created).toBe(10);
      expect(metrics.destroyed).toBe(2);
      expect(metrics.reused).toBe(50);
      expect(metrics.errors).toBe(1);
    });
  });

  describe('BrowserPoolState', () => {
    it('should have correct structure for pool state', () => {
      const metrics: BrowserPoolMetrics = {
        created: 5,
        destroyed: 1,
        reused: 20,
        errors: 0
      };

      const poolState: BrowserPoolState = {
        available: [],
        busy: new Map(),
        total: 4,
        maxSize: 10,
        minSize: 2,
        lastCleanup: new Date(),
        metrics
      };

      expect(poolState.total).toBe(4);
      expect(poolState.maxSize).toBe(10);
      expect(poolState.minSize).toBe(2);
      expect(poolState.available).toEqual([]);
      expect(poolState.busy).toBeInstanceOf(Map);
      expect(poolState.metrics.created).toBe(5);
    });
  });

  describe('PoolStatus', () => {
    it('should have correct structure for pool status', () => {
      const metrics: BrowserPoolMetrics = {
        created: 8,
        destroyed: 2,
        reused: 30,
        errors: 1
      };

      const status: PoolStatus = {
        totalBrowsers: 6,
        availableBrowsers: 4,
        busyBrowsers: 2,
        healthyBrowsers: 6,
        unhealthyBrowsers: 0,
        uptime: 3600000,
        metrics
      };

      expect(status.totalBrowsers).toBe(6);
      expect(status.availableBrowsers).toBe(4);
      expect(status.busyBrowsers).toBe(2);
      expect(status.healthyBrowsers).toBe(6);
      expect(status.unhealthyBrowsers).toBe(0);
      expect(status.uptime).toBe(3600000);
    });
  });
});