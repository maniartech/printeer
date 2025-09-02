// Doctor module implementation

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { DoctorModule, DiagnosticResult, SystemEnvironment, BrowserInfo } from '../types/diagnostics';
import { DefaultBrowserFactory } from './browser';
import type { PuppeteerLaunchOptions } from 'puppeteer';

export class DefaultDoctorModule implements DoctorModule {
  private browserFactory = new DefaultBrowserFactory();
  private verbose = Boolean(process.env.PRINTEER_DOCTOR_VERBOSE);

  private vlog(stage: string, msg: string, extra?: Record<string, unknown>): void {
    if (!this.verbose) return;
    const payload = { doctorTrace: true, stage, msg, ...(extra || {}) };
    try { console.log(JSON.stringify(payload)); } catch { /* noop */ }
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    });
    try {
  const result = await Promise.race([promise, timeout]);
  return result as T;
    } finally {
      // @ts-expect-error timer exists
      clearTimeout(timer);
    }
  }

  // Build launch options using DefaultBrowserFactory, optionally overriding args and executable
  private buildLaunchOptions(browserInfo?: BrowserInfo, overrideArgs?: string[]): PuppeteerLaunchOptions {
    const base = this.browserFactory.getOptimalLaunchOptions();
    const options: PuppeteerLaunchOptions = { ...base };

    if (browserInfo?.path) {
      options.executablePath = browserInfo.path;
    }

    const baseArgs = Array.isArray(base.args) ? base.args : [];
    const extraArgs: string[] = [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-extensions'
    ];
    // Belt-and-suspenders: ensure Chromium headless flags are present
    // Puppeteer headless:true should suffice, but we also pass CLI flags to avoid any UI flashes on some platforms
    if (!baseArgs.some(a => a.startsWith('--headless'))) {
      extraArgs.push('--headless=new');
    }
  if (process.platform === 'win32') {
      // Prevent any startup window on Windows (harmless elsewhere but gated for safety)
      extraArgs.push('--no-startup-window');
    }

    const mergedOnce = [...baseArgs, ...(overrideArgs || []), ...extraArgs];
    options.args = Array.from(new Set(mergedOnce));

    // Always force headless at API level as well
  options.headless = true as unknown as boolean; // keep type compatibility across puppeteer versions

    // Use a unique isolated user-data-dir per launch so Chrome never attaches/locks
    try {
      const tmp = os.tmpdir();
      const unique = `printeer_doctor_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      options.userDataDir = path.join(tmp, unique);
    } catch {
      // ignore; Puppeteer will still launch with default temp profile
    }

    return options;
  }
  async runFullDiagnostics(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    // Run all diagnostic checks
  this.vlog('phase', 'checkSystemDependencies:start');
    const systemDeps = await this.checkSystemDependencies();
  this.vlog('phase', 'checkSystemDependencies:done');
  this.vlog('phase', 'validateBrowserInstallation:start');
    const browserValidation = await this.validateBrowserInstallation();
  this.vlog('phase', 'validateBrowserInstallation:done');
  this.vlog('phase', 'checkEnvironmentCompatibility:start');
    const envCompatibility = await this.checkEnvironmentCompatibility();
  this.vlog('phase', 'checkEnvironmentCompatibility:done');

    results.push(...systemDeps);
    results.push(...browserValidation);
    results.push(...envCompatibility);

    return results;
  }

  async checkSystemDependencies(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    // Check system information
  this.vlog('step', 'system-info');
    const systemInfo = this.getSystemEnvironment();
    results.push({
      status: 'pass',
      component: 'system-info',
      message: `System: ${systemInfo.os} ${systemInfo.arch}, Node.js ${systemInfo.nodeVersion}`,
      details: systemInfo
    });

    // Check browser availability
  this.vlog('step', 'browser-availability:getBrowserInfo:start');
    const browserInfo = await this.getBrowserInfo();
  this.vlog('step', 'browser-availability:getBrowserInfo:done', { path: browserInfo.path, source: browserInfo.source });
    if (browserInfo.available) {
      results.push({
        status: 'pass',
        component: 'browser-availability',
        message: `Browser found at: ${browserInfo.path}`,
        details: browserInfo
      });
    } else {
      results.push({
        status: 'fail',
        component: 'browser-availability',
        message: 'No suitable browser found',
        remediation: 'Install Chrome/Chromium or set PUPPETEER_EXECUTABLE_PATH environment variable',
        details: browserInfo
      });
    }

    // Check display server
  this.vlog('step', 'display-server');
    const displayServerResult = this.checkDisplayServer();
    results.push(displayServerResult);

    // Check font availability
  this.vlog('step', 'font-availability');
    const fontResult = this.checkFontAvailability();
    results.push(fontResult);

    return results;
  }

  async validateBrowserInstallation(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    // Get browser info
    const browserInfo = await this.getBrowserInfo();

    if (!browserInfo.available) {
      results.push({
        status: 'fail',
        component: 'browser-installation',
        message: 'No browser installation found',
        remediation: 'Install Chrome/Chromium or set PUPPETEER_EXECUTABLE_PATH',
        details: browserInfo
      });
      return results;
    }

    // Test browser launch
  const launchResult = await this.withTimeout(this.testBrowserLaunch(), 30000, 'browser-launch');
    results.push(launchResult);

    // Test browser version compatibility
    const versionResult = this.checkBrowserVersionCompatibility(browserInfo);
    results.push(versionResult);

    // Test sandbox capabilities
  const sandboxResult = await this.withTimeout(this.testSandboxCapabilities(browserInfo), 30000, 'browser-sandbox');
    results.push(sandboxResult);

    return results;
  }

  async testBrowserLaunch(): Promise<DiagnosticResult> {
    const browserInfo = await this.getBrowserInfo();

    if (!browserInfo.available) {
      return {
        status: 'fail',
        component: 'browser-launch',
        message: 'Cannot test browser launch - no browser available',
        remediation: 'Install a compatible browser first'
      };
    }

  // Test basic browser launch
  const basicLaunchResult = await this.testBasicBrowserLaunch(browserInfo);

  // Test browser launch with fallback configurations
  let fallbackResults: DiagnosticResult[] = [];
  if (process.env.PRINTEER_DOCTOR_FAST !== '1') {
    fallbackResults = await this.testFallbackConfigurations(browserInfo);
  } else {
    this.vlog('config', 'fallback-configurations:skipped');
  }

    // Combine basic launch result with fallback results
    const allResults = [basicLaunchResult, ...fallbackResults];
    const passedConfigs = allResults.filter(r => r.status === 'pass');

    if (passedConfigs.length === 0) {
      return {
        status: 'fail',
        component: 'browser-launch',
        message: 'All browser launch configurations failed',
        remediation: 'Check browser installation and system permissions',
        details: {
          basicLaunchResult,
          fallbackResults,
          allResults
        }
      };
    }

    return {
      status: 'pass',
      component: 'browser-launch',
      message: `Browser launch successful (${passedConfigs.length}/${allResults.length} configurations work)`,
      details: {
        workingConfigurations: passedConfigs.length,
        totalConfigurations: allResults.length,
        basicLaunchResult,
        fallbackResults,
        allResults
      }
    };
  }

  async checkEnvironmentCompatibility(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    // Check platform compatibility
    const platformResult = this.checkPlatformCompatibility();
    results.push(platformResult);

    // Check permissions
    const permissionsResult = this.checkPermissions();
    results.push(permissionsResult);

    // Check resource availability
    const resourceResult = this.checkResourceAvailability();
    results.push(resourceResult);

    // Check network connectivity (basic)
    const networkResult = await this.checkNetworkConnectivity();
    results.push(networkResult);

    return results;
  }

  async generateReport(): Promise<string> {
    const results = await this.runFullDiagnostics();

    const report = this.formatDiagnosticReport(results);
    return report;
  }

  // Public: render a Markdown report from precomputed results (no re-run)
  formatDiagnosticReport(results: DiagnosticResult[]): string {
    const timestamp = new Date().toISOString();
    const passCount = results.filter(r => r.status === 'pass').length;
    const warnCount = results.filter(r => r.status === 'warn').length;
    const failCount = results.filter(r => r.status === 'fail').length;

    let report = `# Printeer System Diagnostic Report\n\n`;
    report += `Generated: ${timestamp}\n\n`;
    report += `## Summary\n\n`;
    report += `- ✅ Passed: ${passCount}\n`;
    report += `- ⚠️  Warnings: ${warnCount}\n`;
    report += `- ❌ Failed: ${failCount}\n\n`;

    // Browser quick summary if available
  const availability = results.find(r => r.component === 'browser-availability');
  const browserInfo = (availability?.details as Record<string, unknown>) || {};
    const browserPath = browserInfo.path ?? '';
    const browserVersion = browserInfo.version ?? '';
    const browserSource = browserInfo.source ?? 'unknown';
    const browserAvailable = typeof browserInfo.available === 'boolean' ? browserInfo.available : undefined;
    report += `### Browser\n\n`;
    report += `- Path: ${browserPath || 'n/a'}\n`;
    report += `- Version: ${browserVersion || 'unknown'}\n`;
    report += `- Source: ${browserSource}\n`;
    if (browserAvailable !== undefined) {
      report += `- Available: ${browserAvailable ? 'yes' : 'no'}\n`;
    }
    report += `\n`;

    if (failCount > 0) {
      report += `## Critical Issues\n\n`;
      const failedResults = results.filter(r => r.status === 'fail');
      for (const result of failedResults) {
        report += `### ❌ ${result.component}\n\n`;
        report += `**Issue:** ${result.message}\n\n`;
        if (result.remediation) {
          report += `**Solution:** ${result.remediation}\n\n`;
        }
        if (result.details) {
          report += `**Details:**\n\`\`\`json\n${JSON.stringify(result.details, null, 2)}\n\`\`\`\n\n`;
        }
      }
    }

    if (warnCount > 0) {
      report += `## Warnings\n\n`;
      const warnResults = results.filter(r => r.status === 'warn');
      for (const result of warnResults) {
        report += `### ⚠️ ${result.component}\n\n`;
        report += `**Issue:** ${result.message}\n\n`;
        if (result.remediation) {
          report += `**Recommendation:** ${result.remediation}\n\n`;
        }
        if (result.details) {
          report += `**Details:**\n\`\`\`json\n${JSON.stringify(result.details, null, 2)}\n\`\`\`\n\n`;
        }
      }
    }

    report += `## All Checks\n\n`;
    for (const result of results) {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
      report += `### ${icon} ${result.component}\n\n`;
      report += `**Status:** ${result.status.toUpperCase()}\n\n`;
      report += `**Message:** ${result.message}\n\n`;
      if (result.remediation) {
        report += `**Action:** ${result.remediation}\n\n`;
      }
    }

    return report;
  }

  formatDiagnosticReportJson(results: DiagnosticResult[]): string {
    const timestamp = new Date().toISOString();
    const summary = {
      timestamp,
      total: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      warnings: results.filter(r => r.status === 'warn').length,
      failed: results.filter(r => r.status === 'fail').length
    };

    const report = {
      summary,
      results
    };

    return JSON.stringify(report, null, 2);
  }

  // Helper methods for system dependency checking
  private getSystemEnvironment(): SystemEnvironment {
    return {
      os: `${os.type()} ${os.release()}`,
      arch: os.arch(),
      nodeVersion: process.version,
      isDocker: this.isRunningInDocker(),
      isHeadless: this.isHeadlessEnvironment()
    };
  }

  private async getBrowserInfo(): Promise<BrowserInfo> {
    // Check for custom executable path first
    const customPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (customPath && fs.existsSync(customPath)) {
      const version = await this.getBrowserVersion(customPath);
      return {
        available: true,
        path: customPath,
    version: version || 'unknown',
    launchable: true, // Will be tested in browser validation
    source: 'env'
      };
    }

    // Try to find system Chrome/Chromium
    const browserPaths = this.getSystemBrowserPaths();
    for (const browserPath of browserPaths) {
      if (fs.existsSync(browserPath)) {
        const version = await this.getBrowserVersion(browserPath);
        return {
          available: true,
          path: browserPath,
          version: version || 'unknown',
          launchable: true, // Will be tested in browser validation
          source: 'system'
        };
      }
    }

    // Try PATH/which resolution on Unix-like systems
    if (os.platform() !== 'win32') {
      const candidates = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome'];
      for (const bin of candidates) {
        try {
          const resolved = execSync(`which ${bin}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
          if (resolved && fs.existsSync(resolved)) {
            const version = await this.getBrowserVersion(resolved);
            return {
              available: true,
              path: resolved,
              version: version || 'unknown',
              launchable: true,
              source: 'system'
            };
          }
        } catch {
          // continue
        }
      }
    }

    // Check if Puppeteer's bundled Chromium is available
    try {
      const puppeteer = await import('puppeteer');
      const browserPath = puppeteer.executablePath();
    if (fs.existsSync(browserPath)) {
        const version = await this.getBrowserVersion(browserPath);
        return {
          available: true,
          path: browserPath,
      version: version || 'unknown',
      launchable: true,
      source: 'bundled'
        };
      }
    } catch (error) {
      // Puppeteer not available or no bundled browser
    }

    return {
  available: false,
  path: '',
  version: '',
  launchable: false,
  source: 'unknown'
    };
  }

  private getSystemBrowserPaths(): string[] {
    const platform = os.platform();

    switch (platform) {
      case 'win32':
        return [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files\\Chromium\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe'
        ];
      case 'darwin':
        return [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium'
        ];
      case 'linux':
      default:
        return [
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
          '/snap/bin/chromium',
          '/usr/bin/chrome'
        ];
    }
  }

  private async getBrowserVersion(browserPath: string): Promise<string | null> {
    // Avoid launching the browser UI on Windows just to get the version.
    // Prefer querying the Registry instead of executing the binary.
    if (os.platform() === 'win32') {
      const regVersion = this.getWindowsBrowserVersionFromRegistry();
      if (regVersion) return regVersion;
      const fileVersion = this.getWindowsExecutableProductVersion(browserPath);
      if (fileVersion) return fileVersion;

      // As a very last resort on Windows, do not spawn the UI: return null instead of executing the binary.
      // The actual launch/validation paths use headless Puppeteer and will verify the browser.
      return null;
    }

    try {
      const result = execSync(`"${browserPath}" --version`, {
        encoding: 'utf8',
        timeout: 5000,
        stdio: ['ignore', 'pipe', 'ignore']
      });
      return result.trim();
    } catch (error) {
      return null;
    }
  }

  // Windows-only: Query common registry keys for Chrome/Chromium version to avoid launching the UI
  private getWindowsBrowserVersionFromRegistry(): string | null {
    const keys = [
      'HKLM\\Software\\Google\\Chrome\\BLBeacon',
      'HKLM\\Software\\WOW6432Node\\Google\\Chrome\\BLBeacon',
      'HKCU\\Software\\Google\\Chrome\\BLBeacon',
      'HKLM\\Software\\Chromium\\BLBeacon',
      'HKLM\\Software\\WOW6432Node\\Chromium\\BLBeacon',
      'HKCU\\Software\\Chromium\\BLBeacon'
    ];

    for (const key of keys) {
      const version = this.queryWindowsRegistryVersion(key);
      if (version) return version;
    }

    return null;
  }

  private queryWindowsRegistryVersion(key: string): string | null {
    try {
      const cmd = `reg query "${key}" /v version`;
  const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 });
      // Expected line contains: version    REG_SZ    116.0.x.y
      const match = out.match(/\bversion\b\s+REG_\w+\s+([^\r\n]+)/i);
      return match ? match[1].trim() : null;
    } catch {
      return null;
    }
  }

  // Windows-only: Query ProductVersion from the executable metadata via PowerShell without launching the UI
  private getWindowsExecutableProductVersion(executablePath: string): string | null {
    try {
      const cmd = `powershell -NoProfile -Command "(Get-Item '${executablePath}').VersionInfo.ProductVersion"`;
  const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 });
      const v = out.trim();
      return v || null;
    } catch {
      return null;
    }
  }

  private checkDisplayServer(): DiagnosticResult {
    const platform = os.platform();

    if (platform === 'win32' || platform === 'darwin') {
      return {
        status: 'pass',
        component: 'display-server',
        message: 'Display server available (native GUI)',
        details: { platform, hasDisplay: true }
      };
    }

    // Linux - check for display server
    const display = process.env.DISPLAY;
    const waylandDisplay = process.env.WAYLAND_DISPLAY;

    if (display || waylandDisplay) {
      return {
        status: 'pass',
        component: 'display-server',
        message: `Display server available (${display ? 'X11' : 'Wayland'})`,
        details: { platform, display, waylandDisplay, hasDisplay: true }
      };
    }

    // Check if Xvfb is available for headless operation
    try {
      execSync('which Xvfb', { stdio: 'ignore' });
      return {
        status: 'warn',
        component: 'display-server',
        message: 'No display server detected, but Xvfb is available',
        remediation: 'Consider running with Xvfb for headless operation',
        details: { platform, hasXvfb: true, hasDisplay: false }
      };
    } catch (error) {
      return {
        status: 'fail',
        component: 'display-server',
        message: 'No display server or Xvfb found',
        remediation: 'Install Xvfb for headless operation: apt-get install xvfb',
        details: { platform, hasXvfb: false, hasDisplay: false }
      };
    }
  }

  private checkFontAvailability(): DiagnosticResult {
    const platform = os.platform();
    const fonts: string[] = [];
    let fontDirs: string[] = [];

    switch (platform) {
      case 'win32':
        fontDirs = ['C:\\Windows\\Fonts'];
        break;
      case 'darwin':
        fontDirs = ['/System/Library/Fonts', '/Library/Fonts'];
        break;
      case 'linux':
      default:
        fontDirs = ['/usr/share/fonts', '/usr/local/share/fonts', '/home/*/.fonts'];
        break;
    }

    let totalFonts = 0;
    for (const fontDir of fontDirs) {
      try {
        if (fs.existsSync(fontDir)) {
          const fontFiles = this.getFontFiles(fontDir);
          totalFonts += fontFiles.length;
          fonts.push(...fontFiles.slice(0, 5)); // Sample first 5 fonts
        }
      } catch (error) {
        // Ignore errors accessing font directories
      }
    }

    if (totalFonts > 0) {
      return {
        status: 'pass',
        component: 'font-availability',
        message: `Found ${totalFonts} font files`,
        details: { totalFonts, sampleFonts: fonts, platform }
      };
    } else {
      return {
        status: 'warn',
        component: 'font-availability',
        message: 'No fonts found in standard directories',
        remediation: 'Install system fonts for better rendering quality',
        details: { totalFonts: 0, checkedDirs: fontDirs, platform }
      };
    }
  }

  private getFontFiles(dir: string): string[] {
    try {
      const files = fs.readdirSync(dir);
      return files.filter(file =>
        file.toLowerCase().endsWith('.ttf') ||
        file.toLowerCase().endsWith('.otf') ||
        file.toLowerCase().endsWith('.woff') ||
        file.toLowerCase().endsWith('.woff2')
      );
    } catch (error) {
      return [];
    }
  }

  private isRunningInDocker(): boolean {
    try {
      // Check for .dockerenv file
      if (fs.existsSync('/.dockerenv')) {
        return true;
      }

      // Check cgroup for docker
      const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
      return cgroup.includes('docker') || cgroup.includes('containerd');
    } catch (error) {
      return false;
    }
  }

  private isHeadlessEnvironment(): boolean {
    const platform = os.platform();

    if (platform === 'win32' || platform === 'darwin') {
      return false; // Assume GUI available on Windows/macOS
    }

    // Linux - check for display
    return !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY;
  }

  // Helper methods for browser validation and testing
  private async testBasicBrowserLaunch(browserInfo: BrowserInfo): Promise<DiagnosticResult> {
    try {
      const puppeteer = await import('puppeteer');

      const launchOptions = this.buildLaunchOptions(browserInfo, ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']);
      // Force using Puppeteer's bundled Chromium and pipe mode to avoid port/policy issues
      try { launchOptions.executablePath = puppeteer.executablePath(); } catch { /* ignore */ }
      launchOptions.pipe = true;
      const baseArgs = Array.isArray(launchOptions.args) ? launchOptions.args : [];
      if (!baseArgs.some(a => a.startsWith('--remote-debugging-port'))) {
        launchOptions.args = [...baseArgs, '--remote-debugging-port=0'];
      }
  launchOptions.timeout = 15000;
      if (process.env.PRINTEER_DOCTOR_VERBOSE) {
        // Minimal structured trace
        console.log(JSON.stringify({ doctorTrace: true, step: 'launch-basic', headless: launchOptions.headless, exe: launchOptions.executablePath, args: launchOptions.args }));
      }
      const browser = await puppeteer.launch(launchOptions);

      // Test basic page creation
      const page = await browser.newPage();
      await page.goto('data:text/html,<h1>Test</h1>', { waitUntil: 'load' });
      const title = await page.title();

      await browser.close();

      return {
        status: 'pass',
        component: 'browser-basic-launch',
        message: 'Basic browser launch successful',
        details: { browserPath: browserInfo.path, source: browserInfo.source, testTitle: title }
      };
    } catch (error) {
      return {
        status: 'fail',
        component: 'browser-basic-launch',
        message: `Basic browser launch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        remediation: 'Check browser installation and system permissions',
        details: { browserPath: browserInfo.path, source: browserInfo.source, error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async testFallbackConfigurations(browserInfo: BrowserInfo): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    // Test different browser configurations
    const configurations = [
      {
        name: 'standard',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      },
      {
        name: 'minimal',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
      },
      {
        name: 'container-optimized',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      }
    ];

    for (const config of configurations) {
      const result = await this.testBrowserConfiguration(browserInfo, config);
      results.push(result);
    }

    return results;
  }

  private async testBrowserConfiguration(
    browserInfo: BrowserInfo,
    config: { name: string; args: string[] }
  ): Promise<DiagnosticResult> {
    try {
      const puppeteer = await import('puppeteer');

      const launchOptions = this.buildLaunchOptions(browserInfo, config.args);
      // Force bundled Chromium and pipe mode
      try { launchOptions.executablePath = puppeteer.executablePath(); } catch { /* ignore */ }
      launchOptions.pipe = true;
      const baseArgs = Array.isArray(launchOptions.args) ? launchOptions.args : [];
      if (!baseArgs.some(a => a.startsWith('--remote-debugging-port'))) {
        launchOptions.args = [...baseArgs, '--remote-debugging-port=0'];
      }
      launchOptions.timeout = 12000;
      if (process.env.PRINTEER_DOCTOR_VERBOSE) {
        console.log(JSON.stringify({ doctorTrace: true, step: 'launch-config', name: config.name, headless: launchOptions.headless, exe: launchOptions.executablePath, args: launchOptions.args }));
      }
      const browser = await puppeteer.launch(launchOptions);

      const page = await browser.newPage();
      await page.goto('data:text/html,<h1>Config Test</h1>', {
        waitUntil: 'load',
        timeout: 5000
      });

      await browser.close();

      return {
        status: 'pass',
        component: `browser-config-${config.name}`,
        message: `Browser configuration '${config.name}' works`,
        details: { configuration: config.name, args: config.args, browserPath: browserInfo.path, source: browserInfo.source }
      };
    } catch (error) {
      return {
        status: 'fail',
        component: `browser-config-${config.name}`,
        message: `Browser configuration '${config.name}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          configuration: config.name,
          args: config.args,
          browserPath: browserInfo.path,
          source: browserInfo.source,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private checkBrowserVersionCompatibility(browserInfo: BrowserInfo): DiagnosticResult {
    if (!browserInfo.version) {
      return {
        status: 'warn',
        component: 'browser-version',
        message: 'Could not determine browser version',
        remediation: 'Ensure browser is properly installed and accessible'
      };
    }

    // Extract version number from version string
    const versionMatch = browserInfo.version.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!versionMatch) {
      return {
        status: 'warn',
        component: 'browser-version',
        message: `Unknown version format: ${browserInfo.version}`,
        details: { version: browserInfo.version }
      };
    }

    const majorVersion = parseInt(versionMatch[1], 10);

    // Chrome/Chromium version compatibility check
    // Puppeteer generally supports Chrome 70+ (released in 2018)
    if (majorVersion >= 70) {
      return {
        status: 'pass',
        component: 'browser-version',
        message: `Browser version ${browserInfo.version} is compatible`,
        details: { version: browserInfo.version, majorVersion }
      };
    } else {
      return {
        status: 'warn',
        component: 'browser-version',
        message: `Browser version ${browserInfo.version} may be too old`,
        remediation: 'Consider updating to Chrome/Chromium 70 or newer',
        details: { version: browserInfo.version, majorVersion, minimumSupported: 70 }
      };
    }
  }

  private async testSandboxCapabilities(browserInfo: BrowserInfo): Promise<DiagnosticResult> {
    const platform = os.platform();
    const isRoot = this.isCurrentUserRoot();

    // Test sandbox capabilities based on environment
    if (platform === 'linux' && isRoot) {
      return {
        status: 'warn',
        component: 'browser-sandbox',
        message: 'Running as root - sandbox disabled for security',
        remediation: 'Run as non-root user for better security, or use --no-sandbox flag',
        details: { platform, isRoot, sandboxDisabled: true }
      };
    }

    // Test if browser can run with sandbox enabled
    try {
      const puppeteer = await import('puppeteer');

      const launchOptions = this.buildLaunchOptions(browserInfo, []);
      try { launchOptions.executablePath = puppeteer.executablePath(); } catch { /* ignore */ }
      launchOptions.pipe = true;
      const baseArgs = Array.isArray(launchOptions.args) ? launchOptions.args : [];
      if (!baseArgs.some(a => a.startsWith('--remote-debugging-port'))) {
        launchOptions.args = [...baseArgs, '--remote-debugging-port=0'];
      }
      launchOptions.timeout = 12000;
      if (process.env.PRINTEER_DOCTOR_VERBOSE) {
        console.log(JSON.stringify({ doctorTrace: true, step: 'launch-sandbox', mode: 'with-sandbox', headless: launchOptions.headless, exe: launchOptions.executablePath, args: launchOptions.args }));
      }
      const browser = await puppeteer.launch(launchOptions);

      await browser.close();

      return {
        status: 'pass',
        component: 'browser-sandbox',
        message: 'Browser sandbox is working correctly',
        details: { platform, isRoot, sandboxEnabled: true, browserPath: browserInfo.path, source: browserInfo.source }
      };
    } catch (error) {
      // Try with sandbox disabled
      try {
        const puppeteer = await import('puppeteer');

        const launchOptions = this.buildLaunchOptions(browserInfo, ['--no-sandbox', '--disable-setuid-sandbox']);
        try { launchOptions.executablePath = puppeteer.executablePath(); } catch { /* ignore */ }
        launchOptions.pipe = true;
        const baseArgs2 = Array.isArray(launchOptions.args) ? launchOptions.args : [];
        if (!baseArgs2.some(a => a.startsWith('--remote-debugging-port'))) {
          launchOptions.args = [...baseArgs2, '--remote-debugging-port=0'];
        }
        launchOptions.timeout = 12000;
        if (process.env.PRINTEER_DOCTOR_VERBOSE) {
          console.log(JSON.stringify({ doctorTrace: true, step: 'launch-sandbox', mode: 'no-sandbox', headless: launchOptions.headless, exe: launchOptions.executablePath, args: launchOptions.args }));
        }
        const browser = await puppeteer.launch(launchOptions);

        await browser.close();

    return {
          status: 'warn',
          component: 'browser-sandbox',
          message: 'Browser requires sandbox to be disabled',
          remediation: 'This is normal in Docker containers or when running as root',
          details: {
            platform,
            isRoot,
            sandboxEnabled: false,
      browserPath: browserInfo.path,
      source: browserInfo.source,
            sandboxError: error instanceof Error ? error.message : 'Unknown error'
          }
        };
      } catch (fallbackError) {
        return {
          status: 'fail',
          component: 'browser-sandbox',
          message: 'Browser cannot launch with or without sandbox',
          remediation: 'Check browser installation and system configuration',
          details: {
            platform,
            isRoot,
      browserPath: browserInfo.path,
      source: browserInfo.source,
            sandboxError: error instanceof Error ? error.message : 'Unknown error',
            fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
          }
        };
      }
    }
  }

  private checkPlatformCompatibility(): DiagnosticResult {
    const platform = os.platform();
    const arch = os.arch();

    const supportedPlatforms = ['linux', 'win32', 'darwin'];
    const supportedArchs = ['x64', 'arm64'];

    if (!supportedPlatforms.includes(platform)) {
      return {
        status: 'fail',
        component: 'platform-compatibility',
        message: `Unsupported platform: ${platform}`,
        remediation: 'Printeer supports Linux, Windows, and macOS',
        details: { platform, arch, supportedPlatforms }
      };
    }

    if (!supportedArchs.includes(arch)) {
      return {
        status: 'warn',
        component: 'platform-compatibility',
        message: `Architecture ${arch} may not be fully supported`,
        remediation: 'x64 and arm64 architectures are recommended',
        details: { platform, arch, supportedArchs }
      };
    }

    return {
      status: 'pass',
      component: 'platform-compatibility',
      message: `Platform ${platform} ${arch} is supported`,
      details: { platform, arch }
    };
  }

  private checkPermissions(): DiagnosticResult {
    const permissions: string[] = [];
    const issues: string[] = [];

    // Check file system permissions
    try {
      const tempDir = os.tmpdir();
      const testFile = path.join(tempDir, 'printeer-test-' + Date.now());
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      permissions.push('filesystem-write');
    } catch (error) {
      issues.push('Cannot write to temporary directory');
    }

    // Check if running as root (security concern)
    const isRoot = this.isCurrentUserRoot();
    if (isRoot) {
      issues.push('Running as root user (security risk)');
    } else {
      permissions.push('non-root-user');
    }

    // Check process permissions
    try {
      if (process.getuid && process.getgid) {
        permissions.push('process-info-access');
      }
    } catch (error) {
      // Not available on Windows
    }

    if (issues.length > 0) {
      return {
        status: 'warn',
        component: 'permissions',
        message: `Permission issues detected: ${issues.join(', ')}`,
        remediation: 'Run with appropriate user permissions',
        details: { permissions, issues, isRoot }
      };
    }

    return {
      status: 'pass',
      component: 'permissions',
      message: 'System permissions are adequate',
      details: { permissions, isRoot }
    };
  }

  private checkResourceAvailability(): DiagnosticResult {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const cpuCores = os.cpus().length;

    const memoryGB = totalMemory / (1024 * 1024 * 1024);
    const freeMemoryGB = freeMemory / (1024 * 1024 * 1024);

    const issues: string[] = [];

    // Check minimum memory requirements (1GB total, 512MB free)
    if (memoryGB < 1) {
      issues.push('Low total memory (< 1GB)');
    }

    if (freeMemoryGB < 0.5) {
      issues.push('Low available memory (< 512MB)');
    }

    // Check CPU cores
    if (cpuCores < 2) {
      issues.push('Single CPU core may impact performance');
    }

    const status = issues.length > 0 ? 'warn' : 'pass';
    const message = issues.length > 0
      ? `Resource constraints detected: ${issues.join(', ')}`
      : `System resources adequate: ${memoryGB.toFixed(1)}GB RAM, ${cpuCores} CPU cores`;

    return {
      status,
      component: 'resource-availability',
      message,
      remediation: issues.length > 0 ? 'Consider increasing available system resources' : undefined,
      details: {
        totalMemoryGB: parseFloat(memoryGB.toFixed(2)),
        freeMemoryGB: parseFloat(freeMemoryGB.toFixed(2)),
        cpuCores,
        issues
      }
    };
  }

  private async checkNetworkConnectivity(): Promise<DiagnosticResult> {
    // Basic network connectivity test
    try {
      // Test if we can resolve DNS
      const dns = await import('dns');
      await new Promise((resolve, reject) => {
        dns.lookup('google.com', (err) => {
          if (err) reject(err);
          else resolve(true);
        });
      });

      return {
        status: 'pass',
        component: 'network-connectivity',
        message: 'Basic network connectivity available',
        details: { dnsResolution: true }
      };
    } catch (error) {
      return {
        status: 'warn',
        component: 'network-connectivity',
        message: 'Network connectivity issues detected',
        remediation: 'Check network configuration for web content loading',
        details: {
          dnsResolution: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private isCurrentUserRoot(): boolean {
    try {
      if (process && process.getuid) {
        return process.getuid() === 0; // UID 0 is always root
      }

      if (os.userInfo().username === 'root') {
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }
}