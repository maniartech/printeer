#!/usr/bin/env node

import { Command } from 'commander';
import { BatchTestRunner } from '../framework/batch-runner.js';
import { ReportGenerator } from '../framework/utils/report-generator.js';
import fs from 'fs';
import path from 'path';

const program = new Command();

program
  .name('printeer-batch-tests')
  .description('Run comprehensive Printeer test suite against mock server')
  .option('-s, --server <url>', 'Mock server URL', 'http://localhost:4000')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-p, --parallel <count>', 'Parallel execution count', '4')
  .option('-t, --timeout <ms>', 'Test timeout in milliseconds', '30000')
  .option('-r, --retries <count>', 'Retry count for failed tests', '2')
  .option('--suites <suites>', 'Comma-separated suite names to run')
  .option('--skip-suites <suites>', 'Comma-separated suites to skip')
  .option('--formats <formats>', 'Comma-separated formats to test (A4,Letter,etc)')
  .option('--quick', 'Run quick test subset with reduced parameters')
  .option('--smoke', 'Run smoke tests only (fastest validation)')
  .option('--continue-on-error', 'Continue testing after failures')
  .option('--no-cleanup', 'Keep temporary files after testing')
  .option('--no-reports', 'Skip report generation')
  .option('--verbose', 'Verbose output with detailed logging')
  .action(async (options) => {
    try {
      console.log('🚀 Starting Printeer Mock Server Test Suite');
      console.log(`📍 Target Server: ${options.server}`);
      console.log(`📁 Output Directory: ${options.output}`);

      if (options.quick) {
        console.log('⚡ Quick mode enabled - reduced parameter matrix');
      }

      if (options.smoke) {
        console.log('💨 Smoke test mode - essential tests only');
      }

      // Initialize batch runner with configuration
      const config = {
        mockServerUrl: options.server,
        outputDir: options.output,
        timeout: parseInt(options.timeout),
        retries: parseInt(options.retries),
        parallelism: parseInt(options.parallel),
        suites: options.suites,
        skipSuites: options.skipSuites,
        formats: options.formats,
        quick: options.quick,
        smoke: options.smoke,
        continueOnError: options.continueOnError,
        verbose: options.verbose
      };

      const batchRunner = new BatchTestRunner(config);

      // Run all tests
      const summary = await batchRunner.runBatchTests();

      // Generate reports unless disabled
      if (!options.noReports) {
        console.log('\n📊 Generating test reports...');
        const reportGenerator = new ReportGenerator({ outputDir: path.join(options.output, 'reports') });
        const reports = await reportGenerator.saveReports(batchRunner.getResults());

        console.log('📋 Reports generated:');
        Object.entries(reports).forEach(([type, filePath]) => {
          console.log(`   ${type.toUpperCase()}: ${filePath}`);
        });
      }

      // Cleanup if requested
      if (!options.noCleanup) {
        console.log('🧹 Cleaning up temporary files...');
        // Add cleanup logic here if needed
      }

      // Final summary
      console.log('\n' + '='.repeat(60));
      console.log('🎯 Test Execution Complete');
      console.log(`📊 Results: ${summary.passed}/${summary.total} tests passed (${summary.passRate}%)`);
      console.log(`⏱️  Duration: ${Math.round(summary.duration / 1000)}s`);

      if (summary.failed > 0) {
        console.log(`❌ ${summary.failed} tests failed - see detailed reports for more information`);
        process.exit(1);
      } else {
        console.log('✅ All tests passed successfully!');
        process.exit(0);
      }

    } catch (error) {
      console.error('❌ Batch test execution failed:', error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse();