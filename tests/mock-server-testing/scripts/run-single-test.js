#!/usr/bin/env node

import { Command } from 'commander';
import { SingleTestRunner } from '../framework/batch-runner.js';

const program = new Command();

program
  .name('printeer-single-test')
  .description('Run a single Printeer test case against mock server')
  .argument('<testCase>', 'Test case in format: group/test-name (e.g., basic/simple-html)')
  .option('-s, --server <url>', 'Mock server URL', 'http://localhost:4000')
  .option('-o, --output <path>', 'Output file path (optional, auto-generated if not provided)')
  .option('-f, --format <format>', 'Page format (A4, Letter, A3, etc.)', 'A4')
  .option('--orientation <orientation>', 'Page orientation (portrait, landscape)', 'portrait')
  .option('--margins <margins>', 'Page margins (1in, 2cm, none, etc.)', '1in')
  .option('--scale <scale>', 'Scale factor (0.5, 1.0, 1.5, 2.0)', '1.0')
  .option('--quality <quality>', 'Output quality (low, medium, high)', 'medium')
  .option('--background', 'Include background graphics')
  .option('--no-background', 'Exclude background graphics')
  .option('--viewport <viewport>', 'Viewport size (1024x768, 1280x720, etc.)')
  .option('--wait-for <strategy>', 'Wait strategy (timeout:5000, selector:#content, function:window.__ready, networkidle2)')
  .option('--timeout <ms>', 'Timeout in milliseconds', '30000')
  .option('--retries <count>', 'Retry count', '2')
  .option('--headers <headers>', 'Custom headers as JSON string')
  .option('--cookies <cookies>', 'Custom cookies as JSON string')
  .option('--user-agent <ua>', 'Custom user agent string')
  .option('--matrix', 'Run all parameter combinations for this test case')
  .option('--quick', 'Use quick parameter matrix (reduced combinations)')
  .option('--verbose', 'Verbose output')
  .action(async (testCaseArg, options) => {
    try {
      console.log(`🧪 Running single test: ${testCaseArg}`);
      console.log(`📍 Target Server: ${options.server}`);

      // Parse test case
      const [group, testName] = testCaseArg.split('/');
      if (!group || !testName) {
        throw new Error('Test case must be in format: group/test-name (e.g., basic/simple-html)');
      }

      // Load the appropriate test suite
      let testSuite;
      try {
        const suiteModule = await import(`../test-suites/${group}/${group}-test-suite.js`);
        const suiteKey = `${group}TestSuite`;
        testSuite = suiteModule[suiteKey] || Object.values(suiteModule)[0];
      } catch (error) {
        throw new Error(`Failed to load test suite for group '${group}': ${error.message}`);
      }

      // Find the specific test case
      const testCase = testSuite.testCases.find(tc => tc.name === testName);
      if (!testCase) {
        const available = testSuite.testCases.map(tc => tc.name).join(', ');
        throw new Error(`Test case '${testName}' not found in group '${group}'. Available: ${available}`);
      }

      // Build parameters from options
      const parameters = {};
      if (options.format) parameters.format = options.format;
      if (options.orientation) parameters.orientation = options.orientation;
      if (options.margins) parameters.margins = options.margins;
      if (options.scale) parameters.scale = parseFloat(options.scale);
      if (options.quality) parameters.quality = options.quality;
      if (options.background !== undefined) parameters.background = options.background;
      if (options.viewport) parameters.viewport = options.viewport;
      if (options.waitFor) parameters.waitFor = options.waitFor;
      if (options.timeout) parameters.timeout = parseInt(options.timeout);
      if (options.retries) parameters.retries = parseInt(options.retries);
      if (options.userAgent) parameters.userAgent = options.userAgent;

      // Parse JSON strings for headers and cookies
      if (options.headers) {
        try {
          parameters.headers = JSON.parse(options.headers);
        } catch (error) {
          throw new Error(`Invalid headers JSON: ${error.message}`);
        }
      }

      if (options.cookies) {
        try {
          parameters.cookies = JSON.parse(options.cookies);
        } catch (error) {
          throw new Error(`Invalid cookies JSON: ${error.message}`);
        }
      }

      // Initialize single test runner
      const config = {
        mockServerUrl: options.server,
        outputDir: './output',
        timeout: parseInt(options.timeout),
        retries: parseInt(options.retries),
        verbose: options.verbose
      };

      const singleRunner = new SingleTestRunner(config);

      let results;
      if (options.matrix) {
        console.log('📊 Running with parameter matrix');
        results = await singleRunner.runWithMatrix(testCase, {
          quick: options.quick,
          continueOnError: true
        });

        // Summary for matrix results
        const passed = results.filter(r => r.success).length;
        const failed = results.length - passed;

        console.log(`\n📊 Matrix Results: ${passed}/${results.length} passed`);
        if (failed > 0) {
          console.log(`❌ ${failed} combinations failed`);
          process.exit(1);
        } else {
          console.log('✅ All combinations passed!');
        }
      } else {
        console.log('⚙️  Parameters:', JSON.stringify(parameters, null, 2));
        const result = await singleRunner.runSingleTest(testCase, parameters);

        console.log(`\n📊 Test Result: ${result.success ? 'PASSED' : 'FAILED'}`);
        console.log(`⏱️  Duration: ${result.duration}ms`);

        if (result.outputExists) {
          const sizeKB = Math.round(result.outputSize / 1024);
          console.log(`📄 Output: ${result.outputFile} (${sizeKB}KB)`);
        }

        if (!result.success) {
          console.log(`❌ Error: ${result.stderr}`);
          process.exit(1);
        } else {
          console.log('✅ Test passed successfully!');
        }
      }

    } catch (error) {
      console.error('❌ Single test execution failed:', error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse();