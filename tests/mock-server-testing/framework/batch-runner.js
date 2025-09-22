import { TestRunner } from './test-runner.js';
import { MockServerManager } from './mock-server-client.js';
import { ParameterBuilder } from './utils/parameter-builder.js';

/**
 * Single test execution runner
 */
export class SingleTestRunner extends TestRunner {
  constructor(options = {}) {
    super(options);
    this.mockServerManager = new MockServerManager();
    this.parameterBuilder = new ParameterBuilder();
  }

  async runSingleTest(testCase, parameters = {}) {
    console.log(`🧪 Starting single test: ${testCase.group}/${testCase.name}`);

    try {
      // Ensure mock server is running
      await this.mockServerManager.ensureServerRunning(this.config.mockServerUrl);

      // Merge with defaults and validate
      const mergedParameters = this.parameterBuilder.mergeWithDefaults(parameters);
      const validationErrors = this.parameterBuilder.validateParameters(mergedParameters);

      if (validationErrors.length > 0) {
        console.warn('Parameter validation warnings:');
        validationErrors.forEach(error => console.warn(`  - ${error}`));
      }

      // Run the test
      const result = await this.runTest(testCase, mergedParameters);

      // Log result
      await this.logTestResult(result);

      return result;

    } catch (error) {
      console.error(`❌ Single test failed: ${error.message}`);
      throw error;
    }
  }

