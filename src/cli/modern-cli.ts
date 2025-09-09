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
    s.stop('✅ Conversion complete!');
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

  const s = !json && !quiet ? spinner() : null;
  s?.start('Running diagnostics...');

  try {
    const doctor = new DefaultDoctorModule();
    const results = await doctor.runFullDiagnostics();

    s?.stop('✅ Diagnostics complete');

    if (json) {
      console.log(JSON.stringify(results, null, 2));
    } else if (quiet) {
      // Truly quiet - no output, just exit code
      const hasErrors = results.some((r: DiagnosticResult) => r.status === 'fail');
      process.exit(hasErrors ? 1 : 0);
    } else if (verbose) {
      // Detailed output
      displayDetailedResults(results);
    } else {
      // Summary output
      displaySummaryResults(results);
    }

    if (!json && !quiet) {
      const hasErrors = results.some((r: DiagnosticResult) => r.status === 'fail');
      const hasWarnings = results.some((r: DiagnosticResult) => r.status === 'warn');

      if (hasErrors) {
        outro('❌ Some issues found. Run with --verbose for details.');
      } else if (hasWarnings) {
        outro('⚠️  Everything working, but some warnings found.');
      } else {
        outro('✅ All checks passed. Your system is ready!');
      }
    }
  } catch (error) {
    s?.stop('❌ Diagnostics failed');
    if (!json && !quiet) {
      outro(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    process.exit(1);
  }
}

function displaySummaryResults(results: DiagnosticResult[]) {
  console.log('\nDoctor summary:');
  for (const result of results) {
    const icon = result.status === 'pass' ? '[✓]' :
                 result.status === 'warn' ? '[!]' : '[✗]';
    console.log(`${icon} ${result.component} — ${result.message}`);
  }
}

function displayDetailedResults(results: DiagnosticResult[]) {
  console.log('\nDetailed diagnostics:');
  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' :
                 result.status === 'warn' ? '⚠️' : '❌';
    console.log(`\n${icon} ${result.component}`);
    console.log(`   Status: ${result.status.toUpperCase()}`);
    console.log(`   Message: ${result.message}`);
    if (result.remediation) {
      console.log(`   Fix: ${result.remediation}`);
    }
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
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
        s.stop('✅ Conversion complete!');
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
          console.log('\n✅ All checks passed. Your system is ready!');
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
