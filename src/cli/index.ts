#!/usr/bin/env node

import printeer from "../printeer";
import printUsage from "./usage";
import { DefaultDoctorModule } from "../core/doctor";

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

  if (help) {
    printDoctorUsage();
    return;
  }

  try {
    console.log('🔍 Running system diagnostics...\n');

    const doctorModule = new DefaultDoctorModule();
    const results = await doctorModule.runFullDiagnostics();

    if (json) {
      const jsonReport = doctorModule.formatDiagnosticReportJson(results);
      console.log(jsonReport);
    } else {
      const report = await doctorModule.generateReport();
      console.log(report);
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