  async runWithMatrix(testCase, options = {}) {
    console.log(`🧪 Running test matrix for: ${testCase.group}/${testCase.name}`);

    try {
      // Ensure mock server is running
      await this.mockServerManager.ensureServerRunning(this.config.mockServerUrl);

      // Generate parameter combinations
      let combinations;
      if (options.quick) {
        combinations = this.parameterBuilder.generateQuickParameters(testCase);
      } else {
        combinations = this.parameterBuilder.generateParameterMatrix(testCase);
      }

      console.log(`📊 Generated ${combinations.length} parameter combinations`);

      const results = [];
      for (const [index, parameters] of combinations.entries()) {
        console.log(`\n[${index + 1}/${combinations.length}] Testing combination:`, parameters);

        const result = await this.runTest(testCase, parameters);
        await this.logTestResult(result);
        results.push(result);

        // Stop on first failure if not continuing on error
        if (!result.success && !options.continueOnError) {
          console.log('🛑 Stopping on first failure');
          break;
        }
      }

      return results;

    } catch (error) {
      console.error(`❌ Matrix test failed: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Batch test execution runner
 */
export class BatchTestRunner extends TestRunner {
  constructor(options = {}) {
    super(options);
    this.mockServerManager = new MockServerManager();
    this.parameterBuilder = new ParameterBuilder();
  }

  async runBatchTests() {
    console.log('🚀 Starting batch test execution');

    try {
      // Ensure mock server is running
      await this.mockServerManager.ensureServerRunning(this.config.mockServerUrl);

      // Load all test suites
      const testSuites = await this.loadTestSuites();

      // Filter suites if specified
      const filteredSuites = this.filterSuites(testSuites);

      console.log(`📋 Running ${filteredSuites.length} test suites`);

      // Run each suite
      for (const suite of filteredSuites) {
        await this.runTestSuite(suite);
      }

      return this.generateBatchSummary();

    } catch (error) {
      console.error(`❌ Batch tests failed: ${error.message}`);
      throw error;
    }
  }

  async loadTestSuites() {
    const suites = [];

    try {
      // Import all test suite modules
      const { basicTestSuite } = await import('../test-suites/basic/basic-test-suite.js');
      const { printTestSuite } = await import('../test-suites/print/print-test-suite.js');
      const { dynamicTestSuite } = await import('../test-suites/dynamic/dynamic-test-suite.js');
      const { authTestSuite } = await import('../test-suites/auth/auth-test-suite.js');
      const { errorsTestSuite } = await import('../test-suites/errors/errors-test-suite.js');
      const { i18nTestSuite } = await import('../test-suites/i18n/i18n-test-suite.js');
      const { mediaTestSuite } = await import('../test-suites/media/media-test-suite.js');
      const { templatesTestSuite } = await import('../test-suites/templates/templates-test-suite.js');
      const { cacheCSPTestSuite } = await import('../test-suites/cache-csp/cache-csp-test-suite.js');
      const { imageTestSuite } = await import('../test-suites/image/image-test-suite.js');
      const { redirectsTestSuite } = await import('../test-suites/redirects/redirects-test-suite.js');
      const { resourcesTestSuite } = await import('../test-suites/resources/resources-test-suite.js');

      suites.push(
        basicTestSuite,
        printTestSuite,
        dynamicTestSuite,
        authTestSuite,
        errorsTestSuite,
        i18nTestSuite,
        mediaTestSuite,
        templatesTestSuite,
        cacheCSPTestSuite,
        imageTestSuite,
        redirectsTestSuite,
        resourcesTestSuite
      );

    } catch (error) {
      console.warn(`Failed to load some test suites: ${error.message}`);
    }

    return suites.filter(suite => suite != null);
  }

  filterSuites(testSuites) {
    let filtered = testSuites;

    // Filter by included suites
    if (this.config.suites) {
      const includeNames = this.config.suites.split(',').map(s => s.trim().toLowerCase());
      filtered = filtered.filter(suite => includeNames.includes(suite.group.toLowerCase()));
    }

    // Filter by excluded suites
    if (this.config.skipSuites) {
      const excludeNames = this.config.skipSuites.split(',').map(s => s.trim().toLowerCase());
      filtered = filtered.filter(suite => !excludeNames.includes(suite.group.toLowerCase()));
    }

    return filtered;
  }

  async runTestSuite(testSuite) {
    console.log(`\n📂 Running test suite: ${testSuite.name}`);

    const suiteStartTime = Date.now();
    let suiteResults = [];

    try {
      for (const testCase of testSuite.testCases) {
        console.log(`\n  🧪 ${testCase.name}`);

        // Generate parameter combinations
        let combinations;
        if (this.config.quick) {
          combinations = this.parameterBuilder.generateQuickParameters(testCase);
        } else if (this.config.smoke) {
          combinations = this.parameterBuilder.generateSmokeParameters();
        } else {
          combinations = this.parameterBuilder.generateParameterMatrix(testCase);
        }

        // Filter by formats if specified
        if (this.config.formats) {
          const formats = this.config.formats.split(',').map(f => f.trim());
          combinations = combinations.filter(params =>
            !params.format || formats.includes(params.format)
          );
        }

        // Run each combination
        for (const parameters of combinations) {
          // Apply suite-specific parameter filtering
          const filteredParams = this.parameterBuilder.filterParametersForSuite(
            parameters,
            testSuite.group
          );

          const result = await this.runTest(testCase, filteredParams);
          await this.logTestResult(result);
          suiteResults.push(result);

          // Stop on failure if not continuing
          if (!result.success && !this.config.continueOnError) {
            console.log('🛑 Stopping suite on failure');
            break;
          }
        }

        if (!this.config.continueOnError && suiteResults.some(r => !r.success)) {
          break;
        }
      }

    } catch (error) {
      console.error(`❌ Test suite '${testSuite.name}' failed: ${error.message}`);
    }

    const suiteDuration = Date.now() - suiteStartTime;
    const suitePassed = suiteResults.filter(r => r.success).length;
    const suiteTotal = suiteResults.length;

    console.log(`\n📊 Suite '${testSuite.name}': ${suitePassed}/${suiteTotal} passed (${suiteDuration}ms)`);

    return suiteResults;
  }

  generateBatchSummary() {
    const summary = this.getSummary();

    console.log(`\n📊 Batch Test Results:`);
    console.log(`   Total Tests: ${summary.total}`);
    console.log(`   Passed: ${summary.passed} (${summary.passRate}%)`);
    console.log(`   Failed: ${summary.failed}`);
    console.log(`   Duration: ${Math.round(summary.duration / 1000)}s`);

    if (summary.failed > 0) {
      console.log(`\n❌ ${summary.failed} tests failed. Check detailed logs for more information.`);
    } else {
      console.log(`\n✅ All tests passed successfully!`);
    }

    return summary;
  }
}

/**
 * Suite-specific test runner
 */
export class SuiteTestRunner extends BatchTestRunner {
  constructor(options = {}) {
    super(options);
    this.suiteNames = options.suites ? options.suites.split(',').map(s => s.trim()) : [];
  }

  async runSpecificSuites(suiteNames) {
    console.log(`🧪 Running specific test suites: ${suiteNames.join(', ')}`);

    try {
      // Ensure mock server is running
      await this.mockServerManager.ensureServerRunning(this.config.mockServerUrl);

      // Load and filter test suites
      const allSuites = await this.loadTestSuites();
      const targetSuites = allSuites.filter(suite =>
        suiteNames.some(name => name.toLowerCase() === suite.group.toLowerCase())
      );

      if (targetSuites.length === 0) {
        throw new Error(`No test suites found matching: ${suiteNames.join(', ')}`);
      }

      console.log(`📋 Found ${targetSuites.length} matching suites`);

      // Run each suite
      for (const suite of targetSuites) {
        await this.runTestSuite(suite);
      }

      return this.generateBatchSummary();

    } catch (error) {
      console.error(`❌ Suite tests failed: ${error.message}`);
      throw error;
    }
  }
}