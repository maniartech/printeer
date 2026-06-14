/**
 * E2E coverage that documented env vars actually affect a real conversion.
 *
 * Guards: BUG-010 — PRINTEER_BROWSER_EXECUTABLE_PATH reaches the launch, and
 * PRINTEER_LOG_LEVEL suppresses the strategy/debug chatter.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { FixtureServer } from '../fixtures/fixture-server';
import { runCli, tempDir, assertValidPdf } from './helpers';

describe('env config (e2e)', () => {
  const server = new FixtureServer();
  let base = '';
  let tmp: { dir: string; cleanup: () => void };

  beforeAll(async () => {
    base = await server.start();
    tmp = tempDir('printeer-env-');
  }, 30000);

  afterAll(async () => {
    await server.stop();
    tmp.cleanup();
  });

  it('BUG-010: PRINTEER_BROWSER_EXECUTABLE_PATH is honoured (bogus path fails the launch)', async () => {
    const out = join(tmp.dir, 'should-not-exist.pdf');
    const r = await runCli(['convert', `${base}/static`, out], {
      env: { PRINTEER_BROWSER_EXECUTABLE_PATH: join(tmp.dir, 'no-such-chrome-binary') },
    });
    // If the env var were ignored, the bundled Chromium would succeed (exit 0).
    expect(r.code).not.toBe(0);
  }, 60000);

  it('BUG-010: PRINTEER_LOG_LEVEL=error suppresses the strategy debug line', async () => {
    const out = join(tmp.dir, 'quiet.pdf');
    const r = await runCli(['convert', `${base}/static`, out], {
      env: { PRINTEER_LOG_LEVEL: 'error' },
    });
    expect(r.code).toBe(0);
    assertValidPdf(out);
    expect(`${r.stdout}\n${r.stderr}`).not.toMatch(/Using browser strategy/i);
  }, 60000);
});
