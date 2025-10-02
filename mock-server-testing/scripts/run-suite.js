#!/usr/bin/env node

import { Command } from 'commander';
import { SuiteTestRunner } from '../framework/batch-runner.js';
import { ReportGenerator } from '../framework/utils/report-generator.js';
import path from 'path';

const program = new Command();

program
  .name('printeer-suite-tests')
  .description('Run specific Printeer test suite(s) against mock server')
  .argument('<suites>', 'Comma-separated suite names (basic,print,dynamic,auth,errors,i18n,media,templates,cache-csp,image,redirects,resources)')
  .option('-s, --server <url>', 'Mock server URL', 'http://localhost:4000')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-p, --parallel <count>', 'Parallel execution count', '2')
  .option('-t, --timeout <ms>', 'Test timeout in milliseconds', '30000')
  .option('-r, --retries <count>', 'Retry count for failed tests', '2')
  .option('--formats <formats>', 'Test specific formats only (A4,Letter,A3)')
  .option('--orientations <orientations>', 'Test specific orientations (portrait,landscape)')
  .option('--quick', 'Run reduced parameter matrix for faster execution')
  .option('--continue-on-error', 'Continue testing after failures')
  .option('--verbose', 'Verbose output with detailed logging')
  .action(async (suitesArg, options) => {
    try {
      const suiteNames = suitesArg.split(',').map(s => s.trim());

      console.log(`🧪 Running Printeer test suites: ${suiteNames.join(', ')}`);
      console.log(`📍 Target Server: ${options.server}`);
      console.log(`📁 Output Directory: ${options.output}`);

      // Initialize suite runner with configuration
      const config = {
        mockServerUrl: options.server,
        outputDir: options.output,
        timeout: parseInt(options.timeout),
        retries: parseInt(options.retries),
        parallelism: parseInt(options.parallel),
        formats: options.formats,
        orientations: options.orientations,
        quick: options.quick,
        continueOnError: options.continueOnError,
        verbose: options.verbose
      };

      const suiteRunner = new SuiteTestRunner(config);

      // Run specified suites
      const summary = await suiteRunner.runSpecificSuites(suiteNames);

      // Generate reports
      console.log('\n📊 Generating test reports...');
      const reportGenerator = new ReportGenerator({ outputDir: path.join(options.output, 'reports') });
      const reports = await reportGenerator.saveReports(suiteRunner.getResults());

      console.log('📋 Suite reports generated:');
      Object.entries(reports).forEach(([type, filePath]) => {
        console.log(`   ${type.toUpperCase()}: ${filePath}`);
      });

      // Final summary
      console.log('\n' + '='.repeat(60));
      console.log('🎯 Suite Execution Complete');
      console.log(`📊 Results: ${summary.passed}/${summary.total} tests passed (${summary.passRate}%)`);
      console.log(`⏱️  Duration: ${Math.round(summary.duration / 1000)}s`);

      if (summary.failed > 0) {
        console.log(`❌ ${summary.failed} tests failed - see detailed reports for more information`);
        process.exit(1);
      } else {
        console.log('✅ All suite tests passed successfully!');
        process.exit(0);
      }

    } catch (error) {
      console.error('❌ Suite test execution failed:', error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse();