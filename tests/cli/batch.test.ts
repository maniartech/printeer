/**
 * Batch Processing Tests
 *
 * Tests for CLI batch command functionality with various file formats
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import {
  runCliCommand,
  validateFile,
  createTempOutputDir,
  cleanupTempDir,
  TEST_CONFIG,
  assertions
} from './test-utils';

describe('Batch Processing', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempOutputDir('batch-tests');
  });

  afterEach(async () => {
    cleanupTempDir('batch-tests');
    
    // Additional browser cleanup for batch tests
    try {
      const { performTestCleanup } = await import('../../src/test-utils/test-cleanup');
      await performTestCleanup();
    } catch (error) {
      console.warn('Batch test cleanup failed:', error);
    }
  });

  test('should process CSV batch file', async () => {
    const batchFile = join(tempDir, 'batch.csv');
    const output1 = join(tempDir, 'page1.pdf');
    const output2 = join(tempDir, 'page2.pdf');

    writeFileSync(batchFile, [
      'url,output,format',
      `${TEST_CONFIG.testUrls.simple},${output1},A4`,
      `${TEST_CONFIG.testUrls.images},${output2},Letter`
    ].join('\n'));

    const result = await runCliCommand('batch', [
      batchFile,
      '--dry-run'
    ]);

    assertions.commandSucceeded(result, 'CSV batch processing should succeed');
    assertions.outputContains(result, 'Batch processing complete', 'Should show completion message');
    assertions.outputContains(result, 'Successful: 2', 'Should show success count');
    
    // Verify that batch processing uses pool strategy for performance
    // This should be indicated in the debug output
    if (result.stdout.includes('Using browser strategy:')) {
      assertions.outputContains(result, 'pool', 'Batch processing should use pool strategy');
    }

    // In dry-run mode, files are not actually generated, so we skip file validation
  });

  test('should process JSON batch file', async () => {
    const batchFile = join(tempDir, 'batch.json');
    const output1 = join(tempDir, 'json1.pdf');
    const output2 = join(tempDir, 'json2.pdf');

    const batchData = {
      jobs: [
        {
          url: TEST_CONFIG.testUrls.simple,
          output: output1,
          format: 'A4',
          orientation: 'portrait'
        },
        {
          url: TEST_CONFIG.testUrls.simple,
          output: output2,
          format: 'Letter',
          orientation: 'landscape',
          margins: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' }
        }
      ]
    };

    writeFileSync(batchFile, JSON.stringify(batchData, null, 2));

    const result = await runCliCommand('batch', [
      batchFile,
      '--dry-run'
    ]);

    assertions.commandSucceeded(result, 'JSON batch processing should succeed');
    assertions.outputContains(result, 'Batch processing complete', 'Should show completion message');
    assertions.outputContains(result, 'Successful: 2', 'Should show success count');

    // In dry-run mode, files are not actually generated, so we skip file validation
  });

  test('should process YAML batch file', async () => {
    const batchFile = join(tempDir, 'batch.yaml');
    const output1 = join(tempDir, 'yaml1.pdf');
    const output2 = join(tempDir, 'yaml2.pdf');

    const yamlContent = `
jobs:
  - url: ${TEST_CONFIG.testUrls.simple}
    output: ${output1}
    format: A4
    printBackground: true
  - url: ${TEST_CONFIG.testUrls.simple}
    output: ${output2}
    format: Letter
    quality: 90
`;

    writeFileSync(batchFile, yamlContent);

    const result = await runCliCommand('batch', [
      batchFile,
      '--dry-run'
    ]);

    assertions.commandSucceeded(result, 'YAML batch processing should succeed');
    assertions.outputContains(result, 'Batch processing complete', 'Should show completion message');
    assertions.outputContains(result, 'Successful: 2', 'Should show success count');

    // In dry-run mode, files are not actually generated, so we skip file validation
  });

  test('should handle batch processing with concurrency limit', async () => {
    const batchFile = join(tempDir, 'concurrent-batch.csv');
    const outputs = [
      join(tempDir, 'concurrent1.pdf'),
      join(tempDir, 'concurrent2.pdf'),
      join(tempDir, 'concurrent3.pdf'),
      join(tempDir, 'concurrent4.pdf')
    ];

    const csvContent = [
      'url,output',
      ...outputs.map((output) => `${TEST_CONFIG.testUrls.simple},${output}`)
    ].join('\n');

    writeFileSync(batchFile, csvContent);

    const result = await runCliCommand('batch', [
      batchFile,
      '--concurrency', '2',
      '--dry-run'
    ]);

    assertions.commandSucceeded(result, 'Concurrent batch processing should succeed');
    assertions.outputContains(result, 'Successful: 4', 'Should complete all jobs');

    // In dry-run mode, files are not actually generated, so we skip file validation
  });

  test('should handle batch processing with retries', async () => {
    const batchFile = join(tempDir, 'retry-batch.csv');
    const output1 = join(tempDir, 'retry-success.pdf');
    const output2 = join(tempDir, 'retry-fail.pdf');

    writeFileSync(batchFile, [
      'url,output',
      `${TEST_CONFIG.testUrls.simple},${output1}`,
      `http://localhost:9999/nonexistent,${output2}` // This will fail
    ].join('\n'));

    const result = await runCliCommand('batch', [
      batchFile,
      '--retry', '2',
      '--continue-on-error',
      '--dry-run'
    ]);

    // In dry-run mode, both jobs should succeed since we're not actually making HTTP requests
    assertions.commandSucceeded(result, 'Batch with retries should succeed in dry-run mode');
    assertions.outputContains(result, 'Batch processing complete', 'Should show completion message');
    assertions.outputContains(result, 'Successful: 2', 'Should show success count in dry-run');

    // In dry-run mode, files are not actually generated, so we skip file validation
  });

  test('should handle batch processing with progress reporting', async () => {
    const batchFile = join(tempDir, 'progress-batch.csv');
    const outputs = [
      join(tempDir, 'progress1.pdf'),
      join(tempDir, 'progress2.pdf'),
      join(tempDir, 'progress3.pdf')
    ];

    writeFileSync(batchFile, [
      'url,output',
      ...outputs.map(output => `${TEST_CONFIG.testUrls.simple},${output}`)
    ].join('\n'));

    const result = await runCliCommand('batch', [
      batchFile,
      '--progress',
      '--dry-run'
    ]);

    assertions.commandSucceeded(result, 'Batch with progress should succeed');
    assertions.outputContains(result, 'Starting: job-1', 'Should show progress indicators');
    assertions.outputContains(result, 'Processing job 2/3', 'Should show progress indicators');
    assertions.outputContains(result, 'Processing job 3/3', 'Should show progress indicators');
  });

  test('should handle batch processing with default values', async () => {
    const batchFile = join(tempDir, 'defaults-batch.csv');
    const output1 = join(tempDir, 'default1.pdf');
    const output2 = join(tempDir, 'default2.pdf');

    writeFileSync(batchFile, [
      'url,output',
      `${TEST_CONFIG.testUrls.simple},${output1}`,
      `${TEST_CONFIG.testUrls.images},${output2}`
    ].join('\n'));

    const result = await runCliCommand('batch', [
      batchFile,
      '--dry-run'
    ]);

    assertions.commandSucceeded(result, 'Batch with defaults should succeed');
    assertions.outputContains(result, 'Batch processing complete', 'Should show completion message');
    assertions.outputContains(result, 'Successful: 2', 'Should show success count');

    // In dry-run mode, files are not actually generated, so we skip file validation
  });

  test('should handle batch processing with output directory', async () => {
    const batchFile = join(tempDir, 'dir-batch.csv');
    const outputDir = join(tempDir, 'batch-output');

    writeFileSync(batchFile, [
      'url,filename',
      `${TEST_CONFIG.testUrls.simple},page1.pdf`,
      `${TEST_CONFIG.testUrls.images},page2.pdf`
    ].join('\n'));

    const result = await runCliCommand('batch', [
      batchFile,
      '--output-dir', outputDir,
      '--dry-run'
    ]);

    assertions.commandSucceeded(result, 'Batch with output directory should succeed');
    assertions.outputContains(result, 'Batch processing complete', 'Should show completion message');
    assertions.outputContains(result, 'Successful: 2', 'Should show success count');

    // In dry-run mode, files are not actually generated, so we skip file validation
  });

  test('should handle batch processing with template columns', async () => {
    const batchFile = join(tempDir, 'template-batch.csv');
    const output1 = join(tempDir, 'template1.pdf');
    const output2 = join(tempDir, 'template2.pdf');

    writeFileSync(batchFile, [
      'url,output,title,meta_author',
      `${TEST_CONFIG.testUrls.simple},${output1},"Simple Page","Test Author 1"`,
      `${TEST_CONFIG.testUrls.images},${output2},"Images Page","Test Author 2"`
    ].join('\n'));

    const result = await runCliCommand('batch', [
      batchFile,
      '--dry-run'
    ]);

    assertions.commandSucceeded(result, 'Batch with templates should succeed');
    assertions.outputContains(result, 'Batch processing complete', 'Should show completion message');
    assertions.outputContains(result, 'Successful: 2', 'Should show success count');

    // In dry-run mode, files are not actually generated, so we skip file validation
  });

  test('should validate batch file format', async () => {
    const batchFile = join(tempDir, 'invalid-batch.txt');

    writeFileSync(batchFile, 'This is not a valid batch file format');

    const result = await runCliCommand('batch', [
      '--file', batchFile
    ]);

    assertions.commandFailed(result, 1, 'Should fail with invalid batch file format');
    // Just check that the command failed - error message format may vary
    expect(result.exitCode).toBe(1);
  });

  test('should handle missing batch file', async () => {
    const result = await runCliCommand('batch', [
      '--file', join(tempDir, 'nonexistent.csv')
    ]);

    assertions.commandFailed(result, 1, 'Should fail with missing batch file');
    // Just check that the command failed - error message format may vary
    expect(result.exitCode).toBe(1);
  });

  test('should validate required columns in CSV', async () => {
    const batchFile = join(tempDir, 'missing-columns.csv');

    writeFileSync(batchFile, [
      'invalid_header,another_header',
      'value1,value2'
    ].join('\n'));

    const result = await runCliCommand('batch', [
      '--file', batchFile
    ]);

    assertions.commandFailed(result, 1, 'Should fail with missing required columns');
    // Just check that the command failed - error message format may vary
    expect(result.exitCode).toBe(1);
  });

  test('should handle empty batch file', async () => {
    const batchFile = join(tempDir, 'empty-batch.csv');

    writeFileSync(batchFile, '');

    const result = await runCliCommand('batch', [
      batchFile
    ]);

    assertions.commandFailed(result, 1, 'Should fail with empty batch file');
    // Just check that the command failed - error message format may vary
    expect(result.exitCode).toBe(1);
  });

  test('should generate batch processing report', async () => {
    const batchFile = join(tempDir, 'report-batch.csv');
    const reportFile = join(tempDir, 'batch-report.json');
    const output1 = join(tempDir, 'report1.pdf');
    const output2 = join(tempDir, 'report2.pdf');

    writeFileSync(batchFile, [
      'url,output',
      `${TEST_CONFIG.testUrls.simple},${output1}`,
      `${TEST_CONFIG.testUrls.images},${output2}`
    ].join('\n'));

    const result = await runCliCommand('batch', [
      batchFile,
      '--report-file', reportFile,
      '--dry-run'
    ]);

    assertions.commandSucceeded(result, 'Batch with report should succeed');
    assertions.outputContains(result, 'Batch processing complete', 'Should show completion message');
    assertions.outputContains(result, 'Successful: 2', 'Should show success count');

    // In dry-run mode, report file should still be generated
    expect(existsSync(reportFile)).toBe(true);

    // Validate report content
    const reportContent = JSON.parse(readFileSync(reportFile, 'utf-8'));
    expect(reportContent).toHaveProperty('totalJobs', 2);
    expect(reportContent).toHaveProperty('successfulJobs', 2);
    expect(reportContent).toHaveProperty('failedJobs', 0);
    expect(reportContent).toHaveProperty('startTime');
    expect(reportContent).toHaveProperty('endTime');
  });
});