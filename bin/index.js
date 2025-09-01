#!/usr/bin/env node

// src/printeer.ts
import puppeteer from "puppeteer";
import { normalize } from "path";

// src/utils.ts
import * as os from "os";
var getDefaultBrowserOptions = function() {
  const launchOptions = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };
  const exePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (exePath) {
    launchOptions.executablePath = exePath;
  }
  return launchOptions;
};

// src/printeer.ts
var printeer_default = async (url, outputFile, outputType = null, browserOptions) => {
  getPackageJson();
  outputFile = normalize(outputFile);
  if (!url.startsWith("http")) {
    throw new Error("URL must start with http or https");
  }
  let launchOptions = getDefaultBrowserOptions();
  if (browserOptions) {
    launchOptions = { ...launchOptions, ...browserOptions };
  }
  const exePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (exePath) {
    launchOptions.executablePath = exePath;
  }
  let res = null;
  let page = null;
  let browser = null;
  try {
    browser = await puppeteer.launch(launchOptions);
    page = await browser.newPage();
    res = await page.goto(url, { waitUntil: "networkidle0" });
  } catch (err) {
    console.error("Browser Launch Error:", err);
    console.error("Browser Launch Options:", launchOptions);
    throw err;
  }
  if (!res) {
    throw new Error("Could not load the page.");
  }
  outputType = detectOutputType(outputFile, outputType);
  if (res.status() !== 200) {
    throw new Error(`Error: ${res.status()}: ${res.statusText()}`);
  }
  try {
    if (outputType === "png") {
      await page.screenshot({ path: outputFile });
    } else {
      await page.pdf({ format: "A4", path: outputFile });
    }
    outputFile = normalize(outputFile);
    return outputFile;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
function getPackageJson() {
  console.log("Process exec path", process.execPath);
}
function detectOutputType(fname, outputType) {
  const validOutputTypes = ["pdf", "png"];
  if (!outputType) {
    const ext = fname.split(".").pop();
    if (!ext) {
      return "pdf";
    }
    if (validOutputTypes.includes(ext)) {
      return ext;
    }
    return "pdf";
  }
  if (!validOutputTypes.includes(outputType)) {
    return "pdf";
  }
  return outputType;
}

// src/usage.ts
var usage_default = () => {
  console.log(`
printeer - Web-to-PDF/PNG conversion utility

USAGE:
  printeer <url> <outputFile>        # Convert web page to PDF/PNG
  printeer doctor [OPTIONS]          # Run system diagnostics
  printeer help                      # Show this help message
  printeer version                   # Show version information

COMMANDS:
  doctor                             # System diagnostics and health checks
    --verbose, -v                    # Show detailed diagnostic information
    --json                           # Output results in JSON format
    --help, -h                       # Show doctor command help

EXAMPLES:
  printeer https://example.com output.pdf     # Convert to PDF
  printeer https://example.com output.png     # Convert to PNG
  printeer doctor                             # Check system health
  printeer doctor --verbose                   # Detailed diagnostics
  printeer doctor --json                      # JSON output

For more information, visit: https://github.com/maniartech/printeer
`);
};

// src/core/doctor.ts
import * as os2 from "os";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
var DefaultDoctorModule = class {
  async runFullDiagnostics() {
    const results = [];
    const systemDeps = await this.checkSystemDependencies();
    const browserValidation = await this.validateBrowserInstallation();
    const envCompatibility = await this.checkEnvironmentCompatibility();
    results.push(...systemDeps);
    results.push(...browserValidation);
    results.push(...envCompatibility);
    return results;
  }
  async checkSystemDependencies() {
    const results = [];
    const systemInfo = this.getSystemEnvironment();
    results.push({
      status: "pass",
      component: "system-info",
      message: `System: ${systemInfo.os} ${systemInfo.arch}, Node.js ${systemInfo.nodeVersion}`,
      details: systemInfo
    });
    const browserInfo = await this.getBrowserInfo();
    if (browserInfo.available) {
      results.push({
        status: "pass",
        component: "browser-availability",
        message: `Browser found at: ${browserInfo.path}`,
        details: browserInfo
      });
    } else {
      results.push({
        status: "fail",
        component: "browser-availability",
        message: "No suitable browser found",
        remediation: "Install Chrome/Chromium or set PUPPETEER_EXECUTABLE_PATH environment variable",
        details: browserInfo
      });
    }
    const displayServerResult = this.checkDisplayServer();
    results.push(displayServerResult);
    const fontResult = this.checkFontAvailability();
    results.push(fontResult);
    return results;
  }
  async validateBrowserInstallation() {
    const results = [];
    const browserInfo = await this.getBrowserInfo();
    if (!browserInfo.available) {
      results.push({
        status: "fail",
        component: "browser-installation",
        message: "No browser installation found",
        remediation: "Install Chrome/Chromium or set PUPPETEER_EXECUTABLE_PATH",
        details: browserInfo
      });
      return results;
    }
    const launchResult = await this.testBrowserLaunch();
    results.push(launchResult);
    const versionResult = this.checkBrowserVersionCompatibility(browserInfo);
    results.push(versionResult);
    const sandboxResult = await this.testSandboxCapabilities(browserInfo);
    results.push(sandboxResult);
    return results;
  }
  async testBrowserLaunch() {
    const browserInfo = await this.getBrowserInfo();
    if (!browserInfo.available) {
      return {
        status: "fail",
        component: "browser-launch",
        message: "Cannot test browser launch - no browser available",
        remediation: "Install a compatible browser first"
      };
    }
    const basicLaunchResult = await this.testBasicBrowserLaunch(browserInfo);
    const fallbackResults = await this.testFallbackConfigurations(browserInfo);
    const allResults = [basicLaunchResult, ...fallbackResults];
    const passedConfigs = allResults.filter((r) => r.status === "pass");
    if (passedConfigs.length === 0) {
      return {
        status: "fail",
        component: "browser-launch",
        message: "All browser launch configurations failed",
        remediation: "Check browser installation and system permissions",
        details: {
          basicLaunchResult,
          fallbackResults,
          allResults
        }
      };
    }
    return {
      status: "pass",
      component: "browser-launch",
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
  async checkEnvironmentCompatibility() {
    const results = [];
    const platformResult = this.checkPlatformCompatibility();
    results.push(platformResult);
    const permissionsResult = this.checkPermissions();
    results.push(permissionsResult);
    const resourceResult = this.checkResourceAvailability();
    results.push(resourceResult);
    const networkResult = await this.checkNetworkConnectivity();
    results.push(networkResult);
    return results;
  }
  async generateReport() {
    const results = await this.runFullDiagnostics();
    const report = this.formatDiagnosticReport(results);
    return report;
  }
  formatDiagnosticReport(results) {
    const timestamp = new Date().toISOString();
    const passCount = results.filter((r) => r.status === "pass").length;
    const warnCount = results.filter((r) => r.status === "warn").length;
    const failCount = results.filter((r) => r.status === "fail").length;
    let report = `# Printeer System Diagnostic Report

`;
    report += `Generated: ${timestamp}

`;
    report += `## Summary

`;
    report += `- \u2705 Passed: ${passCount}
`;
    report += `- \u26A0\uFE0F  Warnings: ${warnCount}
`;
    report += `- \u274C Failed: ${failCount}

`;
    if (failCount > 0) {
      report += `## Critical Issues

`;
      const failedResults = results.filter((r) => r.status === "fail");
      for (const result of failedResults) {
        report += `### \u274C ${result.component}

`;
        report += `**Issue:** ${result.message}

`;
        if (result.remediation) {
          report += `**Solution:** ${result.remediation}

`;
        }
        if (result.details) {
          report += `**Details:**
\`\`\`json
${JSON.stringify(result.details, null, 2)}
\`\`\`

`;
        }
      }
    }
    if (warnCount > 0) {
      report += `## Warnings

`;
      const warnResults = results.filter((r) => r.status === "warn");
      for (const result of warnResults) {
        report += `### \u26A0\uFE0F ${result.component}

`;
        report += `**Issue:** ${result.message}

`;
        if (result.remediation) {
          report += `**Recommendation:** ${result.remediation}

`;
        }
        if (result.details) {
          report += `**Details:**
\`\`\`json
${JSON.stringify(result.details, null, 2)}
\`\`\`

`;
        }
      }
    }
    report += `## All Checks

`;
    for (const result of results) {
      const icon = result.status === "pass" ? "\u2705" : result.status === "warn" ? "\u26A0\uFE0F" : "\u274C";
      report += `### ${icon} ${result.component}

`;
      report += `**Status:** ${result.status.toUpperCase()}

`;
      report += `**Message:** ${result.message}

`;
      if (result.remediation) {
        report += `**Action:** ${result.remediation}

`;
      }
    }
    return report;
  }
  formatDiagnosticReportJson(results) {
    const timestamp = new Date().toISOString();
    const summary = {
      timestamp,
      total: results.length,
      passed: results.filter((r) => r.status === "pass").length,
      warnings: results.filter((r) => r.status === "warn").length,
      failed: results.filter((r) => r.status === "fail").length
    };
    const report = {
      summary,
      results
    };
    return JSON.stringify(report, null, 2);
  }
  getSystemEnvironment() {
    return {
      os: `${os2.type()} ${os2.release()}`,
      arch: os2.arch(),
      nodeVersion: process.version,
      isDocker: this.isRunningInDocker(),
      isHeadless: this.isHeadlessEnvironment()
    };
  }
  async getBrowserInfo() {
    const customPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (customPath && fs.existsSync(customPath)) {
      const version = await this.getBrowserVersion(customPath);
      return {
        available: true,
        path: customPath,
        version: version || "unknown",
        launchable: true
      };
    }
    const browserPaths = this.getSystemBrowserPaths();
    for (const browserPath of browserPaths) {
      if (fs.existsSync(browserPath)) {
        const version = await this.getBrowserVersion(browserPath);
        return {
          available: true,
          path: browserPath,
          version: version || "unknown",
          launchable: true
        };
      }
    }
    try {
      const puppeteer2 = await import("puppeteer");
      const browserPath = puppeteer2.executablePath();
      if (fs.existsSync(browserPath)) {
        const version = await this.getBrowserVersion(browserPath);
        return {
          available: true,
          path: browserPath,
          version: version || "unknown",
          launchable: true
        };
      }
    } catch (error) {
    }
    return {
      available: false,
      path: "",
      version: "",
      launchable: false
    };
  }
  getSystemBrowserPaths() {
    const platform2 = os2.platform();
    switch (platform2) {
      case "win32":
        return [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files\\Chromium\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe"
        ];
      case "darwin":
        return [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Chromium.app/Contents/MacOS/Chromium"
        ];
      case "linux":
      default:
        return [
          "/usr/bin/google-chrome",
          "/usr/bin/google-chrome-stable",
          "/usr/bin/chromium",
          "/usr/bin/chromium-browser",
          "/snap/bin/chromium",
          "/usr/bin/chrome"
        ];
    }
  }
  async getBrowserVersion(browserPath) {
    try {
      const result = execSync(`"${browserPath}" --version`, {
        encoding: "utf8",
        timeout: 5e3,
        stdio: ["ignore", "pipe", "ignore"]
      });
      return result.trim();
    } catch (error) {
      return null;
    }
  }
  checkDisplayServer() {
    const platform2 = os2.platform();
    if (platform2 === "win32" || platform2 === "darwin") {
      return {
        status: "pass",
        component: "display-server",
        message: "Display server available (native GUI)",
        details: { platform: platform2, hasDisplay: true }
      };
    }
    const display = process.env.DISPLAY;
    const waylandDisplay = process.env.WAYLAND_DISPLAY;
    if (display || waylandDisplay) {
      return {
        status: "pass",
        component: "display-server",
        message: `Display server available (${display ? "X11" : "Wayland"})`,
        details: { platform: platform2, display, waylandDisplay, hasDisplay: true }
      };
    }
    try {
      execSync("which Xvfb", { stdio: "ignore" });
      return {
        status: "warn",
        component: "display-server",
        message: "No display server detected, but Xvfb is available",
        remediation: "Consider running with Xvfb for headless operation",
        details: { platform: platform2, hasXvfb: true, hasDisplay: false }
      };
    } catch (error) {
      return {
        status: "fail",
        component: "display-server",
        message: "No display server or Xvfb found",
        remediation: "Install Xvfb for headless operation: apt-get install xvfb",
        details: { platform: platform2, hasXvfb: false, hasDisplay: false }
      };
    }
  }
  checkFontAvailability() {
    const platform2 = os2.platform();
    const fonts = [];
    let fontDirs = [];
    switch (platform2) {
      case "win32":
        fontDirs = ["C:\\Windows\\Fonts"];
        break;
      case "darwin":
        fontDirs = ["/System/Library/Fonts", "/Library/Fonts"];
        break;
      case "linux":
      default:
        fontDirs = ["/usr/share/fonts", "/usr/local/share/fonts", "/home/*/.fonts"];
        break;
    }
    let totalFonts = 0;
    for (const fontDir of fontDirs) {
      try {
        if (fs.existsSync(fontDir)) {
          const fontFiles = this.getFontFiles(fontDir);
          totalFonts += fontFiles.length;
          fonts.push(...fontFiles.slice(0, 5));
        }
      } catch (error) {
      }
    }
    if (totalFonts > 0) {
      return {
        status: "pass",
        component: "font-availability",
        message: `Found ${totalFonts} font files`,
        details: { totalFonts, sampleFonts: fonts, platform: platform2 }
      };
    } else {
      return {
        status: "warn",
        component: "font-availability",
        message: "No fonts found in standard directories",
        remediation: "Install system fonts for better rendering quality",
        details: { totalFonts: 0, checkedDirs: fontDirs, platform: platform2 }
      };
    }
  }
  getFontFiles(dir) {
    try {
      const files = fs.readdirSync(dir);
      return files.filter(
        (file) => file.toLowerCase().endsWith(".ttf") || file.toLowerCase().endsWith(".otf") || file.toLowerCase().endsWith(".woff") || file.toLowerCase().endsWith(".woff2")
      );
    } catch (error) {
      return [];
    }
  }
  isRunningInDocker() {
    try {
      if (fs.existsSync("/.dockerenv")) {
        return true;
      }
      const cgroup = fs.readFileSync("/proc/1/cgroup", "utf8");
      return cgroup.includes("docker") || cgroup.includes("containerd");
    } catch (error) {
      return false;
    }
  }
  isHeadlessEnvironment() {
    const platform2 = os2.platform();
    if (platform2 === "win32" || platform2 === "darwin") {
      return false;
    }
    return !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY;
  }
  async testBasicBrowserLaunch(browserInfo) {
    try {
      const puppeteer2 = await import("puppeteer");
      const browser = await puppeteer2.launch({
        executablePath: browserInfo.path,
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
      });
      const page = await browser.newPage();
      await page.goto("data:text/html,<h1>Test</h1>", { waitUntil: "load" });
      const title = await page.title();
      await browser.close();
      return {
        status: "pass",
        component: "browser-basic-launch",
        message: "Basic browser launch successful",
        details: { browserPath: browserInfo.path, testTitle: title }
      };
    } catch (error) {
      return {
        status: "fail",
        component: "browser-basic-launch",
        message: `Basic browser launch failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        remediation: "Check browser installation and system permissions",
        details: { browserPath: browserInfo.path, error: error instanceof Error ? error.message : "Unknown error" }
      };
    }
  }
  async testFallbackConfigurations(browserInfo) {
    const results = [];
    const configurations = [
      {
        name: "standard",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      },
      {
        name: "minimal",
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
      },
      {
        name: "container-optimized",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor"
        ]
      }
    ];
    for (const config of configurations) {
      const result = await this.testBrowserConfiguration(browserInfo, config);
      results.push(result);
    }
    return results;
  }
  async testBrowserConfiguration(browserInfo, config) {
    try {
      const puppeteer2 = await import("puppeteer");
      const browser = await puppeteer2.launch({
        executablePath: browserInfo.path,
        headless: true,
        args: config.args,
        timeout: 1e4
      });
      const page = await browser.newPage();
      await page.goto("data:text/html,<h1>Config Test</h1>", {
        waitUntil: "load",
        timeout: 5e3
      });
      await browser.close();
      return {
        status: "pass",
        component: `browser-config-${config.name}`,
        message: `Browser configuration '${config.name}' works`,
        details: { configuration: config.name, args: config.args }
      };
    } catch (error) {
      return {
        status: "fail",
        component: `browser-config-${config.name}`,
        message: `Browser configuration '${config.name}' failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        details: {
          configuration: config.name,
          args: config.args,
          error: error instanceof Error ? error.message : "Unknown error"
        }
      };
    }
  }
  checkBrowserVersionCompatibility(browserInfo) {
    if (!browserInfo.version) {
      return {
        status: "warn",
        component: "browser-version",
        message: "Could not determine browser version",
        remediation: "Ensure browser is properly installed and accessible"
      };
    }
    const versionMatch = browserInfo.version.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!versionMatch) {
      return {
        status: "warn",
        component: "browser-version",
        message: `Unknown version format: ${browserInfo.version}`,
        details: { version: browserInfo.version }
      };
    }
    const majorVersion = parseInt(versionMatch[1], 10);
    if (majorVersion >= 70) {
      return {
        status: "pass",
        component: "browser-version",
        message: `Browser version ${browserInfo.version} is compatible`,
        details: { version: browserInfo.version, majorVersion }
      };
    } else {
      return {
        status: "warn",
        component: "browser-version",
        message: `Browser version ${browserInfo.version} may be too old`,
        remediation: "Consider updating to Chrome/Chromium 70 or newer",
        details: { version: browserInfo.version, majorVersion, minimumSupported: 70 }
      };
    }
  }
  async testSandboxCapabilities(browserInfo) {
    const platform2 = os2.platform();
    const isRoot = this.isCurrentUserRoot();
    if (platform2 === "linux" && isRoot) {
      return {
        status: "warn",
        component: "browser-sandbox",
        message: "Running as root - sandbox disabled for security",
        remediation: "Run as non-root user for better security, or use --no-sandbox flag",
        details: { platform: platform2, isRoot, sandboxDisabled: true }
      };
    }
    try {
      const puppeteer2 = await import("puppeteer");
      const browser = await puppeteer2.launch({
        executablePath: browserInfo.path,
        headless: true,
        args: [],
        timeout: 1e4
      });
      await browser.close();
      return {
        status: "pass",
        component: "browser-sandbox",
        message: "Browser sandbox is working correctly",
        details: { platform: platform2, isRoot, sandboxEnabled: true }
      };
    } catch (error) {
      try {
        const puppeteer2 = await import("puppeteer");
        const browser = await puppeteer2.launch({
          executablePath: browserInfo.path,
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          timeout: 1e4
        });
        await browser.close();
        return {
          status: "warn",
          component: "browser-sandbox",
          message: "Browser requires sandbox to be disabled",
          remediation: "This is normal in Docker containers or when running as root",
          details: {
            platform: platform2,
            isRoot,
            sandboxEnabled: false,
            sandboxError: error instanceof Error ? error.message : "Unknown error"
          }
        };
      } catch (fallbackError) {
        return {
          status: "fail",
          component: "browser-sandbox",
          message: "Browser cannot launch with or without sandbox",
          remediation: "Check browser installation and system configuration",
          details: {
            platform: platform2,
            isRoot,
            sandboxError: error instanceof Error ? error.message : "Unknown error",
            fallbackError: fallbackError instanceof Error ? fallbackError.message : "Unknown error"
          }
        };
      }
    }
  }
  checkPlatformCompatibility() {
    const platform2 = os2.platform();
    const arch2 = os2.arch();
    const supportedPlatforms = ["linux", "win32", "darwin"];
    const supportedArchs = ["x64", "arm64"];
    if (!supportedPlatforms.includes(platform2)) {
      return {
        status: "fail",
        component: "platform-compatibility",
        message: `Unsupported platform: ${platform2}`,
        remediation: "Printeer supports Linux, Windows, and macOS",
        details: { platform: platform2, arch: arch2, supportedPlatforms }
      };
    }
    if (!supportedArchs.includes(arch2)) {
      return {
        status: "warn",
        component: "platform-compatibility",
        message: `Architecture ${arch2} may not be fully supported`,
        remediation: "x64 and arm64 architectures are recommended",
        details: { platform: platform2, arch: arch2, supportedArchs }
      };
    }
    return {
      status: "pass",
      component: "platform-compatibility",
      message: `Platform ${platform2} ${arch2} is supported`,
      details: { platform: platform2, arch: arch2 }
    };
  }
  checkPermissions() {
    const permissions = [];
    const issues = [];
    try {
      const tempDir = os2.tmpdir();
      const testFile = path.join(tempDir, "printeer-test-" + Date.now());
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);
      permissions.push("filesystem-write");
    } catch (error) {
      issues.push("Cannot write to temporary directory");
    }
    const isRoot = this.isCurrentUserRoot();
    if (isRoot) {
      issues.push("Running as root user (security risk)");
    } else {
      permissions.push("non-root-user");
    }
    try {
      if (process.getuid && process.getgid) {
        permissions.push("process-info-access");
      }
    } catch (error) {
    }
    if (issues.length > 0) {
      return {
        status: "warn",
        component: "permissions",
        message: `Permission issues detected: ${issues.join(", ")}`,
        remediation: "Run with appropriate user permissions",
        details: { permissions, issues, isRoot }
      };
    }
    return {
      status: "pass",
      component: "permissions",
      message: "System permissions are adequate",
      details: { permissions, isRoot }
    };
  }
  checkResourceAvailability() {
    const totalMemory = os2.totalmem();
    const freeMemory = os2.freemem();
    const cpuCores = os2.cpus().length;
    const memoryGB = totalMemory / (1024 * 1024 * 1024);
    const freeMemoryGB = freeMemory / (1024 * 1024 * 1024);
    const issues = [];
    if (memoryGB < 1) {
      issues.push("Low total memory (< 1GB)");
    }
    if (freeMemoryGB < 0.5) {
      issues.push("Low available memory (< 512MB)");
    }
    if (cpuCores < 2) {
      issues.push("Single CPU core may impact performance");
    }
    const status = issues.length > 0 ? "warn" : "pass";
    const message = issues.length > 0 ? `Resource constraints detected: ${issues.join(", ")}` : `System resources adequate: ${memoryGB.toFixed(1)}GB RAM, ${cpuCores} CPU cores`;
    return {
      status,
      component: "resource-availability",
      message,
      remediation: issues.length > 0 ? "Consider increasing available system resources" : void 0,
      details: {
        totalMemoryGB: parseFloat(memoryGB.toFixed(2)),
        freeMemoryGB: parseFloat(freeMemoryGB.toFixed(2)),
        cpuCores,
        issues
      }
    };
  }
  async checkNetworkConnectivity() {
    try {
      const dns = await import("dns");
      await new Promise((resolve, reject) => {
        dns.lookup("google.com", (err) => {
          if (err)
            reject(err);
          else
            resolve(true);
        });
      });
      return {
        status: "pass",
        component: "network-connectivity",
        message: "Basic network connectivity available",
        details: { dnsResolution: true }
      };
    } catch (error) {
      return {
        status: "warn",
        component: "network-connectivity",
        message: "Network connectivity issues detected",
        remediation: "Check network configuration for web content loading",
        details: {
          dnsResolution: false,
          error: error instanceof Error ? error.message : "Unknown error"
        }
      };
    }
  }
  isCurrentUserRoot() {
    try {
      if (process && process.getuid) {
        return process.getuid() === 0;
      }
      if (os2.userInfo().username === "root") {
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
};

// src/cli.ts
(async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "doctor") {
    await handleDoctorCommand(args.slice(1));
    return;
  }
  if (args[0] === "help" || args[0] === "--help" || args[0] === "-h") {
    usage_default();
    return;
  }
  if (args[0] === "version" || args[0] === "--version" || args[0] === "-v") {
    try {
      const fs2 = await import("fs");
      const path2 = await import("path");
      const packagePath = path2.join(process.cwd(), "package.json");
      const packageContent = fs2.readFileSync(packagePath, "utf8");
      const packageJson = JSON.parse(packageContent);
      console.log(`printeer v${packageJson.version}`);
    } catch (error) {
      console.log("printeer (version unknown)");
    }
    return;
  }
  const url = args[0];
  const outputFile = args[1];
  if (!url || !outputFile) {
    usage_default();
    process.exit(1);
  }
  try {
    await printeer_default(url, outputFile, null, null);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
})();
async function handleDoctorCommand(args) {
  const json = args.includes("--json");
  const help = args.includes("--help") || args.includes("-h");
  if (help) {
    printDoctorUsage();
    return;
  }
  try {
    console.log("\u{1F50D} Running system diagnostics...\n");
    const doctorModule = new DefaultDoctorModule();
    const results = await doctorModule.runFullDiagnostics();
    if (json) {
      const jsonReport = doctorModule.formatDiagnosticReportJson(results);
      console.log(jsonReport);
    } else {
      const report = await doctorModule.generateReport();
      console.log(report);
    }
    const hasFailures = results.some((r) => r.status === "fail");
    const hasWarnings = results.some((r) => r.status === "warn");
    if (hasFailures) {
      console.error("\n\u274C Critical issues found. Please address the failures above.");
      process.exit(1);
    } else if (hasWarnings) {
      console.warn("\n\u26A0\uFE0F  Some warnings detected. Consider addressing them for optimal performance.");
      process.exit(0);
    } else {
      console.log("\n\u2705 All checks passed! Your system is ready for printeer.");
      process.exit(0);
    }
  } catch (error) {
    console.error("\u274C Error running diagnostics:", error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  }
}
function printDoctorUsage() {
  console.log(`
printeer doctor - System diagnostics and health checks

USAGE:
  printeer doctor [OPTIONS]

OPTIONS:
  --verbose, -v    Show detailed diagnostic information
  --json           Output results in JSON format
  --help, -h       Show this help message

DESCRIPTION:
  The doctor command runs comprehensive system diagnostics to ensure
  your environment is properly configured for printeer. It checks:
  
  \u2022 System dependencies (Node.js, OS compatibility)
  \u2022 Browser installation and availability
  \u2022 Display server configuration (for headless environments)
  \u2022 Font availability
  \u2022 System resources (memory, CPU)
  \u2022 Network connectivity
  \u2022 File system permissions
  \u2022 Environment-specific configurations

EXAMPLES:
  printeer doctor                    # Run basic diagnostics
  printeer doctor --verbose          # Show detailed information
  printeer doctor --json             # Output in JSON format
`);
}
//# sourceMappingURL=index.js.map
