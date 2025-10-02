/**
 * CLI Test Setup and Utilities
 *
 * This file provides testing infrastructure for Printeer CLI commands.
 * It includes utilities for running CLI commands, validating outputs,
 * and setting up test environments.
 */

import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync, readFileSync, statSync } from 'fs';
import { tmpdir } from 'os';

const execFileAsync = promisify(execFile);

/**
 * Test configuration
 */
export const TEST_CONFIG = {
  // Path to the CLI script
  cliPath: join(process.cwd(), 'scripts', 'run-cli.js'),

  // Test directories
  tempDir: join(tmpdir(), 'printeer-cli-tests'),
  outputDir: join(process.cwd(), 'tests', 'cli', 'output'),
  fixturesDir: join(process.cwd(), 'tests', 'cli', 'fixtures'),

  // Test URLs
  mockServerUrl: 'http://localhost:4000',
  testUrls: {
    simple: 'http://localhost:4000/static/simple',
    complex: 'http://localhost:4000/static/long?pages=3',
    rtl: 'http://localhost:4000/static/rtl',
    fonts: 'http://localhost:4000/static/fonts',
    images: 'http://localhost:4000/static/images',
    error500: 'http://localhost:4000/error/500',
    redirect: 'http://localhost:4000/redirect/chain?n=2&to=/static/simple'
  },

  // Timeouts
  timeout: 15000  // Reduced timeout for faster test feedback
};

/**
 * CLI command execution result
 */
export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

/**
 * File validation result
 */
export interface FileValidation {
  exists: boolean;
  size: number;
  isValidPdf?: boolean;
  isValidImage?: boolean;
  type?: string;
}

/**
 * Execute a CLI command and return results
 */
export async function runCliCommand(
  command: string,
  args: string[],
  options: { timeout?: number; cwd?: string } = {}
): Promise<CliResult> {
  const startTime = Date.now();

  try {
    const { stdout, stderr } = await execFileAsync(
      'node',
      [TEST_CONFIG.cliPath, command, ...args],
      {
        timeout: options.timeout || TEST_CONFIG.timeout,
        cwd: options.cwd || process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          PRINTEER_BUNDLED_ONLY: '1', // Use bundled Chromium for faster startup
          PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 'false',
          PRINTEER_BROWSER_TIMEOUT: '5000', // Very fast browser timeout for tests
          PRINTEER_BROWSER_POOL_MIN: '0',
          PRINTEER_BROWSER_POOL_MAX: '3', // Allow small pool for batch tests
          PRINTEER_BROWSER_HEADLESS: 'new',
          PRINTEER_MAX_MEMORY_MB: '512',
          PRINTEER_MAX_CONCURRENT_REQUESTS: '3', // Allow concurrency for batch tests
          // Note: Don't force oneshot here - let batch commands use pool strategy
          PRINTEER_CLI_MODE: '1' // Ensure CLI mode detection works
        }
      }
    );

    return {
      stdout,
      stderr,
      exitCode: 0,
      duration: Date.now() - startTime
    };
  } catch (error: unknown) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.code || 1,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Validate a generated file
 */
export function validateFile(filePath: string): FileValidation {
  const result: FileValidation = {
    exists: existsSync(filePath),
    size: 0
  };

  if (result.exists) {
    const stats = statSync(filePath);
    result.size = stats.size;

    // Check file type based on extension and content
    const ext = filePath.split('.').pop()?.toLowerCase();

    if (ext === 'pdf') {
      result.type = 'pdf';
      result.isValidPdf = checkPdfValid(filePath);
    } else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
      result.type = 'image';
      result.isValidImage = checkImageValid(filePath);
    }
  }

  return result;
}

/**
 * Check if a PDF file is valid
 */
function checkPdfValid(filePath: string): boolean {
  try {
    const buffer = readFileSync(filePath, { encoding: null });
    return buffer.length > 0 && buffer.toString('ascii', 0, 4) === '%PDF';
  } catch {
    return false;
  }
}

/**
 * Check if an image file is valid
 */
function checkImageValid(filePath: string): boolean {
  try {
    const stats = statSync(filePath);
    return stats.size > 100; // Minimum reasonable image size
  } catch {
    return false;
  }
}

/**
 * Create a temporary output directory for tests
 */
export function createTempOutputDir(testName: string): string {
  const testDir = join(TEST_CONFIG.tempDir, testName);
  if (existsSync(testDir)) {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // If cleanup fails, create a unique directory instead
      const uniqueDir = join(TEST_CONFIG.tempDir, `${testName}-${Date.now()}`);
      mkdirSync(uniqueDir, { recursive: true });
      return uniqueDir;
    }
  }
  mkdirSync(testDir, { recursive: true });
  return testDir;
}

