/**
 * BUG-022 / BUG-025: browser-pool acquisition under concurrency.
 *
 * BUG-022 (TOCTOU): getBrowser() checked `pool.total < maxSize` and THEN awaited
 * createBrowser(). Because the create yields, N concurrent callers all passed the
 * check before any `total++` landed, so the pool blew past maxSize (e.g. 5 live
 * browsers with maxSize=2). The fix reserves the slot synchronously.
 *
 * BUG-025 (busy-wait): callers that hit capacity polled every 100ms. The fix
 * hands a released/created browser straight to the oldest waiter (event-based).
 *
 * Uses a fake BrowserFactory (no real Chromium), so it runs fast on any OS.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { DefaultBrowserManager } from '../../src/printing/browser';
import type { BrowserFactory } from '../../src/printing/types/browser';

// A fake puppeteer Browser — only the bits the pool touches.
function fakeBrowser() {
  return {
    process: () => ({ pid: 0 }),
    connected: true,
    close: async () => {},
  } as unknown as import('puppeteer').Browser;
}

class FakeFactory implements BrowserFactory {
  created = 0;
  // small delay so concurrent creates genuinely overlap (exposes TOCTOU)
  async createBrowser() {
    this.created++;
    await new Promise((r) => setTimeout(r, 20));
    return fakeBrowser();
  }
  async validateBrowser() { return true; }
  async getBrowserVersion() { return 'fake/1.0'; }
  getOptimalLaunchOptions() { return {}; }
}

describe('browser pool concurrency (BUG-022/025)', () => {
  let manager: DefaultBrowserManager | undefined;

  afterEach(async () => {
    if (manager) await manager.shutdown();
    manager = undefined;
  });

  it('never creates more browsers than maxSize under concurrent acquisition', async () => {
    const factory = new FakeFactory();
    manager = new DefaultBrowserManager(factory, { minSize: 0, maxSize: 2 });
    await manager.initialize();

    // Fire 5 acquisitions at once against a pool capped at 2.
    const acquisitions = Array.from({ length: 5 }, () => manager!.getBrowser());

    // Let the first wave settle (creates take ~20ms; 50ms is enough).
    await new Promise((r) => setTimeout(r, 60));

    const mid = manager.getPoolStatus();
    // With the TOCTOU bug this would be 5; the fix caps it at maxSize.
    expect(mid.totalBrowsers).toBeLessThanOrEqual(2);
    expect(factory.created).toBeLessThanOrEqual(2);

    // Drain: each holder releases, which must wake a waiting acquirer.
    const got: string[] = [];
    await Promise.all(
      acquisitions.map((p) =>
        p.then(async (inst) => {
          got.push(inst.id);
          await new Promise((r) => setTimeout(r, 5));
          await manager!.releaseBrowser(inst);
        })
      )
    );

    // All five callers were served, but only maxSize browsers were ever created
    // (the rest were reused via the waiter queue).
    expect(got).toHaveLength(5);
    expect(factory.created).toBeLessThanOrEqual(2);
    const final = manager.getPoolStatus();
    expect(final.metrics.created).toBeLessThanOrEqual(2);
    expect(final.metrics.reused).toBeGreaterThanOrEqual(3);
  }, 20000);

  it('BUG-028: cleanup() is a graceful-shutdown alias (idempotent, releases the pool)', async () => {
    const factory = new FakeFactory();
    manager = new DefaultBrowserManager(factory, { minSize: 0, maxSize: 2 });
    await manager.initialize();

    const inst = await manager.getBrowser();
    await manager.releaseBrowser(inst);
    expect(manager.getPoolStatus().totalBrowsers).toBeGreaterThan(0);

    // cleanup() must exist (README uses it) and behave like shutdown().
    expect(typeof (manager as unknown as { cleanup?: () => Promise<void> }).cleanup).toBe('function');
    await (manager as unknown as { cleanup: () => Promise<void> }).cleanup();
    expect(manager.getPoolStatus().totalBrowsers).toBe(0);

    // Idempotent — a second call must not throw.
    await expect((manager as unknown as { cleanup: () => Promise<void> }).cleanup()).resolves.toBeUndefined();
  }, 20000);
});
