/**
 * E2E coverage that header/footer template file paths flow end-to-end into a
 * real PDF conversion without crashing. (BUG-011)
 *
 * Note: asserting the rendered header text inside a (compressed) PDF is not
 * feasible dependency-free, so the resolution logic itself is unit-tested in
 * tests/cli/template-resolver.test.ts; this guards the wiring.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync as wf } from 'fs';
import { join } from 'path';
import { FixtureServer } from '../fixtures/fixture-server';
import { runCli, tempDir, assertValidPdf } from './helpers';

describe('pdf templates (e2e)', () => {
  const server = new FixtureServer();
  let base = '';
  let tmp: { dir: string; cleanup: () => void };

  beforeAll(async () => {
    base = await server.start();
    tmp = tempDir('printeer-tpl-');
  }, 30000);

  afterAll(async () => {
    await server.stop();
    tmp.cleanup();
  });

  it('BUG-011: --header-template/--footer-template file paths produce a valid PDF', async () => {
    const hdr = join(tmp.dir, 'hdr.html');
    const ftr = join(tmp.dir, 'ftr.html');
    wf(hdr, '<div style="font-size:8px">HEADER <span class="pageNumber"></span></div>');
    wf(ftr, '<div style="font-size:8px">FOOTER</div>');
    const out = join(tmp.dir, 'tpl.pdf');
    const r = await runCli([
      'convert',
      `${base}/static`,
      out,
      '--header-template',
      hdr,
      '--footer-template',
      ftr,
    ]);
    expect(r.code).toBe(0);
    assertValidPdf(out);
  }, 60000);
});
