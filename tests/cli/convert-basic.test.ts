/**
 * Basic Convert Command Tests
 *
 * Tests for the core convert functionality of the Printeer CLI
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

describe('Convert Command - Basic Functionality', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempOutputDir('convert-basic');
  });

  afterEach(() => {
    cleanupTempDir('convert-basic');
  });

  test('should convert simple HTML page to PDF', async () => {
    const outputFile = join(tempDir, generateTestFileName('simple-pdf'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--format', 'A4'
    ]);

    assertions.commandSucceeded(result, 'Convert command should succeed');
    assertions.outputContains(result, 'Conversion complete', 'Should show completion message');
    assertions.reasonableExecutionTime(result, 15000, 'Should complete in reasonable time');

    const validation = validateFile(outputFile);
    assertions.validPdf(validation, 'Should generate valid PDF');
    expect(validation.size).toBeGreaterThan(10000); // At least 10KB
  });

  test('should convert to different page formats', async () => {
    const formats = ['A4', 'A3', 'Letter', 'Legal'];

    for (const format of formats) {
      const outputFile = join(tempDir, generateTestFileName(`format-${format.toLowerCase()}`));

      const result = await runCliCommand('convert', [
        '--url', TEST_CONFIG.testUrls.simple,
        '--output', outputFile,
        '--format', format
      ]);

      assertions.commandSucceeded(result, `Convert with format ${format} should succeed`);

      const validation = validateFile(outputFile);
      assertions.validPdf(validation, `Should generate valid PDF for format ${format}`);
    }
  });

  test('should handle orientation options', async () => {
    const orientations = ['portrait', 'landscape'];

    for (const orientation of orientations) {
      const outputFile = join(tempDir, generateTestFileName(`orientation-${orientation}`));

      const result = await runCliCommand('convert', [
        '--url', TEST_CONFIG.testUrls.simple,
        '--output', outputFile,
        '--format', 'A4',
        '--orientation', orientation
      ]);

      assertions.commandSucceeded(result, `Convert with ${orientation} orientation should succeed`);

      const validation = validateFile(outputFile);
      assertions.validPdf(validation, `Should generate valid PDF for ${orientation} orientation`);
    }
  });

  test('should handle margin settings', async () => {
    const marginTests = [
      { margins: '1in', name: 'uniform-1in' },
      { margins: '2cm', name: 'uniform-2cm' },
      { margins: 'none', name: 'no-margins' }
    ];

    for (const { margins, name } of marginTests) {
      const outputFile = join(tempDir, generateTestFileName(`margins-${name}`));

      const result = await runCliCommand('convert', [
        '--url', TEST_CONFIG.testUrls.simple,
        '--output', outputFile,
        '--margins', margins
      ]);

      assertions.commandSucceeded(result, `Convert with margins ${margins} should succeed`);

      const validation = validateFile(outputFile);
      assertions.validPdf(validation, `Should generate valid PDF with margins ${margins}`);
    }
  });

  test('should handle viewport options', async () => {
    const viewports = ['800x600', '1024x768', '1920x1080'];

    for (const viewport of viewports) {
      const outputFile = join(tempDir, generateTestFileName(`viewport-${viewport.replace('x', '_')}`));

      const result = await runCliCommand('convert', [
        '--url', TEST_CONFIG.testUrls.simple,
        '--output', outputFile,
        '--viewport', viewport
      ]);

      assertions.commandSucceeded(result, `Convert with viewport ${viewport} should succeed`);

      const validation = validateFile(outputFile);
      assertions.validPdf(validation, `Should generate valid PDF with viewport ${viewport}`);
    }
  });

  test('should handle print background option', async () => {
    const outputFile = join(tempDir, generateTestFileName('print-background'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.images,
      '--output', outputFile,
      '--print-background'
    ]);

    assertions.commandSucceeded(result, 'Convert with print background should succeed');

    const validation = validateFile(outputFile);
    assertions.validPdf(validation, 'Should generate valid PDF with background');
  });

  test('should handle quality settings', async () => {
    const qualities = [30, 50, 75, 95];

    for (const quality of qualities) {
      const outputFile = join(tempDir, generateTestFileName(`quality-${quality}`));

      const result = await runCliCommand('convert', [
        '--url', TEST_CONFIG.testUrls.images,
        '--output', outputFile,
        '--quality', quality.toString()
      ]);

      assertions.commandSucceeded(result, `Convert with quality ${quality} should succeed`);

      const validation = validateFile(outputFile);
      assertions.validPdf(validation, `Should generate valid PDF with quality ${quality}`);
    }
  });

  test('should handle wait conditions', async () => {
    const waitConditions = [
      { condition: 'load', name: 'load' },
      { condition: 'domcontentloaded', name: 'dom-ready' },
      { condition: 'networkidle0', name: 'network-idle0' },
      { condition: 'networkidle2', name: 'network-idle2' }
    ];

    for (const { condition, name } of waitConditions) {
      const outputFile = join(tempDir, generateTestFileName(`wait-${name}`));

      const result = await runCliCommand('convert', [
        '--url', TEST_CONFIG.testUrls.simple,
        '--output', outputFile,
        '--wait-until', condition
      ]);

      assertions.commandSucceeded(result, `Convert with wait condition ${condition} should succeed`);

      const validation = validateFile(outputFile);
      assertions.validPdf(validation, `Should generate valid PDF with wait condition ${condition}`);
    }
  });

  test('should handle timeout settings', async () => {
    const outputFile = join(tempDir, generateTestFileName('custom-timeout'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile,
      '--load-timeout', '10000'
    ]);

    assertions.commandSucceeded(result, 'Convert with custom timeout should succeed');

    const validation = validateFile(outputFile);
    assertions.validPdf(validation, 'Should generate valid PDF with custom timeout');
  });

  test('should handle scale factor', async () => {
    const scales = [0.5, 1.0, 1.5, 2.0];

    for (const scale of scales) {
      const outputFile = join(tempDir, generateTestFileName(`scale-${scale.toString().replace('.', '_')}`));

      const result = await runCliCommand('convert', [
        '--url', TEST_CONFIG.testUrls.simple,
        '--output', outputFile,
        '--scale', scale.toString()
      ]);

      assertions.commandSucceeded(result, `Convert with scale ${scale} should succeed`);

      const validation = validateFile(outputFile);
      assertions.validPdf(validation, `Should generate valid PDF with scale ${scale}`);
    }
  });

  test('should handle multiple URLs with outputs', async () => {
    const outputFile1 = join(tempDir, generateTestFileName('multi-1'));
    const outputFile2 = join(tempDir, generateTestFileName('multi-2'));

    const result = await runCliCommand('convert', [
      '--url', TEST_CONFIG.testUrls.simple,
      '--output', outputFile1,
      '--url', TEST_CONFIG.testUrls.rtl,
      '--output', outputFile2
    ]);

    assertions.commandSucceeded(result, 'Convert multiple URLs should succeed');

    const validation1 = validateFile(outputFile1);
    const validation2 = validateFile(outputFile2);

    assertions.validPdf(validation1, 'Should generate valid PDF for first URL');
    assertions.validPdf(validation2, 'Should generate valid PDF for second URL');
  });
});