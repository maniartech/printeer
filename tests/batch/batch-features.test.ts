/**
 * BUG-034/035: file-level `defaults` and `variables` blocks, and `{{var}}`
 * template substitution, were parsed into BatchData but never applied. These
 * exercise the loader -> defaults/variables -> template pipeline without a
 * browser, via dry-run (which still runs prepare/expand/substitute).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { BatchProcessor } from '../../src/batch/batch-processor';
import type { BatchData, BatchJob } from '../../src/batch/types/batch.types';

function newProcessor(extra: Record<string, unknown> = {}) {
  return new BatchProcessor({
    concurrency: 2,
    continueOnError: true,
    dryRun: true,
    ...extra,
  } as any);
}

describe('batch defaults + variables merge (BUG-034/035)', () => {
  it('applies defaults to each job (job wins; config deep-merged)', () => {
    const p = newProcessor();
    const data: BatchData = {
      defaults: {
        preset: 'web-article',
        timeout: 1000,
        config: { pdf: { displayHeaderFooter: true, headerTemplate: 'D' } },
      } as Partial<BatchJob>,
      variables: { base: 'https://ex.com' },
      jobs: [
        { id: 'a', url: '{{base}}/a', output: 'a.pdf', config: { pdf: { headerTemplate: 'A' } } },
        { id: 'b', url: '{{base}}/b', output: 'b.pdf', preset: 'override' },
      ],
    };
    const jobs = (p as any).applyBatchDefaultsAndVariables(data) as BatchJob[];

    // defaults applied
    expect(jobs[0].preset).toBe('web-article');
    expect(jobs[0].timeout).toBe(1000);
    // job-level config wins on collision, default field preserved (deep merge)
    expect(jobs[0].config?.pdf?.headerTemplate).toBe('A');
    expect(jobs[0].config?.pdf?.displayHeaderFooter).toBe(true);
    // job wins over default
    expect(jobs[1].preset).toBe('override');
    // file-level variables pooled into each job
    expect(jobs[0].variables?.base).toBe('https://ex.com');
  });

  it('variable precedence: job > defaults > file-level', () => {
    const p = newProcessor();
    const data: BatchData = {
      defaults: { variables: { v: 'fromDefaults', d: 'd' } } as Partial<BatchJob>,
      variables: { v: 'fromFile', f: 'f' },
      jobs: [{ id: 'a', url: 'http://x/{{v}}', output: 'o', variables: { v: 'fromJob' } }],
    };
    const jobs = (p as any).applyBatchDefaultsAndVariables(data) as BatchJob[];
    expect(jobs[0].variables).toMatchObject({ v: 'fromJob', d: 'd', f: 'f' });
  });
});

describe('batch template substitution (BUG-035)', () => {
  it('substitutes both {{double}} and {single} brace syntax', () => {
    const p = newProcessor();
    const sub = (t: string, v: Record<string, unknown>) => (p as any).substituteString(t, v);
    expect(sub('{{a}}/{b}', { a: 'X', b: 'Y' })).toBe('X/Y');
    expect(sub('{{ a }}', { a: 'Z' })).toBe('Z'); // tolerant of inner spaces
    expect(sub('{{missing}}', {})).toBe('{{missing}}'); // unknown left intact
  });
});

describe('batch --retry (BUG-033)', () => {
  it('retries a failing conversion up to retryAttempts and records the count', async () => {
    const p = newProcessor({ retryAttempts: 2, dryRun: false });
    let calls = 0;
    (p as any).resolveJobConfiguration = async () => ({}); // avoid cosmiconfig IO
    (p as any).executeRealConversion = async () => {
      calls++;
      if (calls < 3) throw new Error('transient boom');
    };

    const result = await (p as any).executeJob(
      { id: 'x', url: 'http://x/', output: 'o.pdf' },
      (p as any).options
    );

    expect(result.status).toBe('completed');
    expect(result.retryCount).toBe(2);  // succeeded on the 3rd attempt (2 retries)
    expect(calls).toBe(3);              // 1 initial + 2 retries
  }, 10000);

  it('gives up after exhausting retries (1 initial + N retries)', async () => {
    const p = newProcessor({ retryAttempts: 2, dryRun: false });
    let calls = 0;
    (p as any).resolveJobConfiguration = async () => ({});
    (p as any).executeRealConversion = async () => { calls++; throw new Error('always fails'); };

    await expect(
      (p as any).executeJob({ id: 'y', url: 'http://y/', output: 'o.pdf' }, (p as any).options)
    ).rejects.toThrow(/failed after 3 attempts/);
    expect(calls).toBe(3);
  }, 10000);

  it('does not retry when retryAttempts is 0', async () => {
    const p = newProcessor({ retryAttempts: 0, dryRun: false });
    let calls = 0;
    (p as any).resolveJobConfiguration = async () => ({});
    (p as any).executeRealConversion = async () => { calls++; throw new Error('nope'); };

    await expect(
      (p as any).executeJob({ id: 'z', url: 'http://z/', output: 'o.pdf' }, (p as any).options)
    ).rejects.toThrow(/failed after 1 attempt:/);
    expect(calls).toBe(1);
  }, 10000);
});

describe('batch priority ordering (BUG-038)', () => {
  it('starts no-dependency jobs in priority order (lower number first)', async () => {
    const p = newProcessor({ concurrency: 1, dryRun: false });
    (p as any).resolveJobConfiguration = async () => ({});
    (p as any).executeRealConversion = async () => { /* succeed immediately */ };

    const started: string[] = [];
    p.on('job-started', (job: any) => started.push(job.id));

    await p.processBatch(
      [
        { id: 'low', url: 'http://x/3', output: '3.pdf', priority: 3 },
        { id: 'high', url: 'http://x/1', output: '1.pdf', priority: 1 },
        { id: 'mid', url: 'http://x/2', output: '2.pdf', priority: 2 },
      ],
      (p as any).options
    );

    expect(started).toEqual(['high', 'mid', 'low']);
  }, 10000);
});

