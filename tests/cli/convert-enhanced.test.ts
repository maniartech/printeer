/**
 * Enhanced CLI Options Tests
 *
 * Tests for advanced CLI options and configuration features
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import {
  runCliCommand,
  validateFile,
  createTempOutputDir,
  cleanupTempDir,
  generateTestFileName,
  createTestConfig,
  TEST_CONFIG,
  assertions
} from './test-utils';

describe('Convert Command - Enhanced Options', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempOutputDir('convert-enhanced');
  });

  afterEach(() => {
    cleanupTempDir('convert-enhanced');
  });

  test('should handle custom page sizes', async () => {
    const outputFile = join(tempDir, generateTestFileName('custom-size'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--custom-size', '210mm,297mm'
    ]);

    assertions.commandSucceeded(result, 'Convert with custom page size should succeed');

    const validation = validateFile(outputFile);
    assertions.validPdf(validation, 'Should generate valid PDF with custom size');
  });

  test('should handle device emulation options', async () => {
    const outputFile = join(tempDir, generateTestFileName('mobile-emulation'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--mobile',
      '--device-scale', '2.0'
    ]);

    assertions.commandSucceeded(result, 'Convert with mobile emulation should succeed');

    const validation = validateFile(outputFile);
    assertions.validPdf(validation, 'Should generate valid PDF with mobile emulation');
  });

  test('should handle media type emulation', async () => {
    const mediaTypes = ['screen', 'print'];

    for (const mediaType of mediaTypes) {
      const outputFile = join(tempDir, generateTestFileName(`media-${mediaType}`));

      const result = await runCliCommand('convert', [
        '--url', TEST_CONFIG.testUrls.simple,
        '--output', outputFile,
        '--media-type', mediaType
      ]);

      assertions.commandSucceeded(result, `Convert with media type ${mediaType} should succeed`);

      const validation = validateFile(outputFile);
      assertions.validPdf(validation, `Should generate valid PDF with media type ${mediaType}`);
    }
  });

  test('should handle color scheme preferences', async () => {
    const colorSchemes = ['light', 'dark', 'no-preference'];

    for (const scheme of colorSchemes) {
      const outputFile = join(tempDir, generateTestFileName(`color-${scheme}`));

      const result = await runCliCommand('convert', [
        '--url', TEST_CONFIG.testUrls.simple,
        '--output', outputFile,
        '--color-scheme', scheme
      ]);

      assertions.commandSucceeded(result, `Convert with color scheme ${scheme} should succeed`);

      const validation = validateFile(outputFile);
      assertions.validPdf(validation, `Should generate valid PDF with color scheme ${scheme}`);
    }
  });

  test('should handle timezone and locale settings', async () => {
    const outputFile = join(tempDir, generateTestFileName('locale-timezone'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--timezone', 'America/New_York',
      '--locale', 'en-US'
    ]);

    assertions.commandSucceeded(result, 'Convert with timezone and locale should succeed');

    const validation = validateFile(outputFile);
    assertions.validPdf(validation, 'Should generate valid PDF with timezone and locale');
  });

  test('should handle custom user agent', async () => {
    const outputFile = join(tempDir, generateTestFileName('custom-ua'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--user-agent', 'PrinteerTest/1.0'
    ]);

    assertions.commandSucceeded(result, 'Convert with custom user agent should succeed');

    const validation = validateFile(outputFile);
    assertions.validPdf(validation, 'Should generate valid PDF with custom user agent');
  });

  test('should handle wait selector', async () => {
    const outputFile = join(tempDir, generateTestFileName('wait-selector'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--wait-selector', 'body',
      '--wait-timeout', '5000'
    ]);

    assertions.commandSucceeded(result, 'Convert with wait selector should succeed');

    const validation = validateFile(outputFile);
    assertions.validPdf(validation, 'Should generate valid PDF with wait selector');
  });

  test('should handle wait delay', async () => {
    const outputFile = join(tempDir, generateTestFileName('wait-delay'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--wait-delay', '2000'
    ]);

    assertions.commandSucceeded(result, 'Convert with wait delay should succeed');

    const validation = validateFile(outputFile);
    assertions.validPdf(validation, 'Should generate valid PDF with wait delay');
  });

  test('should handle custom headers', async () => {
    const outputFile = join(tempDir, generateTestFileName('custom-headers'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--headers', '{"X-Test-Header":"PrinteerTest","Accept-Language":"en-US,en;q=0.9"}'
    ]);

    assertions.commandSucceeded(result, 'Convert with custom headers should succeed');

    const validation = validateFile(outputFile);
    assertions.validPdf(validation, 'Should generate valid PDF with custom headers');
  });

  test('should handle cookies', async () => {
    const outputFile = join(tempDir, generateTestFileName('cookies'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--cookies', '{"test-cookie":"test-value","session-id":"abc123"}'
    ]);

    assertions.commandSucceeded(result, 'Convert with cookies should succeed');

    const validation = validateFile(outputFile);
    assertions.validPdf(validation, 'Should generate valid PDF with cookies');
  });

  test('should handle basic authentication', async () => {
    const outputFile = join(tempDir, generateTestFileName('basic-auth'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--auth', 'user:password'
    ]);

    assertions.commandSucceeded(result, 'Convert with basic auth should succeed');

    const validation = validateFile(outputFile);
    assertions.validPdf(validation, 'Should generate valid PDF with basic auth');
  });

  test('should handle resource blocking', async () => {
    const outputFile = join(tempDir, generateTestFileName('blocked-resources'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.images,
      '--output', outputFile,
      '--block-resources', 'image,font'
    ]);

    assertions.commandSucceeded(result, 'Convert with blocked resources should succeed');

    const validation = validateFile(outputFile);
    assertions.validPdf(validation, 'Should generate valid PDF with blocked resources');
  });

  test('should handle JavaScript disabled', async () => {
    const outputFile = join(tempDir, generateTestFileName('no-js'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--disable-javascript'
    ]);

    assertions.commandSucceeded(result, 'Convert with JavaScript disabled should succeed');

    const validation = validateFile(outputFile);
    assertions.validPdf(validation, 'Should generate valid PDF with JavaScript disabled');
  });

  test('should handle PDF-specific options', async () => {
    const outputFile = join(tempDir, generateTestFileName('pdf-options'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--tagged-pdf',
      '--pdf-outline',
      '--prefer-css-page-size'
    ]);

    assertions.commandSucceeded(result, 'Convert with PDF-specific options should succeed');

    const validation = validateFile(outputFile);
    assertions.validPdf(validation, 'Should generate valid PDF with PDF-specific options');
  });

  test('should handle retry settings', async () => {
    const outputFile = join(tempDir, generateTestFileName('retry-test'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--retry', '3'
    ]);

    assertions.commandSucceeded(result, 'Convert with retry settings should succeed');

    const validation = validateFile(outputFile);
    assertions.validPdf(validation, 'Should generate valid PDF with retry settings');
  });

  test('should handle output directory with auto-generated filename', async () => {
    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output-dir', tempDir,
      '--title-fallback'
    ]);

    assertions.commandSucceeded(result, 'Convert with output directory should succeed');
    assertions.outputContains(result, 'Conversion complete', 'Should show completion message');

    // Check that a file was created in the temp directory
    const fs = require('fs');
    const files = fs.readdirSync(tempDir).filter((f: string) => f.endsWith('.pdf'));
    expect(files.length).toBeGreaterThan(0);

    if (files.length > 0) {
      const validation = validateFile(join(tempDir, files[0]));
      assertions.validPdf(validation, 'Should generate valid PDF with auto-generated filename');
    }
  });
});