/**
 * Clean up temporary test files and browser processes
 */
export function cleanupTempDir(testName: string): void {
  const testDir = join(TEST_CONFIG.tempDir, testName);
  if (existsSync(testDir)) {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // On Windows, files might be locked, try again after a short delay
      setTimeout(() => {
        try {
          rmSync(testDir, { recursive: true, force: true });
        } catch (e) {
          // If still failing, just log and continue
          console.warn(`Failed to cleanup ${testDir}:`, e);
        }
      }, 100);
    }
  }

  // Also cleanup any browser processes
  cleanupBrowserProcesses().catch(error => {
    console.warn('Browser cleanup failed:', error);
  });
}

/**
 * Cleanup browser processes after tests
 */
export async function cleanupBrowserProcesses(): Promise<void> {
  try {
    // Use the comprehensive test cleanup
    const { performTestCleanup } = await import('../src/test-utils/test-cleanup');
    await performTestCleanup();
  } catch (error) {
    console.warn('Failed to cleanup browser processes:', error);
  }
}

/**
 * Generate unique test file names
 */
export function generateTestFileName(
  testName: string,
  format: string = 'pdf',
  timestamp: boolean = true
): string {
  const ts = timestamp ? `_${Date.now()}` : '';
  return `test-${testName}${ts}.${format}`;
}

/**
 * Wait for mock server to be available
 */
export async function waitForMockServer(maxRetries: number = 10): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${TEST_CONFIG.mockServerUrl}/__health`);
      if (response.ok) {
        return true;
      }
    } catch {
      // Server not ready
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

/**
 * Create test configuration files
 */
export function createTestConfig(config: unknown, filename: string = 'test-config.json'): string {
  const configPath = join(TEST_CONFIG.tempDir, filename);
  mkdirSync(TEST_CONFIG.tempDir, { recursive: true });
  require('fs').writeFileSync(configPath, JSON.stringify(config, null, 2));
  return configPath;
}

/**
 * Common test assertions
 */
export const assertions = {
  /**
   * Assert CLI command succeeded
   */
  commandSucceeded(result: CliResult, message?: string): void {
    if (result.exitCode !== 0) {
      throw new Error(
        `${message || 'Command failed'}: Exit code ${result.exitCode}\n` +
        `stderr: ${result.stderr}\nstdout: ${result.stdout}`
      );
    }
  },

  /**
   * Assert CLI command failed with expected exit code
   */
  commandFailed(result: CliResult, expectedCode?: number, message?: string): void {
    if (result.exitCode === 0) {
      throw new Error(`${message || 'Expected command to fail'} but it succeeded`);
    }
    if (expectedCode && result.exitCode !== expectedCode) {
      throw new Error(
        `${message || 'Command failed with wrong exit code'}: ` +
        `Expected ${expectedCode}, got ${result.exitCode}`
      );
    }
  },

  /**
   * Assert file was created successfully
   */
  fileGenerated(validation: FileValidation, message?: string): void {
    if (!validation.exists) {
      throw new Error(`${message || 'File was not created'}`);
    }
    if (validation.size === 0) {
      throw new Error(`${message || 'File is empty'}`);
    }
  },

  /**
   * Assert PDF is valid
   */
  validPdf(validation: FileValidation, message?: string): void {
    this.fileGenerated(validation, message);
    if (!validation.isValidPdf) {
      throw new Error(`${message || 'Generated PDF is invalid'}`);
    }
  },

  /**
   * Assert image is valid
   */
  validImage(validation: FileValidation, message?: string): void {
    this.fileGenerated(validation, message);
    if (!validation.isValidImage) {
      throw new Error(`${message || 'Generated image is invalid'}`);
    }
  },

  /**
   * Assert output contains expected text
   */
  outputContains(result: CliResult, text: string, message?: string): void {
    if (!result.stdout.includes(text)) {
      throw new Error(
        `${message || 'Output does not contain expected text'}: "${text}"\n` +
        `stdout: ${result.stdout}`
      );
    }
  },

  /**
   * Assert command completed within reasonable time
   */
  reasonableExecutionTime(result: CliResult, maxMs: number = 30000, message?: string): void {
    if (result.duration > maxMs) {
      throw new Error(
        `${message || 'Command took too long'}: ${result.duration}ms (max: ${maxMs}ms)`
      );
    }
  }
};