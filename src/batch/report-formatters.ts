/**
 * Batch report formatters (BUG-036).
 *
 * The `--report <format>` flag accepted `json | csv | html` but only JSON was
 * ever written. These pure formatters render a {@link BatchReport} in each
 * format so the CLI can honor the requested output.
 */

import type { BatchReport, BatchResult } from './types/batch.types';

export type BatchReportFormat = 'json' | 'csv' | 'html';

const CSV_COLUMNS: Array<keyof BatchResult> = [
  'jobId', 'status', 'duration', 'retryCount', 'outputFile', 'error'
];

function csvEscape(value: unknown): string {
  const s = value === undefined || value === null ? '' : String(value);
  // Quote if the field contains a comma, quote, or newline; double interior quotes.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function htmlEscape(value: unknown): string {
  const s = value === undefined || value === null ? '' : String(value);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatBatchReportCsv(report: BatchReport): string {
  const header = CSV_COLUMNS.join(',');
  const rows = (report.results || []).map(r =>
    CSV_COLUMNS.map(col => csvEscape((r as unknown as Record<string, unknown>)[col as string])).join(',')
  );
  return [header, ...rows].join('\n') + '\n';
}

export function formatBatchReportHtml(report: BatchReport): string {
  const rows = (report.results || []).map(r => `      <tr class="${htmlEscape(r.status)}">
        <td>${htmlEscape(r.jobId)}</td>
        <td>${htmlEscape(r.status)}</td>
        <td>${htmlEscape(r.duration)}</td>
        <td>${htmlEscape(r.retryCount)}</td>
        <td>${htmlEscape(r.outputFile)}</td>
        <td>${htmlEscape(r.error)}</td>
      </tr>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Printeer Batch Report</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
    tr.failed { background: #fdecea; }
    tr.completed { background: #eafaf1; }
  </style>
</head>
<body>
  <h1>Printeer Batch Report</h1>
  <p>${htmlEscape(report.successfulJobs)} succeeded, ${htmlEscape(report.failedJobs)} failed,
     ${htmlEscape(report.skippedJobs)} skipped of ${htmlEscape(report.totalJobs)} total
     in ${htmlEscape(report.totalDuration)}ms.</p>
  <table>
    <thead>
      <tr><th>Job</th><th>Status</th><th>Duration (ms)</th><th>Retries</th><th>Output</th><th>Error</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
</body>
</html>
`;
}

/** Render a batch report in the requested format (defaults to JSON). */
export function formatBatchReport(report: BatchReport, format: BatchReportFormat = 'json'): string {
  switch (format) {
    case 'csv':
      return formatBatchReportCsv(report);
    case 'html':
      return formatBatchReportHtml(report);
    case 'json':
    default:
      return JSON.stringify(report, null, 2);
  }
}
