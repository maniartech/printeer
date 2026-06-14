/**
 * E2E coverage for batch processing.
 *
 * Guards:
 *  - BUG-004: bare JSON array jobs file (the README format) must be accepted.
 *  - BUG-005: a failed job must yield a non-zero exit code (CI-detectable),
 *             even with --continue-on-error.
 *  - BUG-006: fail-fast (default) must abort without leaking an unhandled
 *             rejection.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { FixtureServer } from '../fixtures/fixture-server';
import { runCli, tempDir, assertValidPdf } from './helpers';

const BAD_URL = 'http://127.0.0.1:9/nope'; // discard port → connection refused

describe('batch processing (e2e)', () => {
  const server = new FixtureServer();
  let base = '';
  let tmp: { dir: string; cleanup: () => void };

  beforeAll(async () => {
    base = await server.start();
    tmp = tempDir('printeer-batch-');
  }, 30000);

  afterAll(async () => {
    await server.stop();
    tmp.cleanup();
  });

  it('BUG-004: accepts a bare JSON array jobs file (README format)', async () => {
    const out1 = join(tmp.dir, 'a.pdf');
    const out2 = join(tmp.dir, 'b.pdf');
    const jobsFile = join(tmp.dir, 'arr.json');
    writeFileSync(
      jobsFile,
      JSON.stringify([
        { url: `${base}/static`, output: out1 },
        { url: `${base}/static`, output: out2 },
      ])
    );
    const r = await runCli(['batch', jobsFile, '--concurrency', '2']);
    expect(r.stderr).not.toMatch(/Invalid batch file/i);
    expect(r.code).toBe(0);
    assertValidPdf(out1);
    assertValidPdf(out2);
  }, 90000);

  it('BUG-005: exits non-zero when a job fails even with --continue-on-error', async () => {
    const good = join(tmp.dir, 'good.pdf');
    const jobsFile = join(tmp.dir, 'mixed.json');
    writeFileSync(
      jobsFile,
      JSON.stringify({
        jobs: [
          { url: `${base}/static`, output: good },
          { url: BAD_URL, output: join(tmp.dir, 'bad.pdf') },
        ],
      })
    );
    const r = await runCli(['batch', jobsFile, '--concurrency', '1', '--continue-on-error']);
    expect(r.code).toBe(1); // a failure must be detectable by CI/scripts
    assertValidPdf(good); // the healthy job still produced output
  }, 90000);

  it('BUG-006: fail-fast aborts without leaking an unhandled rejection', async () => {
    const jobsFile = join(tmp.dir, 'ff.json');
    writeFileSync(
      jobsFile,
      JSON.stringify({
        jobs: [
          { url: BAD_URL, output: join(tmp.dir, 'x.pdf') },
          { url: `${base}/static`, output: join(tmp.dir, 'y.pdf') },
        ],
      })
    );
    const r = await runCli(['batch', jobsFile, '--concurrency', '1']); // default = fail-fast
    expect(r.code).not.toBe(0);
    expect(`${r.stdout}\n${r.stderr}`).not.toMatch(/unhandled rejection/i);
  }, 90000);
});
