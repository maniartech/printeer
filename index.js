var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/core/doctor.ts
var doctor_exports = {};
__export(doctor_exports, {
  DefaultDoctorModule: () => DefaultDoctorModule
});
import * as os2 from "os";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
var DefaultDoctorModule;
var init_doctor = __esm({
  "src/core/doctor.ts"() {
    "use strict";
    DefaultDoctorModule = class {
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
        const failedConfigs = allResults.filter((r) => r.status === "fail");
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
          await new Promise((resolve2, reject) => {
            dns.lookup("google.com", (err) => {
              if (err)
                reject(err);
              else
                resolve2(true);
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
  }
});

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
    await browser.close();
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

// src/types/errors.ts
var ErrorType = /* @__PURE__ */ ((ErrorType2) => {
  ErrorType2["CONFIGURATION"] = "configuration";
  ErrorType2["BROWSER_LAUNCH"] = "browser_launch";
  ErrorType2["PAGE_LOAD"] = "page_load";
  ErrorType2["RENDERING"] = "rendering";
  ErrorType2["RESOURCE_EXHAUSTION"] = "resource_exhaustion";
  ErrorType2["NETWORK"] = "network";
  ErrorType2["SECURITY"] = "security";
  ErrorType2["SYSTEM"] = "system";
  return ErrorType2;
})(ErrorType || {});

// src/core/config-manager.ts
import { readFile, access } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

// src/core/cli-config-loader.ts
var CliConfigLoader = class {
  static parseCliArgs(args = process.argv.slice(2)) {
    var _a, _b;
    const config = {};
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const nextArg = args[i + 1];
      switch (arg) {
        case "--mode":
          if (nextArg && ["single-shot", "long-running"].includes(nextArg)) {
            config.mode = nextArg;
            i++;
          }
          break;
        case "--environment":
        case "--env":
          if (nextArg && ["development", "production", "test"].includes(nextArg)) {
            config.environment = nextArg;
            i++;
          }
          break;
        case "--headless":
          if (nextArg === "auto") {
            config.browser = { ...config.browser, headless: "auto" };
            i++;
          } else {
            config.browser = { ...config.browser, headless: true };
          }
          break;
        case "--no-headless":
          config.browser = { ...config.browser, headless: false };
          break;
        case "--browser-timeout":
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.browser = { ...config.browser, timeout: parseInt(nextArg, 10) };
            i++;
          }
          break;
        case "--browser-executable":
          if (nextArg) {
            config.browser = { ...config.browser, executablePath: nextArg };
            i++;
          }
          break;
        case "--max-memory":
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.resources = { ...config.resources, maxMemoryMB: parseInt(nextArg, 10) };
            i++;
          }
          break;
        case "--max-cpu":
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.resources = { ...config.resources, maxCpuPercent: parseInt(nextArg, 10) };
            i++;
          }
          break;
        case "--max-concurrent":
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.resources = { ...config.resources, maxConcurrentRequests: parseInt(nextArg, 10) };
            i++;
          }
          break;
        case "--log-level":
          if (nextArg && ["error", "warn", "info", "debug"].includes(nextArg)) {
            config.logging = { ...config.logging, level: nextArg };
            i++;
          }
          break;
        case "--log-format":
          if (nextArg && ["json", "text"].includes(nextArg)) {
            config.logging = { ...config.logging, format: nextArg };
            i++;
          }
          break;
        case "--log-destination":
          if (nextArg && ["console", "file", "both"].includes(nextArg)) {
            config.logging = { ...config.logging, destination: nextArg };
            i++;
          }
          break;
        case "--allowed-domains":
          if (nextArg) {
            config.security = {
              ...config.security,
              allowedDomains: nextArg.split(",").map((d) => d.trim())
            };
            i++;
          }
          break;
        case "--blocked-domains":
          if (nextArg) {
            config.security = {
              ...config.security,
              blockedDomains: nextArg.split(",").map((d) => d.trim())
            };
            i++;
          }
          break;
        case "--cooling-period":
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.longRunning = { ...config.longRunning, coolingPeriodMs: parseInt(nextArg, 10) };
            i++;
          }
          break;
        case "--max-uptime":
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.longRunning = { ...config.longRunning, maxUptime: parseInt(nextArg, 10) };
            i++;
          }
          break;
        case "--pool-min":
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.browser = {
              ...config.browser,
              pool: { ...(_a = config.browser) == null ? void 0 : _a.pool, min: parseInt(nextArg, 10) }
            };
            i++;
          }
          break;
        case "--pool-max":
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.browser = {
              ...config.browser,
              pool: { ...(_b = config.browser) == null ? void 0 : _b.pool, max: parseInt(nextArg, 10) }
            };
            i++;
          }
          break;
        case "--verbose":
        case "-v":
          config.logging = { ...config.logging, level: "debug" };
          break;
        case "--quiet":
        case "-q":
          config.logging = { ...config.logging, level: "error" };
          break;
        case "--production":
          config.environment = "production";
          break;
        case "--development":
          config.environment = "development";
          break;
        case "--test":
          config.environment = "test";
          break;
      }
    }
    return config;
  }
  static getHelpText() {
    return `
Configuration Options:
  --mode <mode>              Operation mode: single-shot, long-running
  --environment <env>        Environment: development, production, test
  --env <env>                Alias for --environment
  
Browser Options:
  --headless [auto]          Run browser in headless mode (default: auto)
  --no-headless              Run browser in windowed mode
  --browser-timeout <ms>     Browser timeout in milliseconds
  --browser-executable <path> Path to browser executable
  --pool-min <num>           Minimum browser pool size
  --pool-max <num>           Maximum browser pool size
  
Resource Options:
  --max-memory <mb>          Maximum memory usage in MB
  --max-cpu <percent>        Maximum CPU usage percentage
  --max-concurrent <num>     Maximum concurrent requests
  
Logging Options:
  --log-level <level>        Log level: error, warn, info, debug
  --log-format <format>      Log format: json, text
  --log-destination <dest>   Log destination: console, file, both
  --verbose, -v              Enable verbose logging (debug level)
  --quiet, -q                Enable quiet logging (error level only)
  
Security Options:
  --allowed-domains <list>   Comma-separated list of allowed domains
  --blocked-domains <list>   Comma-separated list of blocked domains
  
Long-Running Mode Options:
  --cooling-period <ms>      Cooling period before shutdown in milliseconds
  --max-uptime <ms>          Maximum uptime in milliseconds
  
Environment Shortcuts:
  --production               Set environment to production
  --development              Set environment to development
  --test                     Set environment to test
`;
  }
};

