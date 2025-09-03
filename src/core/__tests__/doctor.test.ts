import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { DefaultDoctorModule } from '../doctor';

// Mock external dependencies
vi.mock('os');
vi.mock('fs');
vi.mock('child_process');

// Mock DNS module
vi.mock('dns', () => ({
  lookup: vi.fn()
}));

// Mock puppeteer with proper factory function
vi.mock('puppeteer', () => ({
  default: {
    executablePath: vi.fn(),
    launch: vi.fn()
  },
  executablePath: vi.fn(),
  launch: vi.fn()
}));

// Mock printeer module
vi.mock('../../printeer', () => ({
  default: vi.fn().mockResolvedValue('/mock/output/file.pdf')
}));

const mockOs = vi.mocked(os);
const mockFs = vi.mocked(fs);
const mockExecSync = vi.mocked(execSync);

// Get the mocked puppeteer after import
let mockPuppeteer: any;

describe('DefaultDoctorModule - System Dependency Checker', () => {
  let doctorModule: DefaultDoctorModule;

  beforeEach(async () => {
    doctorModule = new DefaultDoctorModule();

    // Initialize mockPuppeteer after import
    const puppeteer = await import('puppeteer');
    mockPuppeteer = vi.mocked(puppeteer.default);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkSystemDependencies', () => {
    it('should return system information successfully', async () => {
      // Mock system info
      mockOs.type.mockReturnValue('Linux');
      mockOs.release.mockReturnValue('5.4.0');
      mockOs.arch.mockReturnValue('x64');
      mockOs.platform.mockReturnValue('linux');

      // Mock process
      Object.defineProperty(process, 'version', { value: 'v18.0.0' });
      Object.defineProperty(process, 'env', {
        value: { DISPLAY: ':0' },
        configurable: true
      });

      // Mock file system checks
      mockFs.existsSync.mockImplementation((path) => {
        if (path === '/usr/bin/google-chrome') return true;
        if (path === '/usr/share/fonts') return true;
        if (path === '/.dockerenv') return false;
        return false;
      });

      mockFs.readFileSync.mockImplementation((path) => {
        if (path === '/proc/1/cgroup') return 'normal-process';
        throw new Error('File not found');
      });

      mockFs.readdirSync.mockReturnValue(['arial.ttf', 'times.ttf'] as any);

      // Mock browser version check
      mockExecSync.mockImplementation((command) => {
        if (command.includes('--version')) {
          return 'Google Chrome 120.0.0.0';
        }
        throw new Error('Command not found');
      });

      const results = await doctorModule.checkSystemDependencies();

      expect(results).toHaveLength(4);

      // Check system info result
      const systemInfoResult = results.find(r => r.component === 'system-info');
      expect(systemInfoResult).toBeDefined();
      expect(systemInfoResult?.status).toBe('pass');
      expect(systemInfoResult?.message).toContain('Linux 5.4.0 x64');
      expect(systemInfoResult?.message).toContain('Node.js v18.0.0');

      // Check browser availability result
      const browserResult = results.find(r => r.component === 'browser-availability');
      expect(browserResult).toBeDefined();
      expect(browserResult?.status).toBe('pass');
      expect(browserResult?.message).toContain('/usr/bin/google-chrome');
      expect(browserResult?.details?.source).toBe('system');

      // Check display server result
      const displayResult = results.find(r => r.component === 'display-server');
      expect(displayResult).toBeDefined();
      expect(displayResult?.status).toBe('pass');
      expect(displayResult?.message).toContain('X11');

      // Check font availability result
      const fontResult = results.find(r => r.component === 'font-availability');
      expect(fontResult).toBeDefined();
      expect(fontResult?.status).toBe('pass');
      expect(fontResult?.message).toContain('Found 2 font files');
    });

    it('should handle missing browser gracefully', async () => {
      // Mock system info
      mockOs.type.mockReturnValue('Linux');
      mockOs.release.mockReturnValue('5.4.0');
      mockOs.arch.mockReturnValue('x64');
      mockOs.platform.mockReturnValue('linux');

      Object.defineProperty(process, 'version', { value: 'v18.0.0' });
      Object.defineProperty(process, 'env', {
        value: { DISPLAY: ':0' },
        configurable: true
      });

      // Mock no browser found
      mockFs.existsSync.mockImplementation((path) => {
        if (path === '/usr/share/fonts') return true;
        if (path === '/.dockerenv') return false;
        return false; // No browser found
      });

      mockFs.readFileSync.mockImplementation((path) => {
        if (path === '/proc/1/cgroup') return 'normal-process';
        throw new Error('File not found');
      });

      mockFs.readdirSync.mockReturnValue(['arial.ttf'] as any);

      const results = await doctorModule.checkSystemDependencies();

      const browserResult = results.find(r => r.component === 'browser-availability');
      expect(browserResult).toBeDefined();
      expect(browserResult?.status).toBe('fail');
      expect(browserResult?.message).toBe('No suitable browser found');
      expect(browserResult?.remediation).toContain('Install Chrome/Chromium');
    });

    it('should detect Docker environment correctly', async () => {
      // Mock Docker environment
      mockOs.type.mockReturnValue('Linux');
      mockOs.release.mockReturnValue('5.4.0');
      mockOs.arch.mockReturnValue('x64');
      mockOs.platform.mockReturnValue('linux');

      Object.defineProperty(process, 'version', { value: 'v18.0.0' });
      Object.defineProperty(process, 'env', {
        value: {},
        configurable: true
      });

      // Mock Docker detection
      mockFs.existsSync.mockImplementation((path) => {
        if (path === '/.dockerenv') return true;
        if (path === '/usr/bin/google-chrome') return true;
        if (path === '/usr/share/fonts') return true;
        return false;
      });

      mockFs.readFileSync.mockReturnValue('normal-process');
      mockFs.readdirSync.mockReturnValue(['arial.ttf'] as any);
      mockExecSync.mockReturnValue('Google Chrome 120.0.0.0');

      const results = await doctorModule.checkSystemDependencies();

      const systemInfoResult = results.find(r => r.component === 'system-info');
      expect(systemInfoResult?.details?.isDocker).toBe(true);
      expect(systemInfoResult?.details?.isHeadless).toBe(true);
    });

    it('should handle headless environment without display server', async () => {
      // Mock headless Linux environment
      mockOs.type.mockReturnValue('Linux');
      mockOs.release.mockReturnValue('5.4.0');
      mockOs.arch.mockReturnValue('x64');
      mockOs.platform.mockReturnValue('linux');

      Object.defineProperty(process, 'version', { value: 'v18.0.0' });
      Object.defineProperty(process, 'env', {
        value: {}, // No DISPLAY
        configurable: true
      });

      mockFs.existsSync.mockImplementation((path) => {
        if (path === '/usr/bin/google-chrome') return true;
        if (path === '/usr/share/fonts') return true;
        if (path === '/.dockerenv') return false;
        return false;
      });

      mockFs.readFileSync.mockReturnValue('normal-process');
      mockFs.readdirSync.mockReturnValue(['arial.ttf'] as any);

      // Mock Xvfb available
      mockExecSync.mockImplementation((command) => {
        if (command.includes('--version')) return 'Google Chrome 120.0.0.0';
        if (command === 'which Xvfb') return '/usr/bin/Xvfb';
        throw new Error('Command not found');
      });

      const results = await doctorModule.checkSystemDependencies();

      const displayResult = results.find(r => r.component === 'display-server');
      expect(displayResult).toBeDefined();
      expect(displayResult?.status).toBe('warn');
      expect(displayResult?.message).toContain('Xvfb is available');
    });

    it('should handle Windows environment correctly', async () => {
      // Mock Windows environment
      mockOs.type.mockReturnValue('Windows_NT');
      mockOs.release.mockReturnValue('10.0.19041');
      mockOs.arch.mockReturnValue('x64');
      mockOs.platform.mockReturnValue('win32');

      Object.defineProperty(process, 'version', { value: 'v18.0.0' });

      mockFs.existsSync.mockImplementation((path) => {
        if (path === 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe') return true;
        if (path === 'C:\\Windows\\Fonts') return true;
        return false;
      });

      mockFs.readdirSync.mockReturnValue(['arial.ttf', 'times.ttf'] as any);
      mockExecSync.mockReturnValue('Google Chrome 120.0.0.0');

      const results = await doctorModule.checkSystemDependencies();

      const displayResult = results.find(r => r.component === 'display-server');
      expect(displayResult?.status).toBe('pass');
      expect(displayResult?.message).toContain('native GUI');

      const browserResult = results.find(r => r.component === 'browser-availability');
      expect(browserResult?.details?.path).toContain('Chrome\\Application\\chrome.exe');
  expect(browserResult?.details?.source).toBe('system');
    });

    it('should handle custom browser path from environment variable', async () => {
      // Mock system info
      mockOs.type.mockReturnValue('Linux');
      mockOs.release.mockReturnValue('5.4.0');
      mockOs.arch.mockReturnValue('x64');
      mockOs.platform.mockReturnValue('linux');

      Object.defineProperty(process, 'version', { value: 'v18.0.0' });
      Object.defineProperty(process, 'env', {
        value: {
          DISPLAY: ':0',
          PUPPETEER_EXECUTABLE_PATH: '/custom/chrome/path'
        },
        configurable: true
      });

      mockFs.existsSync.mockImplementation((path) => {
        if (path === '/custom/chrome/path') return true;
        if (path === '/usr/share/fonts') return true;
        if (path === '/.dockerenv') return false;
        return false;
      });

      mockFs.readFileSync.mockReturnValue('normal-process');
      mockFs.readdirSync.mockReturnValue(['arial.ttf'] as any);
      mockExecSync.mockReturnValue('Custom Chrome 120.0.0.0');

      const results = await doctorModule.checkSystemDependencies();

      const browserResult = results.find(r => r.component === 'browser-availability');
      expect(browserResult?.status).toBe('pass');
      expect(browserResult?.details?.path).toBe('/custom/chrome/path');
      expect(browserResult?.details?.version).toBe('Custom Chrome 120.0.0.0');
  expect(browserResult?.details?.source).toBe('env');
    });
  });

  describe.only('validateBrowserInstallation', () => {
    it('should validate browser installation successfully', async () => {
      // Mock system setup
      mockOs.platform.mockReturnValue('linux');
      mockOs.tmpdir.mockReturnValue('/tmp');
      mockOs.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB
      mockOs.freemem.mockReturnValue(4 * 1024 * 1024 * 1024); // 4GB
      mockOs.cpus.mockReturnValue(new Array(4).fill({})); // 4 cores
      mockOs.userInfo.mockReturnValue({ username: 'testuser' } as any);

      mockFs.existsSync.mockImplementation((path) => {
        if (path === '/usr/bin/google-chrome') return true;
        return false;
      });

      mockFs.writeFileSync.mockImplementation(() => {});
      mockFs.unlinkSync.mockImplementation(() => {});

      mockExecSync.mockReturnValue('Google Chrome 120.0.0.0');

      // Mock successful browser launch
      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue({}),
          title: vi.fn().mockResolvedValue('Test')
        }),
        close: vi.fn().mockResolvedValue({})
      };

      mockPuppeteer.launch.mockResolvedValue(mockBrowser);

      const results = await doctorModule.validateBrowserInstallation();

      expect(results).toHaveLength(3);

      const launchResult = results.find(r => r.component === 'browser-launch');
      expect(launchResult?.status).toBe('pass');

      const versionResult = results.find(r => r.component === 'browser-version');
      expect(versionResult?.status).toBe('pass');

      const sandboxResult = results.find(r => r.component === 'browser-sandbox');
      expect(sandboxResult?.status).toBe('pass');
    });

    it('should handle browser launch failure gracefully', async () => {
      mockOs.platform.mockReturnValue('linux');
      mockFs.existsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('Google Chrome 120.0.0.0');

      // Mock browser launch failure
      mockPuppeteer.launch.mockRejectedValue(new Error('Browser launch failed'));

      const results = await doctorModule.validateBrowserInstallation();

      const launchResult = results.find(r => r.component === 'browser-launch');
      expect(launchResult?.status).toBe('fail');
      expect(launchResult?.message).toContain('All browser launch configurations failed');
    });

    it('should test fallback configurations', async () => {
      mockOs.platform.mockReturnValue('linux');
      mockFs.existsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('Google Chrome 120.0.0.0');

      // Mock browser launch - first config fails, second succeeds
      let callCount = 0;
      mockPuppeteer.launch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First config failed');
        }
        return Promise.resolve({
          newPage: vi.fn().mockResolvedValue({
            goto: vi.fn().mockResolvedValue({}),
            title: vi.fn().mockResolvedValue('Test')
          }),
          close: vi.fn().mockResolvedValue({})
        });
      });

      const results = await doctorModule.validateBrowserInstallation();

      const launchResult = results.find(r => r.component === 'browser-launch');
      expect(launchResult?.status).toBe('pass');
      expect(launchResult?.details?.workingConfigurations).toBeGreaterThan(0);
    });

    it('should detect old browser version', async () => {
      mockOs.platform.mockReturnValue('linux');
      mockFs.existsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('Google Chrome 69.0.0.0'); // Old version

      mockPuppeteer.launch.mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue({}),
          title: vi.fn().mockResolvedValue('Test')
        }),
        close: vi.fn().mockResolvedValue({})
      });

      const results = await doctorModule.validateBrowserInstallation();

      const versionResult = results.find(r => r.component === 'browser-version');
      expect(versionResult?.status).toBe('warn');
      expect(versionResult?.message).toContain('may be too old');
    });
  });

  describe.skip('testBrowserLaunch', () => {
    it('should test browser launch successfully', async () => {
      // Force bundled-only mode for consistent test behavior
      process.env.PRINTEER_BUNDLED_ONLY = '1';

      mockFs.existsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('Google Chrome 120.0.0.0');

      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue({}),
          title: vi.fn().mockResolvedValue('Test')
        }),
        close: vi.fn().mockResolvedValue({})
      };

      mockPuppeteer.launch.mockResolvedValue(mockBrowser);

      const result = await doctorModule.testBrowserLaunch();

      expect(result.status).toBe('pass');
      expect(result.component).toBe('browser-launch');
      expect(result.message).toContain('Browser launch successful');
    });

    it('should handle no browser available', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await doctorModule.testBrowserLaunch();

      expect(result.status).toBe('fail');
      expect(result.component).toBe('browser-launch');
      expect(result.message).toContain('no browser available');
    });

    it('should handle browser launch failure', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('Google Chrome 120.0.0.0');

      mockPuppeteer.launch.mockRejectedValue(new Error('Launch failed'));

      const result = await doctorModule.testBrowserLaunch();

      expect(result.status).toBe('fail');
      expect(result.component).toBe('browser-launch');
      expect(result.message).toContain('All browser launch configurations failed');
    });
  });

  describe('checkEnvironmentCompatibility', () => {
    beforeEach(() => {
      // Setup common mocks
      mockOs.platform.mockReturnValue('linux');
      mockOs.arch.mockReturnValue('x64');
      mockOs.tmpdir.mockReturnValue('/tmp');
      mockOs.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB
      mockOs.freemem.mockReturnValue(4 * 1024 * 1024 * 1024); // 4GB
      mockOs.cpus.mockReturnValue(new Array(4).fill({})); // 4 cores
      mockOs.userInfo.mockReturnValue({ username: 'testuser' } as any);

      mockFs.writeFileSync.mockImplementation(() => {});
      mockFs.unlinkSync.mockImplementation(() => {});
    });

    it('should check environment compatibility successfully', async () => {
      // Mock DNS lookup
      const dns = await import('dns');
      const mockDnsLookup = vi.mocked(dns.lookup);
      mockDnsLookup.mockImplementation((hostname: any, callback: any) => {
        setImmediate(() => callback(null, '8.8.8.8', 4));
      });

      const results = await doctorModule.checkEnvironmentCompatibility();

      expect(results).toHaveLength(4);

      const platformResult = results.find(r => r.component === 'platform-compatibility');
      expect(platformResult?.status).toBe('pass');

      const permissionsResult = results.find(r => r.component === 'permissions');
      expect(permissionsResult?.status).toBe('pass');

      const resourceResult = results.find(r => r.component === 'resource-availability');
      expect(resourceResult?.status).toBe('pass');

      const networkResult = results.find(r => r.component === 'network-connectivity');
      expect(networkResult?.status).toBe('pass');
    });

    it('should detect unsupported platform', async () => {
      mockOs.platform.mockReturnValue('freebsd' as any);
      mockOs.arch.mockReturnValue('x64');

      // Mock DNS to avoid timeout
      const dns = await import('dns');
      const mockDnsLookup = vi.mocked(dns.lookup);
      mockDnsLookup.mockImplementation((hostname: any, callback: any) => {
        setImmediate(() => callback(null, '8.8.8.8', 4));
      });

      const results = await doctorModule.checkEnvironmentCompatibility();

      const platformResult = results.find(r => r.component === 'platform-compatibility');
      expect(platformResult?.status).toBe('fail');
      expect(platformResult?.message).toContain('Unsupported platform');
    });

    it('should detect low memory conditions', async () => {
      mockOs.totalmem.mockReturnValue(512 * 1024 * 1024); // 512MB
      mockOs.freemem.mockReturnValue(128 * 1024 * 1024); // 128MB
      mockOs.cpus.mockReturnValue([{}]); // 1 core

      // Mock DNS to avoid timeout
      const dns = await import('dns');
      const mockDnsLookup = vi.mocked(dns.lookup);
      mockDnsLookup.mockImplementation((hostname: any, callback: any) => {
        setImmediate(() => callback(null, '8.8.8.8', 4));
      });

      const results = await doctorModule.checkEnvironmentCompatibility();

      const resourceResult = results.find(r => r.component === 'resource-availability');
      expect(resourceResult?.status).toBe('warn');
      expect(resourceResult?.message).toContain('Resource constraints detected');
    });

    it('should detect permission issues', async () => {
      // Mock file system write failure
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Mock DNS to avoid timeout
      const dns = await import('dns');
      const mockDnsLookup = vi.mocked(dns.lookup);
      mockDnsLookup.mockImplementation((hostname: any, callback: any) => {
        setImmediate(() => callback(null, '8.8.8.8', 4));
      });

      const results = await doctorModule.checkEnvironmentCompatibility();

      const permissionsResult = results.find(r => r.component === 'permissions');
      expect(permissionsResult?.status).toBe('warn');
      expect(permissionsResult?.message).toContain('Permission issues detected');
    });

    it('should detect network connectivity issues', async () => {
      // Mock DNS lookup failure
      const dns = await import('dns');
      const mockDnsLookup = vi.mocked(dns.lookup);
      mockDnsLookup.mockImplementation((hostname: any, callback: any) => {
        setImmediate(() => callback(new Error('DNS resolution failed'), null, 0));
      });

      const results = await doctorModule.checkEnvironmentCompatibility();

      const networkResult = results.find(r => r.component === 'network-connectivity');
      expect(networkResult?.status).toBe('warn');
      expect(networkResult?.message).toContain('Network connectivity issues');
    });

    it('should detect root user execution', async () => {
      mockOs.userInfo.mockReturnValue({ username: 'root' } as any);

      // Mock DNS to avoid timeout
      const dns = await import('dns');
      const mockDnsLookup = vi.mocked(dns.lookup);
      mockDnsLookup.mockImplementation((hostname: any, callback: any) => {
        setImmediate(() => callback(null, '8.8.8.8', 4));
      });

      const results = await doctorModule.checkEnvironmentCompatibility();

      const permissionsResult = results.find(r => r.component === 'permissions');
      expect(permissionsResult?.status).toBe('warn');
      expect(permissionsResult?.details?.isRoot).toBe(true);
    });
  });

  describe('runFullDiagnostics', () => {
    it('should run all diagnostic checks', async () => {
      // Mock all necessary dependencies
      mockOs.type.mockReturnValue('Linux');
      mockOs.release.mockReturnValue('5.4.0');
      mockOs.arch.mockReturnValue('x64');
      mockOs.platform.mockReturnValue('linux');
      mockOs.tmpdir.mockReturnValue('/tmp');
      mockOs.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024);
      mockOs.freemem.mockReturnValue(4 * 1024 * 1024 * 1024);
      mockOs.cpus.mockReturnValue(new Array(4).fill({}));
      mockOs.userInfo.mockReturnValue({ username: 'testuser' } as any);

      Object.defineProperty(process, 'version', { value: 'v18.0.0' });
      Object.defineProperty(process, 'env', {
        value: { DISPLAY: ':0' },
        configurable: true
      });

      mockFs.existsSync.mockImplementation((path) => {
        if (path === '/usr/bin/google-chrome') return true;
        if (path === '/usr/share/fonts') return true;
        if (path === '/.dockerenv') return false;
        return false;
      });

      mockFs.readFileSync.mockReturnValue('normal-process');
      mockFs.readdirSync.mockReturnValue(['arial.ttf'] as any);
      mockFs.writeFileSync.mockImplementation(() => {});
      mockFs.unlinkSync.mockImplementation(() => {});

      mockExecSync.mockReturnValue('Google Chrome 120.0.0.0');

      mockPuppeteer.launch.mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue({}),
          title: vi.fn().mockResolvedValue('Test')
        }),
        close: vi.fn().mockResolvedValue({})
      });

      // Mock DNS lookup
      const dns = await import('dns');
      const mockDnsLookup = vi.mocked(dns.lookup);
      mockDnsLookup.mockImplementation((hostname: any, callback: any) => {
        setImmediate(() => callback(null, '8.8.8.8', 4));
      });

      const results = await doctorModule.runFullDiagnostics();

      // Should include results from all three main diagnostic categories
      expect(results.length).toBeGreaterThan(8); // At least system deps + browser validation + env compatibility

      // Check that we have results from each category
      const systemInfoResult = results.find(r => r.component === 'system-info');
      expect(systemInfoResult).toBeDefined();

      const browserLaunchResult = results.find(r => r.component === 'browser-launch');
      expect(browserLaunchResult).toBeDefined();

      const platformResult = results.find(r => r.component === 'platform-compatibility');
      expect(platformResult).toBeDefined();
    });
  });

  describe('generateReport', () => {
    it('should generate a comprehensive diagnostic report', async () => {
      // Mock basic successful scenario
      mockOs.type.mockReturnValue('Linux');
      mockOs.release.mockReturnValue('5.4.0');
      mockOs.arch.mockReturnValue('x64');
      mockOs.platform.mockReturnValue('linux');
      mockOs.tmpdir.mockReturnValue('/tmp');
      mockOs.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024);
      mockOs.freemem.mockReturnValue(4 * 1024 * 1024 * 1024);
      mockOs.cpus.mockReturnValue(new Array(4).fill({}));
      mockOs.userInfo.mockReturnValue({ username: 'testuser' } as any);

      Object.defineProperty(process, 'version', { value: 'v18.0.0' });
      Object.defineProperty(process, 'env', {
        value: { DISPLAY: ':0' },
        configurable: true
      });

      mockFs.existsSync.mockImplementation((path) => {
        if (path === '/usr/bin/google-chrome') return true;
        if (path === '/usr/share/fonts') return true;
        if (path === '/.dockerenv') return false;
        return false;
      });

      mockFs.readFileSync.mockReturnValue('normal-process');
      mockFs.readdirSync.mockReturnValue(['arial.ttf'] as any);
      mockFs.writeFileSync.mockImplementation(() => {});
      mockFs.unlinkSync.mockImplementation(() => {});

      mockExecSync.mockReturnValue('Google Chrome 120.0.0.0');

      mockPuppeteer.launch.mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue({}),
          title: vi.fn().mockResolvedValue('Test')
        }),
        close: vi.fn().mockResolvedValue({})
      });

      const dns = await import('dns');
      const mockDnsLookup = vi.mocked(dns.lookup);
      mockDnsLookup.mockImplementation((hostname: any, callback: any) => {
        setImmediate(() => callback(null, '8.8.8.8', 4));
      });

  const report = await doctorModule.generateReport();

      expect(report).toContain('# Printeer System Diagnostic Report');
      expect(report).toContain('## Summary');
  expect(report).toContain('### Browser');
  expect(report).toMatch(/Path:\s/);
      expect(report).toContain('✅ Passed:');
      expect(report).toContain('⚠️  Warnings:');
      expect(report).toContain('❌ Failed:');
      expect(report).toContain('## All Checks');
    });

    it('should generate report with critical issues section when failures exist', async () => {
      // Mock scenario with failures
      mockOs.type.mockReturnValue('Linux');
      mockOs.release.mockReturnValue('5.4.0');
      mockOs.arch.mockReturnValue('x64');
      mockOs.platform.mockReturnValue('linux');
      mockOs.tmpdir.mockReturnValue('/tmp');
      mockOs.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024);
      mockOs.freemem.mockReturnValue(4 * 1024 * 1024 * 1024);
      mockOs.cpus.mockReturnValue(new Array(4).fill({}));
      mockOs.userInfo.mockReturnValue({ username: 'testuser' } as any);

      Object.defineProperty(process, 'version', { value: 'v18.0.0' });
      Object.defineProperty(process, 'env', {
        value: { DISPLAY: ':0' },
        configurable: true
      });

      // Mock no browser found
      mockFs.existsSync.mockImplementation((path) => {
        if (path === '/usr/share/fonts') return true;
        if (path === '/.dockerenv') return false;
        return false; // No browser found
      });

      mockFs.readFileSync.mockReturnValue('normal-process');
      mockFs.readdirSync.mockReturnValue(['arial.ttf'] as any);
      mockFs.writeFileSync.mockImplementation(() => {});
      mockFs.unlinkSync.mockImplementation(() => {});

      const dns = await import('dns');
      const mockDnsLookup = vi.mocked(dns.lookup);
      mockDnsLookup.mockImplementation((hostname: any, callback: any) => {
        setImmediate(() => callback(null, '8.8.8.8', 4));
      });

      const report = await doctorModule.generateReport();

      expect(report).toContain('## Critical Issues');
      expect(report).toContain('❌ browser-availability');
      expect(report).toContain('**Solution:**');
      expect(report).toContain('Install Chrome/Chromium');
    });

    it('should generate report with warnings section when warnings exist', async () => {
      // Mock scenario with warnings (low memory)
      mockOs.type.mockReturnValue('Linux');
      mockOs.release.mockReturnValue('5.4.0');
      mockOs.arch.mockReturnValue('x64');
      mockOs.platform.mockReturnValue('linux');
      mockOs.tmpdir.mockReturnValue('/tmp');
      mockOs.totalmem.mockReturnValue(512 * 1024 * 1024); // Low memory
      mockOs.freemem.mockReturnValue(128 * 1024 * 1024);
      mockOs.cpus.mockReturnValue([{}]); // Single core
      mockOs.userInfo.mockReturnValue({ username: 'testuser' } as any);

      Object.defineProperty(process, 'version', { value: 'v18.0.0' });
      Object.defineProperty(process, 'env', {
        value: { DISPLAY: ':0' },
        configurable: true
      });

      mockFs.existsSync.mockImplementation((path) => {
        if (path === '/usr/bin/google-chrome') return true;
        if (path === '/usr/share/fonts') return true;
        if (path === '/.dockerenv') return false;
        return false;
      });

      mockFs.readFileSync.mockReturnValue('normal-process');
      mockFs.readdirSync.mockReturnValue(['arial.ttf'] as any);
      mockFs.writeFileSync.mockImplementation(() => {});
      mockFs.unlinkSync.mockImplementation(() => {});

      mockExecSync.mockReturnValue('Google Chrome 120.0.0.0');

      mockPuppeteer.launch.mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue({}),
          title: vi.fn().mockResolvedValue('Test')
        }),
        close: vi.fn().mockResolvedValue({})
      });

      const dns = await import('dns');
      const mockDnsLookup = vi.mocked(dns.lookup);
      mockDnsLookup.mockImplementation((hostname: any, callback: any) => {
        setImmediate(() => callback(null, '8.8.8.8', 4));
      });

      const report = await doctorModule.generateReport();

      expect(report).toContain('## Warnings');
      expect(report).toContain('⚠️ resource-availability');
      expect(report).toContain('**Recommendation:**');
      expect(report).toContain('Resource constraints detected');
    });
  });

  describe('formatDiagnosticReportJson', () => {
    it('should format diagnostic results as JSON', async () => {
      const mockResults = [
        {
          status: 'pass' as const,
          component: 'test-component',
          message: 'Test passed',
          details: { test: true }
        },
        {
          status: 'fail' as const,
          component: 'test-component-2',
          message: 'Test failed',
          remediation: 'Fix the test',
          details: { error: 'test error' }
        }
      ];

      const jsonReport = doctorModule.formatDiagnosticReportJson(mockResults);
      const parsed = JSON.parse(jsonReport);

      expect(parsed).toHaveProperty('summary');
      expect(parsed.summary).toHaveProperty('timestamp');
      expect(parsed.summary).toHaveProperty('total', 2);
      expect(parsed.summary).toHaveProperty('passed', 1);
      expect(parsed.summary).toHaveProperty('warnings', 0);
      expect(parsed.summary).toHaveProperty('failed', 1);

      expect(parsed).toHaveProperty('results');
      expect(parsed.results).toHaveLength(2);
      expect(parsed.results[0]).toEqual(mockResults[0]);
      expect(parsed.results[1]).toEqual(mockResults[1]);
    });
  });
});