describe('batch dry-run pipeline integration (BUG-034/035)', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'printeer-batch-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('substitutes file-level variables in outputs and expands array variables', async () => {
    const file = join(dir, 'jobs.json');
    const data = {
      variables: { outDir: 'reports' },
      jobs: [
        { id: 'multi', url: 'https://ex.com/{{page}}', output: '{{outDir}}/{{page}}.pdf',
          variables: { page: ['one', 'two', 'three'] } },
      ],
    };
    writeFileSync(file, JSON.stringify(data));

    const p = newProcessor();
    const report = await p.processBatchFile(file, (p as any).options);

    // Array variable expands into one job per element...
    expect(report.totalJobs).toBe(3);
    const outputs = report.results.map(r => r.outputFile).sort();
    // ...with file-level + array variables substituted (no leftover {{...}}).
    expect(outputs).toEqual(['reports/one.pdf', 'reports/three.pdf', 'reports/two.pdf']);
    expect(outputs.some(o => o?.includes('{{'))).toBe(false);
  });

  it('BUG-037: the shipped examples/batch-jobs.yaml parses and substitutes cleanly', async () => {
    const example = join(__dirname, '..', '..', 'examples', 'batch-jobs.yaml');
    const p = newProcessor();
    const report = await p.processBatchFile(example, (p as any).options);

    expect(report.totalJobs).toBe(3);
    const outputs = report.results.map(r => r.outputFile).sort();
    expect(outputs).toEqual([
      './reports/about.pdf',
      './reports/homepage-mobile.png',
      './reports/homepage.pdf',
    ]);
    // Every {{variable}} resolved — nothing left unsubstituted.
    expect(outputs.some(o => o?.includes('{{'))).toBe(false);
  });
});
