/**
 * BUG-036: `--report csv|html` accepted those formats but only JSON was ever
 * written. These cover the new pure formatters.
 */

import { describe, it, expect } from 'vitest';
import {
  formatBatchReport,
  formatBatchReportCsv,
  formatBatchReportHtml,
} from '../../src/batch/report-formatters';
import type { BatchReport } from '../../src/batch/types/batch.types';

const report: BatchReport = {
  totalJobs: 2,
  successfulJobs: 1,
  failedJobs: 1,
  skippedJobs: 0,
  totalDuration: 1234,
  startTime: new Date(0),
  endTime: new Date(1234),
  results: [
    { jobId: 'a', status: 'completed', startTime: new Date(0), endTime: new Date(10), duration: 10, outputFile: 'a.pdf', retryCount: 0 },
    { jobId: 'b,1', status: 'failed', startTime: new Date(0), endTime: new Date(5), duration: 5, retryCount: 2, error: 'boom, "quoted"' },
  ],
} as BatchReport;

describe('formatBatchReport (BUG-036)', () => {
  it('CSV has a header and one row per result, with proper escaping', () => {
    const csv = formatBatchReportCsv(report);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe('jobId,status,duration,retryCount,outputFile,error');
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[1]).toBe('a,completed,10,0,a.pdf,');
    // commas and quotes in fields are CSV-escaped
    expect(lines[2]).toContain('"b,1"');
    expect(lines[2]).toContain('"boom, ""quoted"""');
  });

  it('HTML is a document with a row per result and escaped content', () => {
    const html = formatBatchReportHtml(report);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<table>');
    expect(html).toContain('Printeer Batch Report');
    expect(html).toContain('1 succeeded, 1 failed');
    expect(html).toContain('<td>a</td>');
    // no raw unescaped quotes from the error field leaking attributes
    expect(html).toContain('&quot;quoted&quot;');
  });

  it('dispatches by format and defaults to JSON', () => {
    expect(formatBatchReport(report, 'csv').startsWith('jobId,')).toBe(true);
    expect(formatBatchReport(report, 'html')).toContain('<html');
    expect(() => JSON.parse(formatBatchReport(report))).not.toThrow();
    expect(() => JSON.parse(formatBatchReport(report, 'json'))).not.toThrow();
  });
});
