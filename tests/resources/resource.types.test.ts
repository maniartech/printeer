import { describe, it, expect } from 'vitest';
import type { 
  ResourceMetrics, 
  ResourcePressure, 
  ResourceThresholds
} from '../../src/resources/types/resource';

describe('Resource Types', () => {
  describe('ResourceMetrics', () => {
    it('should have correct structure for resource metrics', () => {
      const metrics: ResourceMetrics = {
        memoryUsage: 536870912, // 512MB
        cpuUsage: 45.5,
        diskUsage: 1073741824, // 1GB
        browserInstances: 3,
        activeRequests: 2,
        timestamp: new Date()
      };

      expect(metrics.memoryUsage).toBe(536870912);
      expect(metrics.cpuUsage).toBe(45.5);
      expect(metrics.diskUsage).toBe(1073741824);
      expect(metrics.browserInstances).toBe(3);
      expect(metrics.activeRequests).toBe(2);
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('ResourcePressure', () => {
    it('should have correct structure for resource pressure indicators', () => {
      const pressure: ResourcePressure = {
        memory: true,
        cpu: false,
        disk: false,
        network: false,
        overall: true
      };

      expect(pressure.memory).toBe(true);
      expect(pressure.cpu).toBe(false);
      expect(pressure.disk).toBe(false);
      expect(pressure.network).toBe(false);
      expect(pressure.overall).toBe(true);
    });

    it('should indicate no pressure when all resources are healthy', () => {
      const pressure: ResourcePressure = {
        memory: false,
        cpu: false,
        disk: false,
        network: false,
        overall: false
      };

      expect(pressure.overall).toBe(false);
      expect(Object.values(pressure).every(p => p === false)).toBe(true);
    });
  });

  describe('ResourceThresholds', () => {
    it('should have correct structure for resource thresholds', () => {
      const thresholds: ResourceThresholds = {
        memoryWarning: 1073741824, // 1GB
        memoryCritical: 2147483648, // 2GB
        cpuWarning: 70,
        cpuCritical: 90,
        diskWarning: 5368709120, // 5GB
        diskCritical: 1073741824 // 1GB
      };

      expect(thresholds.memoryWarning).toBe(1073741824);
      expect(thresholds.memoryCritical).toBe(2147483648);
      expect(thresholds.cpuWarning).toBe(70);
      expect(thresholds.cpuCritical).toBe(90);
      expect(thresholds.diskWarning).toBe(5368709120);
      expect(thresholds.diskCritical).toBe(1073741824);
    });

    it('should validate threshold relationships', () => {
      const thresholds: ResourceThresholds = {
        memoryWarning: 1000,
        memoryCritical: 2000,
        cpuWarning: 70,
        cpuCritical: 90,
        diskWarning: 5000,
        diskCritical: 1000
      };

      // Memory thresholds should be properly ordered
      expect(thresholds.memoryCritical).toBeGreaterThan(thresholds.memoryWarning);
      
      // CPU thresholds should be properly ordered
      expect(thresholds.cpuCritical).toBeGreaterThan(thresholds.cpuWarning);
      
      // Note: disk critical can be less than warning (available space)
      expect(thresholds.diskCritical).toBeLessThan(thresholds.diskWarning);
    });
  });
});