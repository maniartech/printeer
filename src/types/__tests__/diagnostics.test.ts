import { describe, it, expect } from 'vitest';
import type { 
  DiagnosticResult, 
  SystemDiagnostics, 
  SystemEnvironment,
  BrowserInfo,
  ResourceInfo,
  DependencyInfo
} from '../diagnostics';

describe('Diagnostics Types', () => {
  describe('DiagnosticResult', () => {
    it('should have correct structure for passing diagnostic', () => {
      const result: DiagnosticResult = {
        status: 'pass',
        component: 'browser',
        message: 'Browser is available and functional',
        details: {
          version: '119.0.0.0',
          path: '/usr/bin/chromium'
        }
      };

      expect(result.status).toBe('pass');
      expect(result.component).toBe('browser');
      expect(result.message).toBe('Browser is available and functional');
      expect(result.details?.version).toBe('119.0.0.0');
    });

    it('should have correct structure for failing diagnostic with remediation', () => {
      const result: DiagnosticResult = {
        status: 'fail',
        component: 'display',
        message: 'No display server found',
        remediation: 'Install Xvfb: sudo apt-get install xvfb',
        details: {
          displayVar: process.env.DISPLAY || 'undefined'
        }
      };

      expect(result.status).toBe('fail');
      expect(result.remediation).toBe('Install Xvfb: sudo apt-get install xvfb');
    });
  });

  describe('SystemDiagnostics', () => {
    it('should have complete system diagnostic structure', () => {
      const systemEnv: SystemEnvironment = {
        os: 'linux',
        arch: 'x64',
        nodeVersion: '18.17.0',
        isDocker: true,
        isHeadless: true
      };

      const browserInfo: BrowserInfo = {
        available: true,
        path: '/usr/bin/chromium',
        version: '119.0.0.0',
        launchable: true
      };

      const resourceInfo: ResourceInfo = {
        totalMemory: 8589934592,
        availableMemory: 4294967296,
        cpuCores: 4,
        diskSpace: 107374182400
      };

      const dependencyInfo: DependencyInfo = {
        fonts: ['DejaVu Sans', 'Liberation Sans'],
        displayServer: false,
        permissions: ['read', 'write', 'execute']
      };

      const diagnostics: SystemDiagnostics = {
        timestamp: new Date(),
        environment: systemEnv,
        browser: browserInfo,
        resources: resourceInfo,
        dependencies: dependencyInfo
      };

      expect(diagnostics.environment.os).toBe('linux');
      expect(diagnostics.browser.available).toBe(true);
      expect(diagnostics.resources.cpuCores).toBe(4);
      expect(diagnostics.dependencies.displayServer).toBe(false);
    });
  });

  describe('Type Validation', () => {
    it('should validate diagnostic status types', () => {
      const passResult: DiagnosticResult = {
        status: 'pass',
        component: 'test',
        message: 'Test passed'
      };

      const warnResult: DiagnosticResult = {
        status: 'warn',
        component: 'test',
        message: 'Test warning'
      };

      const failResult: DiagnosticResult = {
        status: 'fail',
        component: 'test',
        message: 'Test failed'
      };

      expect(passResult.status).toBe('pass');
      expect(warnResult.status).toBe('warn');
      expect(failResult.status).toBe('fail');
    });
  });
});