// src/core/config-manager.ts
var ConfigurationManager = class {
  constructor(baseDir = process.cwd()) {
    this.baseDir = baseDir;
    this.config = null;
    this.configPaths = [];
    this.watchers = /* @__PURE__ */ new Map();
    this.initializeConfigPaths();
  }
  initializeConfigPaths() {
    this.configPaths = [
      join(this.baseDir, "printeer.config.json"),
      join(this.baseDir, ".printeer.json"),
      join(homedir(), ".printeer", "config.json"),
      join(homedir(), ".printeer.json"),
      "/etc/printeer/config.json"
    ];
  }
  async load(cliArgs) {
    const baseConfig = this.getDefaultConfiguration();
    let mergedConfig = { ...baseConfig };
    for (const configPath of [...this.configPaths].reverse()) {
      try {
        await access(configPath);
        const fileConfig = await this.loadConfigFile(configPath);
        mergedConfig = this.mergeConfigurations(mergedConfig, fileConfig);
      } catch (error) {
        if (error instanceof Error && error.message.includes("JSON")) {
          throw error;
        }
      }
    }
    const envConfig = this.loadEnvironmentConfig();
    mergedConfig = this.mergeConfigurations(mergedConfig, envConfig);
    const cliConfig = CliConfigLoader.parseCliArgs(cliArgs);
    mergedConfig = this.mergeConfigurations(mergedConfig, cliConfig);
    const validation = this.validateConfiguration(mergedConfig);
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(", ")}`);
    }
    this.config = mergedConfig;
    return mergedConfig;
  }
  get(key) {
    if (!this.config) {
      throw new Error("Configuration not loaded. Call load() first.");
    }
    const keys = key.split(".");
    let value = this.config;
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        throw new Error(`Configuration key '${key}' not found`);
      }
    }
    return value;
  }
  set(key, value) {
    if (!this.config) {
      throw new Error("Configuration not loaded. Call load() first.");
    }
    const keys = key.split(".");
    const lastKey = keys.pop();
    let target = this.config;
    for (const k of keys) {
      if (!target[k] || typeof target[k] !== "object") {
        target[k] = {};
      }
      target = target[k];
    }
    target[lastKey] = value;
  }
  validate() {
    if (!this.config) {
      return {
        valid: false,
        errors: ["Configuration not loaded"],
        warnings: []
      };
    }
    return this.validateConfiguration(this.config);
  }
  async reload(cliArgs) {
    await this.load(cliArgs);
  }
  getEnvironment() {
    const envVar = process.env.PRINTEER_ENV || process.env.NODE_ENV;
    if (envVar === "development" || envVar === "production" || envVar === "test") {
      return envVar;
    }
    if (process.env.NODE_ENV === "dev" || process.env.NODE_ENV === "development") {
      return "development";
    }
    if (process.env.NODE_ENV === "prod" || process.env.NODE_ENV === "production") {
      return "production";
    }
    if (process.env.CI || process.env.DOCKER || process.env.KUBERNETES_SERVICE_HOST) {
      return "production";
    }
    return "development";
  }
  getDefaultConfiguration() {
    const environment = this.getEnvironment();
    const isProduction = environment === "production";
    const isDevelopment = environment === "development";
    return {
      mode: "single-shot",
      environment,
      browser: {
        headless: isProduction ? true : "auto",
        args: this.getDefaultBrowserArgs(environment),
        timeout: 3e4,
        pool: {
          min: isProduction ? 1 : 0,
          max: isProduction ? 5 : 2,
          idleTimeout: 3e5
        }
      },
      resources: {
        maxMemoryMB: isProduction ? 1024 : 512,
        maxCpuPercent: isProduction ? 80 : 50,
        maxDiskMB: 100,
        maxConcurrentRequests: isProduction ? 10 : 3
      },
      longRunning: {
        coolingPeriodMs: 3e5,
        healthCheckInterval: 3e4,
        maxUptime: 864e5
      },
      logging: {
        level: isDevelopment ? "debug" : "info",
        format: isProduction ? "json" : "text",
        destination: "console"
      },
      security: {
        maxFileSize: 50 * 1024 * 1024,
        sanitizeInput: true
      }
    };
  }
  getDefaultBrowserArgs(environment) {
    const baseArgs = [
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding"
    ];
    if (environment === "production") {
      return [
        ...baseArgs,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-extensions",
        "--disable-plugins",
        "--disable-images",
        "--disable-javascript"
      ];
    }
    return baseArgs;
  }
  async loadConfigFile(filePath) {
    try {
      const content = await readFile(filePath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load config file ${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  loadEnvironmentConfig() {
    const config = {};
    if (process.env.PRINTEER_MODE) {
      config.mode = process.env.PRINTEER_MODE;
    }
    if (process.env.PRINTEER_BROWSER_EXECUTABLE) {
      config.browser = {
        ...config.browser,
        executablePath: process.env.PRINTEER_BROWSER_EXECUTABLE
      };
    }
    if (process.env.PRINTEER_BROWSER_HEADLESS) {
      const headless = process.env.PRINTEER_BROWSER_HEADLESS.toLowerCase();
      config.browser = {
        ...config.browser,
        headless: headless === "auto" ? "auto" : headless === "true"
      };
    }
    if (process.env.PRINTEER_BROWSER_TIMEOUT) {
      config.browser = {
        ...config.browser,
        timeout: parseInt(process.env.PRINTEER_BROWSER_TIMEOUT, 10)
      };
    }
    if (process.env.PRINTEER_MAX_MEMORY_MB) {
      config.resources = {
        ...config.resources,
        maxMemoryMB: parseInt(process.env.PRINTEER_MAX_MEMORY_MB, 10)
      };
    }
    if (process.env.PRINTEER_MAX_CPU_PERCENT) {
      config.resources = {
        ...config.resources,
        maxCpuPercent: parseInt(process.env.PRINTEER_MAX_CPU_PERCENT, 10)
      };
    }
    if (process.env.PRINTEER_MAX_CONCURRENT_REQUESTS) {
      config.resources = {
        ...config.resources,
        maxConcurrentRequests: parseInt(process.env.PRINTEER_MAX_CONCURRENT_REQUESTS, 10)
      };
    }
    if (process.env.PRINTEER_LOG_LEVEL) {
      config.logging = {
        ...config.logging,
        level: process.env.PRINTEER_LOG_LEVEL
      };
    }
    if (process.env.PRINTEER_LOG_FORMAT) {
      config.logging = {
        ...config.logging,
        format: process.env.PRINTEER_LOG_FORMAT
      };
    }
    if (process.env.PRINTEER_ALLOWED_DOMAINS) {
      config.security = {
        ...config.security,
        allowedDomains: process.env.PRINTEER_ALLOWED_DOMAINS.split(",").map((d) => d.trim())
      };
    }
    if (process.env.PRINTEER_BLOCKED_DOMAINS) {
      config.security = {
        ...config.security,
        blockedDomains: process.env.PRINTEER_BLOCKED_DOMAINS.split(",").map((d) => d.trim())
      };
    }
    return config;
  }
  mergeConfigurations(base, override) {
    const result = { ...base };
    for (const [key, value] of Object.entries(override)) {
      if (value !== void 0 && value !== null) {
        if (typeof value === "object" && !Array.isArray(value) && key in result && typeof result[key] === "object" && !Array.isArray(result[key])) {
          result[key] = this.deepMerge(result[key], value);
        } else {
          result[key] = value;
        }
      }
    }
    return result;
  }
  deepMerge(target, source) {
    const result = { ...target };
    for (const [key, value] of Object.entries(source)) {
      if (value !== void 0 && value !== null) {
        if (typeof value === "object" && !Array.isArray(value) && key in result && typeof result[key] === "object" && !Array.isArray(result[key])) {
          result[key] = this.deepMerge(result[key], value);
        } else {
          result[key] = value;
        }
      }
    }
    return result;
  }
  validateConfiguration(config) {
    const errors = [];
    const warnings = [];
    if (!["single-shot", "long-running"].includes(config.mode)) {
      errors.push(`Invalid mode: ${config.mode}. Must be 'single-shot' or 'long-running'`);
    }
    if (!["development", "production", "test"].includes(config.environment)) {
      errors.push(`Invalid environment: ${config.environment}. Must be 'development', 'production', or 'test'`);
    }
    if (config.browser) {
      if (typeof config.browser.headless !== "boolean" && config.browser.headless !== "auto") {
        errors.push('browser.headless must be boolean or "auto"');
      }
      if (config.browser.timeout <= 0) {
        errors.push("browser.timeout must be positive");
      }
      if (config.browser.pool) {
        if (config.browser.pool.min < 0) {
          errors.push("browser.pool.min must be non-negative");
        }
        if (config.browser.pool.max <= 0) {
          errors.push("browser.pool.max must be positive");
        }
        if (config.browser.pool.min > config.browser.pool.max) {
          errors.push("browser.pool.min cannot be greater than browser.pool.max");
        }
        if (config.browser.pool.idleTimeout <= 0) {
          errors.push("browser.pool.idleTimeout must be positive");
        }
      }
    }
    if (config.resources) {
      if (config.resources.maxMemoryMB <= 0) {
        errors.push("resources.maxMemoryMB must be positive");
      }
      if (config.resources.maxCpuPercent <= 0 || config.resources.maxCpuPercent > 100) {
        errors.push("resources.maxCpuPercent must be between 1 and 100");
      }
      if (config.resources.maxDiskMB <= 0) {
        errors.push("resources.maxDiskMB must be positive");
      }
      if (config.resources.maxConcurrentRequests <= 0) {
        errors.push("resources.maxConcurrentRequests must be positive");
      }
      if (config.resources.maxMemoryMB < 256) {
        warnings.push("resources.maxMemoryMB is very low (< 256MB), may cause performance issues");
      }
      if (config.resources.maxConcurrentRequests > 20) {
        warnings.push("resources.maxConcurrentRequests is very high (> 20), may cause resource exhaustion");
      }
    }
    if (config.longRunning) {
      if (config.longRunning.coolingPeriodMs <= 0) {
        errors.push("longRunning.coolingPeriodMs must be positive");
      }
      if (config.longRunning.healthCheckInterval <= 0) {
        errors.push("longRunning.healthCheckInterval must be positive");
      }
      if (config.longRunning.maxUptime <= 0) {
        errors.push("longRunning.maxUptime must be positive");
      }
    }
    if (config.logging) {
      if (!["error", "warn", "info", "debug"].includes(config.logging.level)) {
        errors.push(`Invalid logging.level: ${config.logging.level}`);
      }
      if (!["json", "text"].includes(config.logging.format)) {
        errors.push(`Invalid logging.format: ${config.logging.format}`);
      }
      if (!["console", "file", "both"].includes(config.logging.destination)) {
        errors.push(`Invalid logging.destination: ${config.logging.destination}`);
      }
    }
    if (config.security) {
      if (config.security.maxFileSize <= 0) {
        errors.push("security.maxFileSize must be positive");
      }
      if (config.security.allowedDomains) {
        for (const domain of config.security.allowedDomains) {
          if (!this.isValidDomain(domain)) {
            errors.push(`Invalid domain in allowedDomains: ${domain}`);
          }
        }
      }
      if (config.security.blockedDomains) {
        for (const domain of config.security.blockedDomains) {
          if (!this.isValidDomain(domain)) {
            errors.push(`Invalid domain in blockedDomains: ${domain}`);
          }
        }
      }
    }
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  isValidDomain(domain) {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain) || domain === "*" || domain.startsWith("*.");
  }
  enableHotReload() {
    if (this.watchers.size > 0) {
      return;
    }
    const pollInterval = 5e3;
    for (const configPath of this.configPaths) {
      const intervalId = setInterval(async () => {
        try {
          await access(configPath);
          const stats = await import("fs").then((fs2) => fs2.promises.stat(configPath));
          const lastModified = stats.mtime.getTime();
          if (!this.watchers.has(`${configPath}_lastModified`) || this.watchers.get(`${configPath}_lastModified`) < lastModified) {
            this.watchers.set(`${configPath}_lastModified`, lastModified);
            await this.reload();
          }
        } catch (error) {
        }
      }, pollInterval);
      this.watchers.set(configPath, intervalId);
    }
  }
  disableHotReload() {
    for (const [path2, intervalId] of this.watchers) {
      if (typeof intervalId === "number") {
        clearInterval(intervalId);
      }
    }
    this.watchers.clear();
  }
  destroy() {
    this.disableHotReload();
    this.config = null;
  }
};

// src/index.ts
var src_default = printeer_default;
async function convert(_options) {
  throw new Error("Enhanced convert function not implemented yet - will be implemented in task 8");
}
async function doctor() {
  const { DefaultDoctorModule: DefaultDoctorModule2 } = await Promise.resolve().then(() => (init_doctor(), doctor_exports));
  const doctorModule = new DefaultDoctorModule2();
  return await doctorModule.runFullDiagnostics();
}
export {
  CliConfigLoader,
  ConfigurationManager,
  ErrorType,
  convert,
  src_default as default,
  doctor
};
//# sourceMappingURL=index.js.map
