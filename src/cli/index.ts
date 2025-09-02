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
  const markdown = args.includes('--markdown');
  const help = args.includes('--help') || args.includes('-h');
  const verbose = args.includes('--verbose') || args.includes('-v') || args.includes('--trace');

  if (help) {
    printDoctorUsage();
    return;
  }

  try {
    console.log('Running system diagnostics...\n');

    if (verbose) {
      process.env.PRINTEER_DOCTOR_VERBOSE = '1';
    }
    const doctorModule = new DefaultDoctorModule();
    const results = await doctorModule.runFullDiagnostics();

    if (json) {
      const jsonReport = doctorModule.formatDiagnosticReportJson(results);
      console.log(jsonReport);
    } else if (markdown) {
      const report = doctorModule.formatDiagnosticReport(results);
      console.log(report);
      printRemediationGuide(results);
    } else {
      // Default: Flutter-like summary
      console.log(formatDoctorStyleSummary(results));
      printRemediationGuide(results);
    }

    // Exit with appropriate code
    const hasFailures = results.some(r => r.status === 'fail');
    const hasWarnings = results.some(r => r.status === 'warn');

    if (hasFailures) {
      console.error('\nFailures found. Please address the items above.');
      process.exit(1);
    } else if (hasWarnings) {
      console.warn('\nSome warnings detected. Consider addressing them for best results.');
      process.exit(0);
    } else {
      console.log('\nAll checks passed. Your system is ready.');
      process.exit(0);
    }

  } catch (error) {
    console.error('Error running diagnostics:', error instanceof Error ? error.message : 'Unknown error');
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
  --markdown       Output full Markdown report
  --help, -h       Show this help message

NOTES:
  - Uses simple terminal-friendly symbols: [\u2713] pass, [!] warning, [\u2717] fail
  - Set NO_COLOR=1 to disable colors

EXAMPLES:
  printeer doctor                    # Summary with colors
  printeer doctor --markdown         # Full Markdown report
  printeer doctor --json             # JSON output
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
    const icon = r.status === 'fail' ? '[x]' : '[!]';
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
      console.log(color.dim('    To force bundled Chromium only: set PRINTEER_BUNDLED_ONLY=1 (fails fast if missing)'));
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

function formatDoctorStyleSummary(results: DiagnosticResult[]): string {
  // Symbols chosen to be terminal-friendly (no emoji)
  const sym = {
    pass: colorsEnabled ? '\u001b[32m[\u2713]\u001b[0m' : '[✓]',
    warn: colorsEnabled ? '\u001b[33m[!]\u001b[0m' : '[!]',
    fail: colorsEnabled ? '\u001b[31m[\u2717]\u001b[0m' : '[x]'
  };

  const lines: string[] = [];

  // Header
  lines.push(color.bold('Doctor summary (run with --verbose for more details):'));

  const byComponent = new Map(results.map(r => [r.component, r] as const));

  const renderLine = (key: string, label: string) => {
    const r = byComponent.get(key);
    if (!r) return;
    const s = r.status === 'pass' ? sym.pass : r.status === 'warn' ? sym.warn : sym.fail;
    const msg = r.message.replace(/\s+/g, ' ').trim();
    lines.push(`${s} ${label} — ${msg}`);
  };

  renderLine('system-info', 'System');
  renderLine('platform-compatibility', 'Platform');
  renderLine('browser-availability', 'Chrome/Chromium');
  renderLine('browser-version', 'Browser version');
  renderLine('browser-launch', 'Headless launch');
  renderLine('browser-sandbox', 'Sandbox');
  renderLine('display-server', 'Display server');
  renderLine('font-availability', 'Fonts');
  renderLine('permissions', 'Permissions');
  renderLine('resource-availability', 'Resources');
  renderLine('network-connectivity', 'Network');

  // Footer with simple result
  const fails = results.filter(r => r.status === 'fail').length;
  const warns = results.filter(r => r.status === 'warn').length;
  if (fails === 0 && warns === 0) {
    lines.push(color.green('• No issues found!'));
  } else if (fails === 0) {
    lines.push(color.yellow(`• ${warns} warning(s). You can proceed, but review recommendations.`));
  } else {
    lines.push(color.red(`• ${fails} failure(s). Please review remediation below.`));
  }

  return lines.join('\n');
}
