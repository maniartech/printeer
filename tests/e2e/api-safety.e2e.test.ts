/**
 * E2E guards for library-safety invariants.
 *
 * BUG-015: using the library (pool path) must NOT register process-wide
 * uncaughtException / unhandledRejection handlers — doing so silently swallows
 * the *host application's* crashes.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pathToFileURL } from 'url';
import { join } from 'path';
import { FixtureServer } from '../fixtures/fixture-server';
import { tempDir, assertValidPdf, LIB_PATH } from './helpers';

describe('library safety (e2e)', () => {
  const server = new FixtureServer();
  let base = '';
  let tmp: { dir: string; cleanup: () => void };

  beforeAll(async () => {
    base = await server.start();
    tmp = tempDir('printeer-safety-');
  }, 30000);

  afterAll(async () => {
    await server.stop();
    tmp.cleanup();
  });

  it('BUG-015: a pooled conversion does not add uncaughtException/unhandledRejection handlers', async () => {
    const printeer = (await import(pathToFileURL(LIB_PATH).href)).default as (...a: any[]) => Promise<string>;
    const beforeUE = process.listenerCount('uncaughtException');
    const beforeUR = process.listenerCount('unhandledRejection');

    const prev = process.env.PRINTEER_BROWSER_STRATEGY;
    process.env.PRINTEER_BROWSER_STRATEGY = 'pool';
    try {
      const out = join(tmp.dir, 'safety.pdf');
      await printeer(`${base}/static`, out, null, {});
      assertValidPdf(out);
    } finally {
      if (prev === undefined) delete process.env.PRINTEER_BROWSER_STRATEGY;
      else process.env.PRINTEER_BROWSER_STRATEGY = prev;
    }

    expect(process.listenerCount('uncaughtException')).toBe(beforeUE);
    expect(process.listenerCount('unhandledRejection')).toBe(beforeUR);
  }, 60000);
});
