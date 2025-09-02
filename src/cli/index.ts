#!/usr/bin/env node

import printeer from "../printeer";
import printUsage from "./usage";
import { DefaultDoctorModule } from "../core/doctor";
import type { DiagnosticResult } from "../types/diagnostics";

/**
 * Main entry point of the print-web command!
 */
(async function main() {
  const args = process.argv.slice(2);

  // Handle doctor command
  if (args[0] === 'doctor') {
    await handleDoctorCommand(args.slice(1));
    return;
  }

  // Handle help command
  if (args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    return;
  }

  // Handle version command
  if (args[0] === 'version' || args[0] === '--version' || args[0] === '-v') {
    // Read version from package.json at runtime
    try {
      const fs = await import('fs');
      const path = await import('path');
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageContent = fs.readFileSync(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      console.log(`printeer v${packageJson.version}`);
    } catch (error) {
      console.log('printeer (version unknown)');
    }
    return;
  }

  // Legacy mode: direct URL and output file
  const url = args[0];
  const outputFile = args[1];

  // If url or outputFile is not provided, print usage and exit.
  if (!url || !outputFile) {
    printUsage();
    process.exit(1);
  }

  // Wait for the printeer to finish.
  try {
    await printeer(url, outputFile, null, null);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
})();

async function handleDoctorCommand(args: string[]) {
  const json = args.includes('--json');
  const help = args.includes('--help') || args.includes('-h');
  const verbose = args.includes('--verbose') || args.includes('-v') || args.includes('--trace');

  if (help) {
    printDoctorUsage();
    return;
  }

  try {
    console.log('🔍 Running system diagnostics...\n');

    if (verbose) {
      process.env.PRINTEER_DOCTOR_TRACE = '1';
    }
  const doctorModule = new DefaultDoctorModule();
  const results = await doctorModule.runFullDiagnostics();

    if (json) {
      const jsonReport = doctorModule.formatDiagnosticReportJson(results);
      console.log(jsonReport);
    } else {
  // Use already computed results to avoid re-running diagnostics (and extra launches)
  const report = doctorModule.formatDiagnosticReport(results);
      console.log(report);
      // Also print a concise, color-coded remediation guide for any issues
      printRemediationGuide(results);
    }

    // Exit with appropriate code
    const hasFailures = results.some(r => r.status === 'fail');
    const hasWarnings = results.some(r => r.status === 'warn');

    if (hasFailures) {
      console.error('\n❌ Critical issues found. Please address the failures above.');
      process.exit(1);
    } else if (hasWarnings) {
      console.warn('\n⚠️  Some warnings detected. Consider addressing them for optimal performance.');
      process.exit(0);
    } else {
      console.log('\n✅ All checks passed! Your system is ready for printeer.');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Error running diagnostics:', error instanceof Error ? error.message : 'Unknown error');
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

  • System dependencies (Node.js, OS compatibility)
  • Browser installation and availability
  • Display server configuration (for headless environments)
  • Font availability
  • System resources (memory, CPU)
  • Network connectivity
  • File system permissions
  • Environment-specific configurations

EXAMPLES:
  printeer doctor                    # Run basic diagnostics
  printeer doctor --verbose          # Show detailed information
  printeer doctor --json             # Output in JSON format
`);
}

// Simple ANSI color helpers (no external deps) with enable/disable logic
const colorsEnabled = process.env.NO_COLOR ? false : Boolean(process.stdout && process.stdout.isTTY);
const color = {
  bold: (s: string) => colorsEnabled ? `\x1b[1m${s}\x1b[0m` : s,
  red: (s: string) => colorsEnabled ? `\x1b[31m${s}\x1b[0m` : s,
  yellow: (s: string) => colorsEnabled ? `\x1b[33m${s}\x1b[0m` : s,
  green: (s: string) => colorsEnabled ? `\x1b[32m${s}\x1b[0m` : s,
  cyan: (s: string) => colorsEnabled ? `\x1b[36m${s}\x1b[0m` : s,
  dim: (s: string) => colorsEnabled ? `\x1b[2m${s}\x1b[0m` : s,
};

function printRemediationGuide(results: DiagnosticResult[]) {
  const issues = results.filter(r => r.status !== 'pass');
  if (issues.length === 0) return;

  console.log("\n" + color.bold('Remediation Guide'));
  for (const r of issues) {
    const icon = r.status === 'fail' ? '❌' : '⚠️';
    const titleColor = r.status === 'fail' ? color.red : color.yellow;
    console.log(`\n${titleColor(`${icon} ${r.component.toUpperCase()}`)}`);
    console.log(`  ${r.message}`);

    if (r.remediation) {
      console.log(`  ${color.green('Solution:')} ${r.remediation}`);
    }

    // Helpful tips for common scenarios
    if (r.component === 'browser-availability' && r.status === 'fail') {
      console.log(`  ${color.cyan('Tip:')} Set a custom Chrome/Chromium path via PUPPETEER_EXECUTABLE_PATH`);
      console.log(color.dim('    bash:      export PUPPETEER_EXECUTABLE_PATH=/path/to/chrome'));
      console.log(color.dim('    PowerShell: $Env:PUPPETEER_EXECUTABLE_PATH = "C:/Path/To/chrome.exe"'));
    }

    if (r.component === 'display-server' && r.status !== 'pass') {
      console.log(`  ${color.cyan('Tip:')} On Linux, you can use Xvfb for headless GUIs:`);
      console.log(color.dim('    sudo apt-get install -y xvfb'));
      console.log(color.dim('    Xvfb :99 -screen 0 1280x800x24 & export DISPLAY=:99'));
    }

    if (r.component === 'browser-sandbox' && r.status === 'warn') {
      console.log(`  ${color.cyan('Tip:')} In containers/root, launch with --no-sandbox --disable-setuid-sandbox.`);
    }

    // Optional compact details for quick context
    if (r.details) {
      const path = (r.details as Record<string, unknown>).path || (r.details as Record<string, unknown>).browserPath;
      const source = (r.details as Record<string, unknown>).source;
      const version = (r.details as Record<string, unknown>).version;
      const ctxParts = [
        path ? `path=${String(path)}` : null,
        version ? `version=${String(version)}` : null,
        source ? `source=${String(source)}` : null,
      ].filter(Boolean);
      if (ctxParts.length) {
        console.log(color.dim('  context: ' + ctxParts.join('  ')));
      }
    }
  }
}
