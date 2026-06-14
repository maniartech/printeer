/**
 * E2E coverage for CLI meta behaviour: --version and --quiet handling.
 *
 * Guards: BUG-002 (--version always 1.0.0), BUG-007 (--quiet doctor errors).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runCli, REPO_ROOT, tempDir } from './helpers';

const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));

describe('CLI meta (e2e)', () => {
  describe('BUG-002: --version reports the real package version', () => {
    it('--version equals package.json version', async () => {
      const r = await runCli(['--version']);
      expect(r.code).toBe(0);
      expect(r.stdout.trim()).toBe(pkg.version);
      expect(r.stdout.trim()).not.toBe('1.0.0'); // the old broken fallback
    });

    it('-v equals package.json version', async () => {
      const r = await runCli(['-v']);
      expect(r.stdout.trim()).toBe(pkg.version);
    });

    it('reports the correct version even when run from a different cwd', async () => {
      const tmp = tempDir('printeer-cwd-');
      try {
        const r = await runCli(['--version'], { cwd: tmp.dir });
        expect(r.stdout.trim()).toBe(pkg.version);
      } finally {
        tmp.cleanup();
      }
    });
  });

  describe('BUG-007: --quiet works with subcommands', () => {
    it('`--quiet doctor` does not error with "unknown option"', async () => {
      const r = await runCli(['--quiet', 'doctor']);
      expect(r.stderr).not.toMatch(/unknown option/i);
      // doctor exits 0 (healthy) or 1 (issues), never a parse error (>1)
      expect([0, 1]).toContain(r.code);
    }, 60000);
  });
});
