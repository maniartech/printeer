/**
 * End-to-end coverage for the core conversion path — the library default
 * export and the built CLI — against a real bundled Chromium and the
 * dependency-free {@link FixtureServer}.
 *
 * Guards: BUG-001 (2-arg library call crash).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pathToFileURL } from 'url';
import { join } from 'path';
import { FixtureServer } from '../fixtures/fixture-server';
import {
  runCli,
  tempDir,
  assertValidPdf,
  assertValidPng,
  readPngSize,
  LIB_PATH,
} from './helpers';

// Import the *built* library exactly as a published consumer would.
async function loadLibrary(): Promise<(...args: any[]) => Promise<string>> {
  const mod = await import(pathToFileURL(LIB_PATH).href);
  return mod.default as (...args: any[]) => Promise<string>;
}

describe('core conversion (e2e)', () => {
  const server = new FixtureServer();
  let base = '';
  let tmp: { dir: string; cleanup: () => void };

  beforeAll(async () => {
    base = await server.start();
    tmp = tempDir();
  }, 30000);

  afterAll(async () => {
    await server.stop();
    tmp.cleanup();
  });

  describe('library default export', () => {
    it('BUG-001: printeer(url, output) with TWO args produces a valid PDF (no TypeError)', async () => {
      const printeer = await loadLibrary();
      const out = join(tmp.dir, 'two-arg.pdf');
      // Before the fix this throws: TypeError: Cannot read properties of
      // undefined (reading 'waitUntil'). After the fix it must resolve.
      const result = await printeer(`${base}/static`, out);
      expect(result).toBeTruthy();
      assertValidPdf(out);
    }, 60000);

    it('BUG-001: printeer(url, output, null) with THREE args produces a valid PDF', async () => {
      const printeer = await loadLibrary();
      const out = join(tmp.dir, 'three-arg.pdf');
      const result = await printeer(`${base}/static`, out, null);
      expect(result).toBeTruthy();
      assertValidPdf(out);
    }, 60000);

    it('printeer(url, output, null, {}) with explicit options still works (regression guard)', async () => {
      const printeer = await loadLibrary();
      const out = join(tmp.dir, 'four-arg.pdf');
      const result = await printeer(`${base}/static`, out, null, {});
      expect(result).toBeTruthy();
      assertValidPdf(out);
    }, 60000);

    it('rejects a non-http URL with a clear error', async () => {
      const printeer = await loadLibrary();
      await expect(printeer('ftp://example.com', join(tmp.dir, 'x.pdf'))).rejects.toThrow(/http/i);
    }, 30000);
  });

  describe('built CLI convert', () => {
    it('converts a URL to a valid PDF', async () => {
      const out = join(tmp.dir, 'cli.pdf');
      const r = await runCli(['convert', `${base}/static`, out]);
      expect(r.code).toBe(0);
      assertValidPdf(out);
    }, 60000);

    it('converts a URL to a valid PNG', async () => {
      const out = join(tmp.dir, 'cli.png');
      const r = await runCli(['convert', `${base}/static`, out]);
      expect(r.code).toBe(0);
      assertValidPng(out);
    }, 60000);

    it('produces a taller image for a tall page with --full-page', async () => {
      const shortOut = join(tmp.dir, 'short.png');
      const tallOut = join(tmp.dir, 'tall.png');
      await runCli(['convert', `${base}/static`, shortOut, '--viewport', '800x600']);
      await runCli(['convert', `${base}/tall`, tallOut, '--full-page', '--viewport', '800x600']);
      assertValidPng(shortOut);
      assertValidPng(tallOut);
      expect(readPngSize(tallOut).height).toBeGreaterThan(readPngSize(shortOut).height);
    }, 90000);
  });
});
