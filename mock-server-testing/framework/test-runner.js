import { CLIExecutor, PrinteerCommandBuilder } from './cli-executor.js';
import { MockServerManager, MockServerClient } from './mock-server-client.js';
import { FilenameGenerator } from './utils/filename-generator.js';
import { OutputVerifier } from './output-verifier.js';
import path from 'path';
import fs from 'fs';

/**
 * Main test orchestrator
 */
export class TestRunner {
  constructor(config = {}) {
    this.config = {
      mockServerUrl: 'http://localhost:4000',
      outputDir: './output',
      timeout: 30000,
      retries: 2,
      parallelism: 1,
      ...config
    };

    this.cliExecutor = new CLIExecutor(this.config);
    this.filenameGenerator = new FilenameGenerator();
    this.outputVerifier = new OutputVerifier();
    this.results = [];
  }

  async runTest(testCase, parameters) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/T/, '_').slice(0, -5);

    // Determine output type from expectedOutputs (default to pdf)
    const expectedOutput = testCase.expectedOutputs?.[0] || 'pdf';
    const fileExtension = expectedOutput === 'pdf' ? 'pdf' : expectedOutput;
    const subDir = expectedOutput === 'pdf' ? 'pdfs' : 'images';

    // Use a shorter filename for now to avoid path issues
    const shortName = `${testCase.group}_${testCase.name}_${timestamp}.${fileExtension}`;
    const filename = shortName;

    // Ensure we use absolute paths
    const outputDir = path.resolve(this.config.outputDir);
    const outputPath = path.join(outputDir, subDir, testCase.group, filename);    // Ensure output directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    try {
      const command = new PrinteerCommandBuilder(this.config.mockServerUrl)
        .url(testCase.endpoint)
        .output(outputPath);

      // Apply all parameters
      this.applyParameters(command, parameters);

      const commandArgs = command.build();
      console.log(`🧪 Running: ${commandArgs.join(' ')}`);

      const result = await this.cliExecutor.executeCommand(commandArgs, {
        timeout: parameters.timeout || this.config.timeout,
        retries: parameters.retries || this.config.retries
      });

      // Validate output
      const outputValidation = await this.cliExecutor.validateOutput(outputPath, expectedOutput);

      const testResult = {
        testCase: testCase.name,
        group: testCase.group,
        endpoint: testCase.endpoint,
        parameters,
        command: commandArgs.join(' '),
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        outputFile: outputPath,
        outputExists: outputValidation.exists,
        outputSize: outputValidation.size,
        outputValid: outputValidation.valid,
        duration: result.duration,
        attempts: result.attempts,
        success: result.success && outputValidation.valid,
        timestamp: new Date().toISOString()
      };

      this.results.push(testResult);
      return testResult;

    } catch (error) {
      const testResult = {
        testCase: testCase.name,
        group: testCase.group,
        endpoint: testCase.endpoint,
        parameters,
        command: 'Failed to build command',
        exitCode: 1,
        stdout: '',
        stderr: error.message,
        outputFile: outputPath,
        outputExists: false,
        outputSize: 0,
        outputValid: false,
        duration: 0,
        attempts: 1,
        success: false,
        timestamp: new Date().toISOString()
      };

      this.results.push(testResult);
      return testResult;
    }
  }

  applyParameters(commandBuilder, parameters) {
    // Apply all parameters to the command builder
    if (parameters.format) commandBuilder.format(parameters.format);
    if (parameters.orientation) commandBuilder.orientation(parameters.orientation);
    if (parameters.margins) commandBuilder.margins(parameters.margins);
    if (parameters.scale) commandBuilder.scale(parameters.scale);
    if (parameters.quality) {
      // Convert quality strings to numbers
      const qualityMap = { 'low': 30, 'medium': 75, 'high': 95 };
      const qualityValue = qualityMap[parameters.quality] || parseInt(parameters.quality) || 75;
      commandBuilder.quality(qualityValue);
    }
    if (parameters.background !== undefined) commandBuilder.background(parameters.background);
    if (parameters.viewport) {
      const [width, height] = parameters.viewport.split('x');
      commandBuilder.viewport(width, height);
    }
    if (parameters.waitFor) commandBuilder.waitFor(parameters.waitFor);
    if (parameters.timeout) commandBuilder.timeout(parameters.timeout);
    if (parameters.headers) commandBuilder.headers(parameters.headers);
    if (parameters.cookies) commandBuilder.cookies(parameters.cookies);
    if (parameters.retries) commandBuilder.retries(parameters.retries);
    if (parameters.userAgent) commandBuilder.userAgent(parameters.userAgent);
  }

  generateParameterCombinations(parameterMatrix) {
    if (!parameterMatrix || Object.keys(parameterMatrix).length === 0) {
      return [{}]; // Return single empty combination if no matrix
    }

    const keys = Object.keys(parameterMatrix);
    const combinations = [];

    function generateCombinations(index, currentCombination) {
      if (index === keys.length) {
        combinations.push({ ...currentCombination });
        return;
      }

      const key = keys[index];
      const values = parameterMatrix[key];

      for (const value of values) {
        currentCombination[key] = value;
        generateCombinations(index + 1, currentCombination);
      }
    }

    generateCombinations(0, {});
    return combinations;
  }

  async logTestResult(result) {
    const status = result.success ? '✅' : '❌';
    const size = result.outputSize > 0 ? `(${Math.round(result.outputSize / 1024)}KB)` : '';

    console.log(`${status} ${result.group}/${result.testCase}: ${result.duration}ms ${size}`);

    if (!result.success) {
      console.log(`   Error: ${result.stderr}`);
    }
  }

  getResults() {
    return this.results;
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = total - passed;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    return {
      total,
      passed,
      failed,
      duration: totalDuration,
      passRate: total > 0 ? (passed / total * 100).toFixed(2) : 0
    };
  }
}