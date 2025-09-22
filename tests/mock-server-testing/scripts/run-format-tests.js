#!/usr/bin/env node

import { Command } from 'commander';
import { BatchTestRunner } from '../framework/batch-runner.js';

const program = new Command();

program
  .name('printeer-format-tests')
  .description('Run tests for specific page formats across all suites')
  .argument('<formats>', 'Comma-separated format names (A4,Letter,A3,A5,Legal)')
  .option('-s, --server <url>', 'Mock server URL', 'http://localhost:4000')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('--suites <suites>', 'Limit to specific test suites')
  .option('--orientation <orientation>', 'Test specific orientation only')
  .option('--quick', 'Use reduced parameter matrix')
  .option('--verbose', 'Verbose output')
  .action(async (formatsArg, options) => {
    try {
      const formats = formatsArg.split(',').map(f => f.trim());

      console.log(`📏 Testing page formats: ${formats.join(', ')}`);
      console.log(`📍 Target Server: ${options.server}`);

      // Initialize batch runner with format-specific config
      const config = {
        mockServerUrl: options.server,
        outputDir: options.output,
        formats: formatsArg, // Pass original string
        suites: options.suites,
        quick: options.quick,
        verbose: options.verbose
      };

      // Add orientation filter if specified
      if (options.orientation) {
        console.log(`🔄 Orientation filter: ${options.orientation}`);
      }

      const batchRunner = new BatchTestRunner(config);
      const summary = await batchRunner.runBatchTests();

      console.log(`\n📊 Format Testing Results: ${summary.passed}/${summary.total} passed`);

      if (summary.failed > 0) {
        console.log(`❌ ${summary.failed} tests failed`);
        process.exit(1);
      } else {
        console.log('✅ All format tests passed!');
      }

    } catch (error) {
      console.error('❌ Format testing failed:', error.message);
      process.exit(1);
    }
  });

program.parse();