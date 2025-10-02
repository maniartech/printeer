#!/usr/bin/env node

import { Command } from 'commander';
import { intro, outro, text, select, spinner, isCancel, cancel } from '@clack/prompts';
import printeer from '../api';
import { DefaultDoctorModule } from '../diagnostics/doctor';
import type { DiagnosticResult } from '../diagnostics/types/diagnostics';
import { readFileSync } from 'fs';
import { join } from 'path';
import process from 'process';

// Utility to check if we're running interactively (TTY) or programmatically
const isInteractive = process.stdin.isTTY && process.stdout.isTTY && !process.env.CI;

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

// Interactive mode functions
async function interactiveConvert() {
  intro('🎯 Printeer - Web to PDF/PNG Converter');

  const url = await text({
    message: 'What URL would you like to convert?',
    placeholder: 'https://example.com',
    validate: (value) => {
      if (!value) return 'URL is required';
      if (!value.startsWith('http')) return 'URL must start with http or https';
    }
  });

  if (isCancel(url)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  const output = await text({
    message: 'Where should we save the output?',
    placeholder: 'output.pdf',
    validate: (value) => {
      if (!value) return 'Output filename is required';
    }
  });

  if (isCancel(output)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  const format = output.toString().split('.').pop()?.toLowerCase();
  if (!['pdf', 'png'].includes(format || '')) {
    const selectedFormat = await select({
      message: 'What format would you like?',
      options: [
        { value: 'pdf', label: 'PDF Document' },
        { value: 'png', label: 'PNG Image' }
      ]
    });

    if (isCancel(selectedFormat)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }
  }

  const s = spinner();
  s.start('Converting webpage...');

  try {
    const result = await printeer(url.toString(), output.toString(), null, {});
    s.stop('✓ Conversion complete!');
    outro(`📄 Saved to: ${result}`);
  } catch (error) {
    s.stop('❌ Conversion failed');
    outro(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

async function interactiveDoctor(verbose = false, json = false, quiet = false) {
  if (!json && !quiet) {
    intro('🔍 Printeer Doctor - System Diagnostics');
  }

  try {
    const doctor = new DefaultDoctorModule();

    if (json || quiet) {
      // Non-interactive modes - run all at once
      const results = await doctor.runFullDiagnostics();

      if (json) {
        console.log(JSON.stringify(results, null, 2));
      } else if (quiet) {
        const hasErrors = results.some((r: DiagnosticResult) => r.status === 'fail');
        process.exit(hasErrors ? 1 : 0);
      }
    } else {
      // Interactive mode with live steps
      await runDiagnosticsWithSteps(doctor, verbose);
    }

  } catch (error) {
    if (!json && !quiet) {
      outro(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    process.exit(1);
  }
}

async function runDiagnosticsWithSteps(doctor: DefaultDoctorModule, verbose = false) {
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
    const s = spinner();
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

  // Finally, run output generation tests if browser tests passed
  const browserLaunch = allResults.find(r => r.component === 'browser-launch');
  const browserSandbox = allResults.find(r => r.component === 'browser-sandbox');

  if (browserLaunch?.status === 'pass' && browserSandbox?.status !== 'fail') {
    const outputSpinner = spinner();
    outputSpinner.start('Testing output generation...');

    try {
      // We need to call the full diagnostics to get PDF/PNG tests since they're private
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

        // Show output test details
        const outputDetails = outputResults.map(result => {
          const icon = result.status === 'pass' ? '✓' : '❌';
          return `  ${icon} ${result.component} — ${result.message}`;
        }).join('\n');

        console.log(outputDetails);
      }
    } catch (error) {
      outputSpinner.stop('❌ Output Generation: Tests failed');
      // Add failure to results so final verdict reflects this
      allResults.push({
        status: 'fail',
        component: 'output-generation',
        message: 'Output generation tests failed',
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  // Final summary
  const hasErrors = allResults.some(r => r.status === 'fail');
  const hasWarnings = allResults.some(r => r.status === 'warn');

  if (hasErrors) {
    outro('❌ Some issues found. Run with --verbose for details.');
    process.exit(1);
  } else if (hasWarnings) {
    outro('⚠️  Everything working, but some warnings found.');
  } else {
    outro('✓ All checks passed. Your system is ready!');
  }
}

function displaySummaryResults(results: DiagnosticResult[]) {
  console.log('\nDoctor summary:');

  // Group diagnostics by category
  const groups = {
    'System Environment': ['system-info', 'platform-compatibility', 'permissions', 'resource-availability'],
    'Browser & Runtime': ['browser-availability', 'browser-version', 'browser-launch', 'browser-sandbox'],
    'Display & Resources': ['display-server', 'font-availability', 'network-connectivity'],
    'Output Generation': ['print-pdf', 'print-png']
  };

  for (const [groupName, componentNames] of Object.entries(groups)) {
    const groupResults = results.filter(r => componentNames.includes(r.component));
    if (groupResults.length === 0) continue;

    console.log(`\n📋 ${groupName}:`);
    for (const result of groupResults) {
      const icon = result.status === 'pass' ? '[✓]' :
                   result.status === 'warn' ? '[!]' : '[✗]';
      console.log(`  ${icon} ${result.component} — ${result.message}`);
    }
  }
}

function displayDetailedResults(results: DiagnosticResult[]) {
  console.log('\nDetailed diagnostics:');

  // Group diagnostics by category
  const groups = {
    'System Environment': ['system-info', 'platform-compatibility', 'permissions', 'resource-availability'],
    'Browser & Runtime': ['browser-availability', 'browser-version', 'browser-launch', 'browser-sandbox'],
    'Display & Resources': ['display-server', 'font-availability', 'network-connectivity'],
    'Output Generation': ['print-pdf', 'print-png']
  };

  for (const [groupName, componentNames] of Object.entries(groups)) {
    const groupResults = results.filter(r => componentNames.includes(r.component));
    if (groupResults.length === 0) continue;

    console.log(`\n📋 ${groupName}:`);
    for (const result of groupResults) {
      const icon = result.status === 'pass' ? '✓' :
                   result.status === 'warn' ? '⚠️' : '❌';
      console.log(`\n  ${icon} ${result.component}`);
      console.log(`     Status: ${result.status.toUpperCase()}`);
      console.log(`     Message: ${result.message}`);
      if (result.remediation) {
        console.log(`     Fix: ${result.remediation}`);
      }
      if (result.details) {
        console.log(`     Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    }
  }
}

// CLI Program setup
const program = new Command();

program
  .name('printeer')
  .description('🎯 Web-to-PDF/PNG conversion utility')
  .version(getVersion(), '-v, --version', 'Display version number');

// Convert command (default)
program
  .argument('[url]', 'URL to convert')
  .argument('[output]', 'Output file path')
  .option('-f, --format <type>', 'Output format (pdf|png)', 'pdf')
  .option('-q, --quiet', 'Suppress output (stdio mode)')
  .action(async (url, output, options) => {
    const { quiet } = options;

    // If no arguments provided and interactive, show interactive mode
    if (!url && !output && isInteractive && !quiet) {
      await interactiveConvert();
      return;
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
        const s = spinner();
        s.start('Converting webpage...');
        const result = await printeer(url, output, null, {});
        s.stop('✓ Conversion complete!');
        console.log(`📄 Saved to: ${result}`);
      } else {
        // Silent mode for programmatic use
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
  .action(async (options, command) => {
    const { verbose, json } = options;
    // Get quiet from parent command (global option)
    const quiet = command.parent.opts().quiet;

    // Force non-interactive mode for JSON output or quiet mode
    if (json || quiet || !isInteractive) {
      const doctor = new DefaultDoctorModule();
      const results = await doctor.runFullDiagnostics();

      if (json) {
        console.log(JSON.stringify(results, null, 2));
      } else if (quiet) {
        // Just exit with appropriate code - no output at all
        const hasErrors = results.some((r: DiagnosticResult) => r.status === 'fail');
        process.exit(hasErrors ? 1 : 0);
      } else {
        // Plain text output for non-interactive terminals
        if (verbose) {
          displayDetailedResults(results);
        } else {
          displaySummaryResults(results);
        }

        // Show final status message
        const hasErrors = results.some((r: DiagnosticResult) => r.status === 'fail');
        const hasWarnings = results.some((r: DiagnosticResult) => r.status === 'warn');

        if (hasErrors) {
          console.log('\n❌ Some issues found. Run with --verbose for details.');
          process.exit(1);
        } else if (hasWarnings) {
          console.log('\n⚠️  Everything working, but some warnings found.');
        } else {
          console.log('\n✓ All checks passed. Your system is ready!');
        }
      }
    } else {
      // Interactive mode - but never call this with quiet flag
      await interactiveDoctor(verbose, json, quiet);
    }
  });

// Help command
program
  .command('help')
  .description('📖 Show help information')
  .action(() => {
    program.help();
  });

// Interactive mode command
program
  .command('interactive')
  .alias('i')
  .description('🎨 Start interactive mode')
  .action(async () => {
    await interactiveConvert();
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
    if (isInteractive) {
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
