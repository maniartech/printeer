/**
 * E2E coverage that the browser POOL strategy actually initializes and
 * converts — it is the default strategy for server/library usage.
 *
 * Guards: BUG-003 (pool mode broken on Windows due to --no-startup-window,
 * which forced a silent fallback to oneshot on every conversion).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { FixtureServer } from '../fixtures/fixture-server';
import { runCli, tempDir, assertValidPdf } from './helpers';

describe('browser pool strategy (e2e)', () => {
  const server = new FixtureServer();
  let base = '';
  let tmp: { dir: string; cleanup: () => void };

  beforeAll(async () => {
    base = await server.start();
    tmp = tempDir('printeer-pool-');
  }, 30000);

  afterAll(async () => {
    await server.stop();
    tmp.cleanup();
  });

  it('BUG-003: forced pool strategy converts without falling back to oneshot', async () => {
    const out = join(tmp.dir, 'pool.pdf');
    const r = await runCli(['convert', `${base}/static`, out], {
      env: { PRINTEER_BROWSER_STRATEGY: 'pool' },
    });
    expect(r.code).toBe(0);
    assertValidPdf(out);

    const combined = `${r.stdout}\n${r.stderr}`;
    // The pool must initialize for real — none of these failure signatures.
    expect(combined).not.toMatch(/Pool strategy failed/i);
    expect(combined).not.toMatch(/falling back to oneshot/i);
    expect(combined).not.toMatch(/Failed to create any browsers/i);
  }, 60000);
});
