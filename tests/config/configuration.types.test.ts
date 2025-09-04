import { describe, it, expect } from 'vitest';
import type { 
  Configuration, 
  BrowserConfig, 
  ResourceLimits, 
  ValidationResult
} from '../../src/config/types/configuration';

describe('Configuration Types', () => {
  describe('BrowserConfig', () => {
    it('should have correct structure for browser configuration', () => {
      const browserConfig: BrowserConfig = {
        executablePath: '/usr/bin/chromium',
        headless: true,
        args: ['--no-sandbox'],
        timeout: 30000,
        pool: {
          min: 1,
          max: 5,
          idleTimeout: 60000
        }
      };

      expect(browserConfig.executablePath).toBe('/usr/bin/chromium');
      expect(browserConfig.headless).toBe(true);
      expect(browserConfig.args).toEqual(['--no-sandbox']);
      expect(browserConfig.timeout).toBe(30000);
      expect(browserConfig.pool.min).toBe(1);
      expect(browserConfig.pool.max).toBe(5);
      expect(browserConfig.pool.idleTimeout).toBe(60000);
    });

    it('should support auto headless mode', () => {
      const browserConfig: BrowserConfig = {
        headless: 'auto',
        args: [],
        timeout: 30000,
        pool: {
          min: 1,
          max: 5,
          idleTimeout: 60000
        }
      };

      expect(browserConfig.headless).toBe('auto');
    });
  });

  describe('ResourceLimits', () => {
    it('should have correct structure for resource limits', () => {
      const resourceLimits: ResourceLimits = {
        maxMemoryMB: 1024,
        maxCpuPercent: 80,
        maxDiskMB: 500,
        maxConcurrentRequests: 10
      };

      expect(resourceLimits.maxMemoryMB).toBe(1024);
      expect(resourceLimits.maxCpuPercent).toBe(80);
      expect(resourceLimits.maxDiskMB).toBe(500);
      expect(resourceLimits.maxConcurrentRequests).toBe(10);
    });
  });

  describe('Configuration', () => {
    it('should have complete configuration structure', () => {
      const config: Configuration = {
        mode: 'long-running',
        environment: 'production',
        browser: {
          headless: true,
          args: ['--no-sandbox'],
          timeout: 30000,
          pool: {
            min: 1,
            max: 5,
            idleTimeout: 60000
          }
        },
        resources: {
          maxMemoryMB: 1024,
          maxCpuPercent: 80,
          maxDiskMB: 500,
          maxConcurrentRequests: 10
        },
        longRunning: {
          coolingPeriodMs: 300000,
          healthCheckInterval: 30000,
          maxUptime: 86400000
        },
        logging: {
          level: 'info',
          format: 'json',
          destination: 'console'
        },
        security: {
          allowedDomains: ['example.com'],
          blockedDomains: ['malicious.com'],
          maxFileSize: 10485760,
          sanitizeInput: true
        }
      };

      expect(config.mode).toBe('long-running');
      expect(config.environment).toBe('production');
      expect(config.browser.headless).toBe(true);
      expect(config.resources.maxMemoryMB).toBe(1024);
      expect(config.longRunning.coolingPeriodMs).toBe(300000);
      expect(config.logging.level).toBe('info');
      expect(config.security.sanitizeInput).toBe(true);
    });
  });

  describe('ValidationResult', () => {
    it('should have correct structure for validation results', () => {
      const validResult: ValidationResult = {
        valid: true,
        errors: [],
        warnings: ['Minor configuration issue']
      };

      const invalidResult: ValidationResult = {
        valid: false,
        errors: ['Missing required field'],
        warnings: []
      };

      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toEqual([]);
      expect(validResult.warnings).toEqual(['Minor configuration issue']);

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toEqual(['Missing required field']);
      expect(invalidResult.warnings).toEqual([]);
    });
  });
});