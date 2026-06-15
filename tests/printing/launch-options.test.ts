/**
 * BUG-021: the pooled browser factory must honor PRINTEER_NO_SANDBOX=1.
 *
 * On CI Linux (e.g. GitHub Actions) the job user is non-root and non-Docker,
 * yet the kernel user-namespace sandbox is unavailable, so headless Chrome only
 * launches with --no-sandbox. The oneshot path already honored the env flag; the
 * pool factory did not, so PRINTEER_BUNDLED_ONLY=1 (which suppresses the
 * no-sandbox fallback configs) left batch/pool conversions hanging until timeout.
 *
 * These assert the *argument selection* directly, so they run on any OS — unlike
 * the real-Chromium e2e, which only reproduced the failure on CI Linux.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DefaultBrowserFactory } from '../../src/printing/browser';

describe('DefaultBrowserFactory launch args (BUG-021)', () => {
  const saved: Record<string, string | undefined> = {};
  const KEYS = ['NODE_ENV', 'PRINTEER_NO_SANDBOX', 'PRINTEER_BUNDLED_ONLY'];

  beforeEach(() => {
    for (const k of KEYS) saved[k] = process.env[k];
    // Leave the test-mode short-circuit (which always adds --no-sandbox) so we
    // exercise the real environment-detection branch.
    delete process.env.NODE_ENV;
    delete process.env.PRINTEER_NO_SANDBOX;
    delete process.env.PRINTEER_BUNDLED_ONLY;
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k]!;
    }
  });

  it('adds --no-sandbox when PRINTEER_NO_SANDBOX=1 (non-root, non-Docker)', () => {
    process.env.PRINTEER_NO_SANDBOX = '1';
    const factory = new DefaultBrowserFactory();
    const args = factory.getOptimalLaunchOptions().args ?? [];
    expect(args).toContain('--no-sandbox');
    expect(args).toContain('--disable-setuid-sandbox');
  });

  it('does not force --no-sandbox by default off-CI (no flag, non-root, non-Docker)', () => {
    // Guards against the opposite regression: we should not hand every desktop
    // user --no-sandbox. (On a genuine root/Docker host the detection still adds
    // it; this test process is neither.)
    const factory = new DefaultBrowserFactory();
    const args = factory.getOptimalLaunchOptions().args ?? [];
    expect(args).not.toContain('--no-sandbox');
  });
});
