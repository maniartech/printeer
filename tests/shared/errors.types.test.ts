import { describe, it, expect } from 'vitest';
import { ErrorType } from '../../src/types/errors';
import type { PrinteerError, FallbackStrategy } from '../../src/types/errors';

describe('Error Types', () => {
  describe('ErrorType enum', () => {
    it('should have all expected error types', () => {
      expect(ErrorType.CONFIGURATION).toBe('configuration');
      expect(ErrorType.BROWSER_LAUNCH).toBe('browser_launch');
      expect(ErrorType.PAGE_LOAD).toBe('page_load');
      expect(ErrorType.RENDERING).toBe('rendering');
      expect(ErrorType.RESOURCE_EXHAUSTION).toBe('resource_exhaustion');
      expect(ErrorType.NETWORK).toBe('network');
      expect(ErrorType.SECURITY).toBe('security');
      expect(ErrorType.SYSTEM).toBe('system');
    });
  });

  describe('PrinteerError', () => {
    it('should have correct structure for printeer error', () => {
      const error: PrinteerError = {
        name: 'PrinteerError',
        message: 'Browser launch failed',
        type: ErrorType.BROWSER_LAUNCH,
        code: 'BROWSER_LAUNCH_FAILED',
        details: {
          executablePath: '/usr/bin/chromium',
          args: ['--no-sandbox'],
          exitCode: 1
        },
        remediation: 'Check browser installation and permissions',
        retryable: true
      };

      expect(error.type).toBe(ErrorType.BROWSER_LAUNCH);
      expect(error.code).toBe('BROWSER_LAUNCH_FAILED');
      expect(error.retryable).toBe(true);
      expect(error.remediation).toBe('Check browser installation and permissions');
      expect(error.details.executablePath).toBe('/usr/bin/chromium');
    });

    it('should support non-retryable errors', () => {
      const error: PrinteerError = {
        name: 'PrinteerError',
        message: 'Invalid configuration',
        type: ErrorType.CONFIGURATION,
        code: 'INVALID_CONFIG',
        details: {
          field: 'browser.timeout',
          value: -1
        },
        retryable: false
      };

      expect(error.retryable).toBe(false);
      expect(error.type).toBe(ErrorType.CONFIGURATION);
    });
  });

  describe('FallbackStrategy', () => {
    it('should have correct structure for fallback strategy', () => {
      const strategy: FallbackStrategy = {
        canHandle: (error: PrinteerError) => error.type === ErrorType.BROWSER_LAUNCH,
        execute: async (originalOptions: any) => {
          return { ...originalOptions, headless: true };
        },
        getPriority: () => 1
      };

      const browserError: PrinteerError = {
        name: 'PrinteerError',
        message: 'Browser launch failed',
        type: ErrorType.BROWSER_LAUNCH,
        code: 'BROWSER_LAUNCH_FAILED',
        details: {},
        retryable: true
      };

      const configError: PrinteerError = {
        name: 'PrinteerError',
        message: 'Invalid config',
        type: ErrorType.CONFIGURATION,
        code: 'INVALID_CONFIG',
        details: {},
        retryable: false
      };

      expect(strategy.canHandle(browserError)).toBe(true);
      expect(strategy.canHandle(configError)).toBe(false);
      expect(strategy.getPriority()).toBe(1);
    });
  });

  describe('Error Classification', () => {
    it('should properly classify different error types', () => {
      const errors = [
        { type: ErrorType.BROWSER_LAUNCH, retryable: true },
        { type: ErrorType.PAGE_LOAD, retryable: true },
        { type: ErrorType.RENDERING, retryable: true },
        { type: ErrorType.NETWORK, retryable: true },
        { type: ErrorType.CONFIGURATION, retryable: false },
        { type: ErrorType.SECURITY, retryable: false },
        { type: ErrorType.SYSTEM, retryable: false },
        { type: ErrorType.RESOURCE_EXHAUSTION, retryable: true }
      ];

      const retryableErrors = errors.filter(e => e.retryable);
      const nonRetryableErrors = errors.filter(e => !e.retryable);

      expect(retryableErrors).toHaveLength(5);
      expect(nonRetryableErrors).toHaveLength(3);
    });
  });
});