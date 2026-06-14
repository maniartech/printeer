/**
 * E2E coverage for `printeer doctor`.
 *
 * Guards: BUG-009 — doctor must not leave `printeer-doctor-output.*` artifacts
 * in the working directory, and its output probes must work without internet
 * (they convert a localhost page, not example.com).
 */

import { describe, it, expect } from 'vitest';
import { readdirSync } from 'fs';
import { runCli, tempDir } from './helpers';

describe('doctor (e2e)', () => {
  it('BUG-009: leaves no output artifacts in the working directory', async () => {
    const tmp = tempDir('printeer-doctor-cwd-');
    try {
      const r = await runCli(['doctor'], { cwd: tmp.dir });
      // doctor exits 0 (healthy) or 1 (issues), never a crash
      expect([0, 1]).toContain(r.code);

      const leftovers = readdirSync(tmp.dir).filter((f) => f.startsWith('printeer-doctor-output'));
      expect(leftovers, `doctor left artifacts: ${leftovers.join(', ')}`).toEqual([]);

      // The output probes should have run (PDF/PNG checks present in the report).
      expect(`${r.stdout}`).toMatch(/PDF/i);
    } finally {
      tmp.cleanup();
    }
  }, 90000);
});
