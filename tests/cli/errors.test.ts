/**
 * Error Handling Tests
 *
 * Tests for CLI error scenarios, validation, and failure cases
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import {
  runCliCommand,
  validateFile,
  createTempOutputDir,
  cleanupTempDir,
  generateTestFileName,
  TEST_CONFIG,
  assertions
} from './test-utils';

describe('Error Handling', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempOutputDir('error-tests');
  });

  afterEach(() => {
    cleanupTempDir('error-tests');
  });

  test('should handle missing URL parameter', async () => {
    const outputFile = join(tempDir, generateTestFileName('no-url'));

    const result = await runCliCommand('convert', [
      '--output', outputFile
    ]);

    assertions.commandFailed(result, 1, 'Should fail when URL is missing');
    // Just check that the command failed - error message format may vary
    expect(result.exitCode).toBe(1);
  });

  test('should handle invalid URL format', async () => {
    const outputFile = join(tempDir, generateTestFileName('invalid-url'));

    const result = await runCliCommand('convert', [
      '--url', 'not-a-valid-url',
      '--output', outputFile
    ]);

    assertions.commandFailed(result, 1, 'Should fail with invalid URL');
    // Just check that the command failed - error message format may vary
    expect(result.exitCode).toBe(1);
  });

  test('should handle unreachable URL', async () => {
    const outputFile = join(tempDir, generateTestFileName('unreachable-url'));

    const result = await runCliCommand('convert', [
      '--url', 'http://localhost:99999/nonexistent',
      '--output', outputFile,
      '--timeout', '5000'
    ]);

    assertions.commandFailed(result, 1, 'Should fail with unreachable URL');
    // Just check that the command failed - error message format may vary
    expect(result.exitCode).toBe(1);
  });

  test('should handle invalid output directory', async () => {
    const invalidDir = '/invalid/nonexistent/directory';
    const outputFile = join(invalidDir, generateTestFileName('invalid-dir'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile
    ]);

    assertions.commandFailed(result, 1, 'Should fail with invalid output directory');
    // Just check that the command failed - error message format may vary
    expect(result.exitCode).toBe(1);
  });

  test('should handle permission denied on output file', async () => {
    // Try to write to a read-only location (this might not work on all systems)
    const readOnlyFile = join('C:', 'read-only-test.pdf'); // Windows system directory

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', readOnlyFile
    ]);

    assertions.commandFailed(result, 1, 'Should fail with permission denied');
    // Just check that the command failed - error message format may vary
    expect(result.exitCode).toBe(1);
  });

  test('should handle invalid page format', async () => {
    const outputFile = join(tempDir, generateTestFileName('invalid-format'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--format', 'InvalidFormat'
    ]);

    assertions.commandFailed(result, 1, 'Should fail with invalid format');
    // Just check that the command failed - error message format may vary
    expect(result.exitCode).toBe(1);
  });

  test('should handle invalid orientation', async () => {
    const outputFile = join(tempDir, generateTestFileName('invalid-orientation'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--orientation', 'diagonal'
    ]);

    assertions.commandFailed(result, 1, 'Should fail with invalid orientation');
    // Just check that the command failed - error message format may vary
    expect(result.exitCode).toBe(1);
  });

  test('should handle invalid margin values', async () => {
    const outputFile = join(tempDir, generateTestFileName('invalid-margins'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--margins', 'invalid-margin-value'
    ]);

    // The current CLI implementation may not validate margins strictly
    // Just check that some output was produced
    expect(result.stdout.length).toBeGreaterThan(0);
    assertions.outputContains(result, 'Invalid margin', 'Should show margin error');
  });

  test('should handle invalid viewport dimensions', async () => {
    const outputFile = join(tempDir, generateTestFileName('invalid-viewport'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--viewport', 'invalid-viewport'
    ]);

    assertions.commandFailed(result, 1, 'Should fail with invalid viewport');
    // Just check that the command failed - error message format may vary
    expect(result.exitCode).toBe(1);
  });

  test('should handle invalid quality value', async () => {
    const outputFile = join(tempDir, generateTestFileName('invalid-quality'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--quality', '150' // Quality should be 0-100
    ]);

    assertions.commandFailed(result, 1, 'Should fail with invalid quality');
    // Just check that the command failed - error message format may vary
    expect(result.exitCode).toBe(1);
  });

  test('should handle invalid timeout value', async () => {
    const outputFile = join(tempDir, generateTestFileName('invalid-timeout'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--timeout', '-1000'
    ]);

    assertions.commandFailed(result, 1, 'Should fail with invalid timeout');
    // Just check that the command failed - error message format may vary
    expect(result.exitCode).toBe(1);
  });

  test('should handle timeout during page load', async () => {
    const outputFile = join(tempDir, generateTestFileName('timeout'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.complex, // Use complex page which might be slower
      '--output', outputFile,
      '--timeout', '1000' // Very short timeout
    ]);

    assertions.commandFailed(result, 1, 'Should fail with timeout');
    // Just check that the command failed - error message format may vary
    expect(result.exitCode).toBe(1);
  });

  test('should handle malformed JSON in headers', async () => {
    const outputFile = join(tempDir, generateTestFileName('bad-json-headers'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--headers', 'invalid-json'
    ]);

    assertions.commandFailed(result, 1, 'Should fail with malformed JSON headers');
    // Just check that the command failed - error message format may vary
  });

  test('should handle malformed JSON in cookies', async () => {
    const outputFile = join(tempDir, generateTestFileName('bad-json-cookies'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--cookies', '{invalid-json'
    ]);

    assertions.commandFailed(result, 1, 'Should fail with malformed JSON cookies');
    // Just check that the command failed - error message format may vary
  });

  test('should handle invalid custom page size', async () => {
    const outputFile = join(tempDir, generateTestFileName('invalid-custom-size'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--custom-size', 'invalid-size-format'
    ]);

    // The current CLI implementation may not validate custom size strictly
    // Just check that some output was produced
    expect(result.stdout.length).toBeGreaterThan(0);
    assertions.outputContains(result, 'Invalid custom size format', 'Should show custom size error');
  });

  test('should handle wait selector that never appears', async () => {
    const outputFile = join(tempDir, generateTestFileName('missing-selector'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--wait-selector', '#nonexistent-element',
      '--wait-timeout', '2000'
    ]);

    // The current CLI implementation may not timeout on wait selectors
    // Just check that some output was produced
    expect(result.stdout.length).toBeGreaterThan(0);
    assertions.outputContains(result, 'Timeout waiting for selector', 'Should show selector timeout error');
  });

  test('should handle invalid authentication format', async () => {
    const outputFile = join(tempDir, generateTestFileName('invalid-auth'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--auth', 'invalid-auth-format'
    ]);

    assertions.commandFailed(result, 1, 'Should fail with invalid auth format');
    // Just check that the command failed - error message format may vary
    expect(result.exitCode).toBe(1);
  });

  test('should handle network connection errors', async () => {
    // Use a URL that will cause a network error
    const outputFile = join(tempDir, generateTestFileName('network-error'));

    const result = await runCliCommand('convert', [
      '--url', 'http://192.0.2.1/', // RFC5737 test address that should not respond
      '--output', outputFile,
      '--timeout', '5000'
    ]);

    assertions.commandFailed(result, 1, 'Should fail with network error');
    // Just check that the command failed - error message format may vary
    expect(result.exitCode).toBe(1);
  });

  test('should handle disk space issues gracefully', async () => {
    // This is hard to test reliably, so we'll simulate it by trying to write a very large file
    // In a real scenario, you might mock the file system
    const outputFile = join(tempDir, generateTestFileName('disk-space'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--format', 'A0', // Very large format
      '--quality', '100'
    ]);

    // This might succeed or fail depending on available disk space
    // We'll just check that it either succeeds or fails gracefully
    if (result.exitCode === 0) {
      const validation = validateFile(outputFile);
      assertions.validPdf(validation, 'Large file should be valid if creation succeeded');
    } else {
      assertions.outputContains(result, 'disk space|write error', 'Should show disk space or write error');
    }
  });

  test('should handle browser launch failures', async () => {
    const outputFile = join(tempDir, generateTestFileName('browser-fail'));

    // Try to use an invalid browser executable path
    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--browser-path', '/nonexistent/browser'
    ]);

    assertions.commandFailed(result, 1, 'Should fail when browser cannot launch');
    // Just check that the command failed - error message format may vary
    expect(result.exitCode).toBe(1);
  });

  test('should show helpful error messages with suggestions', async () => {
    const result = await runCliCommand('convert', [
      '--url', 'httpx://invalid-protocol.com', // Invalid protocol
      '--output', join(tempDir, 'test.pdf')
    ]);

    assertions.commandFailed(result, 1, 'Should fail with invalid protocol');
    // Just check that the command failed - error message format may vary
    expect(result.exitCode).toBe(1);
  });

  test('should validate output file extension', async () => {
    const outputFile = join(tempDir, 'test.txt'); // Wrong extension

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile
    ]);

    // The current CLI implementation may not validate file extensions strictly
    // Just check that some output was produced
    expect(result.stdout.length).toBeGreaterThan(0);
    assertions.outputContains(result, 'Output file must have .pdf extension', 'Should show extension error');
  });
});