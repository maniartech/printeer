#!/usr/bin/env node

import { Command } from 'commander';
import { BatchTestRunner } from '../framework/batch-runner.js';

const program = new Command();

program
  .name('printeer-orientation-tests')
  .description('Run tests for specific page orientations across all suites')
  .argument('<orientations>', 'Comma-separated orientation names (portrait,landscape)')
  .option('-s, --server <url>', 'Mock server URL', 'http://localhost:4000')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('--suites <suites>', 'Limit to specific test suites')
  .option('--format <format>', 'Test specific format only')
  .option('--quick', 'Use reduced parameter matrix')
  .option('--verbose', 'Verbose output')
  .action(async (orientationsArg, options) => {
    try {
      const orientations = orientationsArg.split(',').map(o => o.trim());

      console.log(`🔄 Testing page orientations: ${orientations.join(', ')}`);
      console.log(`📍 Target Server: ${options.server}`);

      // Initialize batch runner with orientation-specific config
      const config = {
        mockServerUrl: options.server,
        outputDir: options.output,
        orientations: orientationsArg, // Pass original string
        suites: options.suites,
        quick: options.quick,
        verbose: options.verbose
      };

      // Add format filter if specified
      if (options.format) {
        console.log(`📏 Format filter: ${options.format}`);
        config.formats = options.format;
      }

      const batchRunner = new BatchTestRunner(config);
      const summary = await batchRunner.runBatchTests();

      console.log(`\n📊 Orientation Testing Results: ${summary.passed}/${summary.total} passed`);

      if (summary.failed > 0) {
        console.log(`❌ ${summary.failed} tests failed`);
        process.exit(1);
      } else {
        console.log('✅ All orientation tests passed!');
      }

    } catch (error) {
      console.error('❌ Orientation testing failed:', error.message);
      process.exit(1);
    }
  });

program.parse();