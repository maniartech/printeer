#!/usr/bin/env node

import { Command } from 'commander';
import printeer from '../api';
import { DefaultDoctorModule } from '../diagnostics/doctor';
import type { DiagnosticResult } from '../diagnostics/types/diagnostics';
import { readFileSync } from 'fs';
import { join } from 'path';
import process from 'process';

// Runtime environment detection
const isInteractive = process.stdin.isTTY && process.stdout.isTTY && !process.env.CI;
const isQuiet = process.argv.includes('--quiet') || process.argv.includes('-q');

// Get package version
function getVersion(): string {
  try {
    const packagePath = join(process.cwd(), 'package.json');
    const packageContent = readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    return packageJson.version;
  } catch {
    return '1.0.0';
  }
}

// Lazy-load interactive UI components only when needed
async function loadInteractiveUI() {
  try {
    const { intro, outro, text, select, spinner, isCancel, cancel } = await import('@clack/prompts');
    return { intro, outro, text, select, spinner, isCancel, cancel };
  } catch (error) {
    throw new Error('Interactive UI dependencies not available. Install @clack/prompts for interactive mode.');
  }
}

// Interactive conversion function
async function runInteractiveConvert() {
  if (!isInteractive || isQuiet) {
    console.error('Interactive mode requires a TTY and cannot be used with --quiet');
    process.exit(1);
  }

  const ui = await loadInteractiveUI();

  ui.intro('🎯 Printeer - Web to PDF/PNG Converter');

  const url = await ui.text({
    message: 'What URL would you like to convert?',
    placeholder: 'https://example.com',
    validate: (value) => {
      if (!value) return 'URL is required';
      if (!value.startsWith('http')) return 'URL must start with http or https';
    }
  });

  if (ui.isCancel(url)) {
    ui.cancel('Operation cancelled.');
    process.exit(0);
  }

  const output = await ui.text({
    message: 'Where should we save the output?',
    placeholder: 'output.pdf',
    validate: (value) => {
      if (!value) return 'Output filename is required';
    }
  });

  if (ui.isCancel(output)) {
    ui.cancel('Operation cancelled.');
    process.exit(0);
  }

  const format = output.toString().split('.').pop()?.toLowerCase();
  if (!['pdf', 'png'].includes(format || '')) {
    const selectedFormat = await ui.select({
      message: 'What format would you like?',
      options: [
        { value: 'pdf', label: 'PDF Document' },
        { value: 'png', label: 'PNG Image' }
      ]
    });

    if (ui.isCancel(selectedFormat)) {
      ui.cancel('Operation cancelled.');
      process.exit(0);
    }
  }

  const s = ui.spinner();
  s.start('Converting webpage...');

  try {
    const result = await printeer(url.toString(), output.toString(), null, {});
    s.stop('✓ Conversion complete!');
    ui.outro(`📄 Saved to: ${result}`);
  } catch (error) {
    s.stop('❌ Conversion failed');
    ui.outro(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Interactive doctor function with live diagnostics
async function runInteractiveDoctor(verbose = false) {
  if (!isInteractive || isQuiet) {
    // Fall back to non-interactive mode
    return runStandardDoctor(verbose, false, isQuiet);
  }

  const ui = await loadInteractiveUI();
  ui.intro('🔍 Printeer Doctor - System Diagnostics');

  const doctor = new DefaultDoctorModule();
  const allResults: DiagnosticResult[] = [];

  // Define diagnostic groups with their methods
  const diagnosticGroups = [
    {
      name: 'System Environment',
      emoji: '🖥️',
      method: () => doctor.checkSystemDependencies(),
      components: ['system-info', 'platform-compatibility', 'permissions', 'resource-availability']
    },
    {
      name: 'Browser & Runtime',
      emoji: '🌐',
      method: () => doctor.validateBrowserInstallation(),
      components: ['browser-availability', 'browser-version', 'browser-launch', 'browser-sandbox']
    },
    {
      name: 'Display & Resources',
      emoji: '🎨',
      method: () => doctor.checkEnvironmentCompatibility(),
      components: ['display-server', 'font-availability', 'network-connectivity']
    }
  ];

  // Run each group sequentially with real-time feedback
  for (const group of diagnosticGroups) {
    const s = ui.spinner();
    s.start(`Checking ${group.name.toLowerCase()}...`);

    try {
      const groupResults = await group.method();
      allResults.push(...groupResults);

      const passed = groupResults.filter(r => r.status === 'pass').length;
      const warnings = groupResults.filter(r => r.status === 'warn').length;
      const failed = groupResults.filter(r => r.status === 'fail').length;

      // Stop spinner and show group result
      if (failed > 0) {
        s.stop('');
        console.log(`❌ ${group.emoji}  ${group.name}: ${failed} failed, ${warnings} warnings, ${passed} passed`);
      } else if (warnings > 0) {
        s.stop('');
        console.log(`⚠️ ${group.emoji}  ${group.name}: ${warnings} warnings, ${passed} passed`);
      } else {
        s.stop('');
        console.log(`✓ ${group.emoji}  ${group.name}: All ${passed} checks passed`);
      }

      // Show individual test results
      const groupDetails = groupResults.map(result => {
        const icon = result.status === 'pass' ? '✓' : result.status === 'warn' ? '⚠️' : '❌';
        let line = `  ${icon} ${result.component} — ${result.message}`;

        // Add remediation only if verbose or there are issues
        if ((verbose || result.status !== 'pass') && result.remediation) {
          line += `\n     → ${result.remediation}`;
        }

        return line;
      }).join('\n');

      console.log(groupDetails);

    } catch (error) {
      s.stop(`❌ ${group.name}: Failed to run diagnostics`);
      throw error;
    }
  }

  // Finally, test output generation if browser tests passed
  const browserLaunch = allResults.find(r => r.component === 'browser-launch');
  if (browserLaunch?.status === 'pass') {
    const outputSpinner = ui.spinner();
    outputSpinner.start('Testing output generation...');

    try {
      const fullResults = await doctor.runFullDiagnostics();
      const outputResults = fullResults.filter(r => ['print-pdf', 'print-png'].includes(r.component));

      if (outputResults.length > 0) {
        allResults.push(...outputResults);

        const outputPassed = outputResults.filter(r => r.status === 'pass').length;
        const outputFailed = outputResults.filter(r => r.status === 'fail').length;

        outputSpinner.stop('');

        if (outputFailed > 0) {
          console.log(`❌ 🎯  Output Generation: ${outputFailed} failed, ${outputPassed} passed`);
        } else {
          console.log(`✓ 🎯  Output Generation: All ${outputPassed} checks passed`);
        }

        const outputDetails = outputResults.map(result => {
          const icon = result.status === 'pass' ? '✓' : '❌';
          return `  ${icon} ${result.component} — ${result.message}`;
        }).join('\n');

        console.log(outputDetails);
      }
    } catch (error) {
      outputSpinner.stop('❌ Output Generation: Tests failed');
    }
  }

  // Final summary
  const hasErrors = allResults.some(r => r.status === 'fail');
  const hasWarnings = allResults.some(r => r.status === 'warn');

  if (hasErrors) {
    ui.outro('❌ Some issues found. Run with --verbose for details.');
    process.exit(1);
  } else if (hasWarnings) {
    ui.outro('⚠️  Everything working, but some warnings found.');
  } else {
    ui.outro('✓ All checks passed. Your system is ready!');
  }
}

// Standard (non-interactive) doctor function
async function runStandardDoctor(verbose = false, json = false, quiet = false) {
  const doctor = new DefaultDoctorModule();

  try {
    if (verbose) {
      process.env.PRINTEER_DOCTOR_VERBOSE = '1';
    }

    const results = await doctor.runFullDiagnostics();

    if (json) {
      const jsonReport = doctor.formatDiagnosticReportJson(results);
      console.log(jsonReport);
    } else if (quiet) {
      // Just exit with appropriate code - no output at all
      const hasErrors = results.some((r: DiagnosticResult) => r.status === 'fail');
      process.exit(hasErrors ? 1 : 0);
    } else {
      // Use the existing formatter from legacy CLI
      console.log(formatDoctorStyleSummary(results));

      // Show print results if available
      const byComponent = new Map(results.map(r => [r.component, r] as const));
      const printPdf = byComponent.get('print-pdf');
      const printPng = byComponent.get('print-png');

      if (printPdf || printPng) {
        console.log("\nEverything seems to be okay, now lets try to print PDF and PNG output.\n");

        const colorsEnabled = process.env.NO_COLOR ? false : Boolean(process.stdout && process.stdout.isTTY);
        const sym = {
          pass: colorsEnabled ? '\u001b[32m[\u2713]\u001b[0m' : '[✓]',
          warn: colorsEnabled ? '\u001b[33m[!]\u001b[0m' : '[!]',
          fail: colorsEnabled ? '\u001b[31m[\u2717]\u001b[0m' : '[x]'
        };

        const line = (label: string, r?: DiagnosticResult) => {
          if (!r) return;
          const s = r.status === 'pass' ? sym.pass : r.status === 'warn' ? sym.warn : sym.fail;
          const msg = r.status === 'pass' ? 'OK' : r.message.split('\n')[0];
          console.log(`${s} ${label} — ${msg}`);
        };

        line('PDF output', printPdf);
        line('PNG output', printPng);
      }

      printRemediationGuide(results);
    }

    // Exit with appropriate code
    const hasFailures = results.some(r => r.status === 'fail');
    const hasWarnings = results.some(r => r.status === 'warn');

    if (hasFailures) {
      if (!quiet) console.error('\nFailures found. Please address the items above.');
      process.exit(1);
    } else if (hasWarnings) {
      if (!quiet) console.warn('\nSome warnings detected. Consider addressing them for best results.');
      process.exit(0);
    } else {
      if (!quiet) console.log('\nAll checks passed. Your system is ready.');
      process.exit(0);
    }

  } catch (error) {
    if (!quiet) {
      console.error('Error running diagnostics:', error instanceof Error ? error.message : 'Unknown error');
    }
    process.exit(1);
  }
}

// Utility functions from legacy CLI
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

    // Add helpful tips for common scenarios
    if (r.component === 'browser-availability' && r.status === 'fail') {
      console.log(`  ${color.cyan('Tip:')} Set a custom Chrome/Chromium path via PUPPETEER_EXECUTABLE_PATH`);
    }
  }
}

function detailsOf(r: DiagnosticResult): Record<string, unknown> {
  const d = r && typeof r.details === 'object' && r.details ? (r.details as Record<string, unknown>) : {};
  return d;
}

function formatDoctorStyleSummary(results: DiagnosticResult[]): string {
  const sym = {
    pass: colorsEnabled ? '\u001b[32m[\u2713]\u001b[0m' : '[✓]',
    warn: colorsEnabled ? '\u001b[33m[!]\u001b[0m' : '[!]',
    fail: colorsEnabled ? '\u001b[31m[\u2717]\u001b[0m' : '[x]'
  };

  const lines: string[] = [];
  lines.push(color.bold('Doctor summary (run with --verbose for more details):'));

  const byComponent = new Map(results.map(r => [r.component, r] as const));

  const line = (component: string, label: string, makeMsg?: (r: DiagnosticResult) => string) => {
    const r = byComponent.get(component);
    if (!r) return;
    const s = r.status === 'pass' ? sym.pass : r.status === 'warn' ? sym.warn : sym.fail;
    let msg = '';
    if (makeMsg) {
      try { msg = makeMsg(r); } catch { msg = r.message; }
    } else {
      msg = r.status === 'pass' ? 'OK' : r.message.split('\n')[0];
    }
    lines.push(`${s} ${label} — ${msg}`);
  };

  line('system-info', 'System', (r) => {
    const d = detailsOf(r);
    const os = typeof d.os === 'string' ? d.os.split(' ')[0] : 'unknown';
    const arch = typeof d.arch === 'string' ? d.arch : '';
    const node = typeof d.nodeVersion === 'string' ? d.nodeVersion.replace(/^v/, 'v') : '';
    const parts = [os, arch && `(${arch})`, node && `Node ${node}`].filter(Boolean) as string[];
    return parts.join(', ');
  });

  line('browser-availability', 'Chrome/Chromium', (r) => {
    const d = detailsOf(r);
    const rawVer = typeof d.version === 'string' ? d.version : '';
    const major = rawVer ? rawVer.split('.')[0].replace(/[^0-9]/g, '') : '';
    const version = major ? `v${major}` : (rawVer ? `v${rawVer}` : 'available');
    const source = typeof d.source === 'string' ? ` (${d.source})` : '';
    return `${version}${source}`;
  });

  line('browser-launch', 'Headless launch');
  line('browser-sandbox', 'Sandbox', (r) => (r.status === 'pass' ? 'OK' : r.status === 'warn' ? 'Requires --no-sandbox' : 'Failed'));
  line('display-server', 'Display server', (r) => (r.status === 'pass' ? 'available' : r.message.replace(/\s+/g, ' ').trim()));
  line('font-availability', 'Fonts', (r) => {
    const d = detailsOf(r);
    return typeof d.totalFonts === 'number' ? `${d.totalFonts} found` : (r.status === 'pass' ? 'OK' : r.message);
  });
  line('permissions', 'Permissions', (r) => (r.status === 'pass' ? 'OK' : r.message));
  line('resource-availability', 'Resources', (r) => {
    const d = detailsOf(r);
    const ramNum = typeof d.totalMemoryGB === 'number' ? Math.round(d.totalMemoryGB) : undefined;
    const ram = typeof ramNum === 'number' ? `${ramNum}GB RAM` : undefined;
    const cores = typeof d.cpuCores === 'number' ? `${d.cpuCores} cores` : undefined;
    const parts = [ram, cores].filter(Boolean) as string[];
    return parts.length ? parts.join(', ') : (r.status === 'pass' ? 'OK' : r.message);
  });
  line('network-connectivity', 'Network', (r) => (r.status === 'pass' ? 'OK' : r.message));

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

// CLI Program setup
const program = new Command();

program
  .name('printeer')
  .description('🎯 Web-to-PDF/PNG conversion utility')
  .version(getVersion(), '-v, --version', 'Display version number');

// Global quiet option
program.option('-q, --quiet', 'Suppress output (stdio mode)');

// Convert command (default)
program
  .argument('[url]', 'URL to convert')
  .argument('[output]', 'Output file path')
  .option('-f, --format <type>', 'Output format (pdf|png)', 'pdf')
  .action(async (url, output, _options) => {
    const { quiet } = program.opts(); // Get global quiet option

    // If no arguments provided and interactive mode is available, show interactive mode
    if (!url && !output && isInteractive && !quiet) {
      try {
        await runInteractiveConvert();
        return;
      } catch (error) {
        // Fall back to showing help if interactive mode fails
        console.error('Interactive mode not available. Use: printeer <url> <output>');
        program.help();
      }
    }

    // Validate required arguments for non-interactive mode
    if (!url || !output) {
      if (quiet) {
        process.exit(1); // Silent failure for stdio mode
      }
      console.error('Error: URL and output file are required');
      program.help();
    }

    try {
      if (!quiet && isInteractive) {
        // Try to show progress if interactive UI is available
        try {
          const ui = await loadInteractiveUI();
          const s = ui.spinner();
          s.start('Converting webpage...');
          const result = await printeer(url, output, null, {});
          s.stop('✓ Conversion complete!');
          console.log(`📄 Saved to: ${result}`);
        } catch {
          // Fall back to simple output
          const result = await printeer(url, output, null, {});
          console.log(`Saved to: ${result}`);
        }
      } else {
        // Silent mode or non-interactive
        const result = await printeer(url, output, null, {});
        if (!quiet) {
          console.log(result); // Just output the file path
        }
      }
    } catch (error) {
      if (quiet) {
        process.exit(1);
      }
      console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

// Doctor command
program
  .command('doctor')
  .description('🔍 Run system diagnostics and health checks')
  .option('-v, --verbose', 'Show detailed diagnostic information')
  .option('--json', 'Output results in JSON format')
  .option('--markdown', 'Output full Markdown report (legacy)')
  .action(async (options) => {
    const { verbose, json, markdown } = options;
    const { quiet } = program.opts(); // Get global quiet option

    // Handle legacy markdown option
    if (markdown) {
      const doctor = new DefaultDoctorModule();
      const results = await doctor.runFullDiagnostics();
      const report = doctor.formatDiagnosticReport(results);
      console.log(report);
      return;
    }

    // Choose appropriate doctor mode
    if (json || quiet || !isInteractive) {
      await runStandardDoctor(verbose, json, quiet);
    } else {
      try {
        await runInteractiveDoctor(verbose);
      } catch (error) {
        // Fall back to standard mode if interactive fails
        await runStandardDoctor(verbose, json, quiet);
      }
    }
  });

// Interactive mode command (explicit)
program
  .command('interactive')
  .alias('i')
  .description('🎨 Start interactive mode')
  .action(async () => {
    const { quiet } = program.opts();
    if (quiet) {
      console.error('Interactive mode cannot be used with --quiet');
      process.exit(1);
    }
    await runInteractiveConvert();
  });

// Error handling
program.configureHelp({
  sortSubcommands: true,
  subcommandTerm: (cmd) => `${cmd.name()} ${cmd.usage()}`
});

// Custom help formatting
program.configureOutput({
  writeOut: (str) => process.stdout.write(str),
  writeErr: (str) => process.stderr.write(str),
  outputError: (str, write) => {
    if (isInteractive && !isQuiet) {
      write(`❌ ${str}`);
    } else {
      write(str);
    }
  }
});

// Parse and execute
export async function runCLI() {
  try {
    await program.parseAsync();
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Unexpected error:', error);
      process.exit(1);
    }
    throw error;
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.includes('cli.js')) {
  runCLI().catch((error) => {
    console.error('CLI Error:', error);
    process.exit(1);
  });
}
