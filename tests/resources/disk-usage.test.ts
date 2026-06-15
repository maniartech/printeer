/**
 * BUG-024: getTotalDiskUsage() returned a hardcoded 0.1 (10%), so every
 * disk-pressure decision in the optimizer was a no-op — cleanup would never
 * trigger even on a full disk. It now reads real filesystem stats (fs.statfs)
 * and derives the in-use fraction via the pure `diskUsageRatio` helper.
 */

import { describe, it, expect } from 'vitest';
import {
  DefaultDiskSpaceManager,
  diskUsageRatio,
} from '../../src/resources/disk-space-manager';

describe('diskUsageRatio (BUG-024 pure logic)', () => {
  it('computes used/total (100 blocks, 25 free -> 0.75)', () => {
    expect(diskUsageRatio(100, 25)).toBeCloseTo(0.75, 5);
    // Not the old hardcoded placeholder.
    expect(diskUsageRatio(100, 25)).not.toBe(0.1);
  });

  it('is 0 for a full-free or empty/unknown volume', () => {
    expect(diskUsageRatio(100, 100)).toBe(0); // all free
    expect(diskUsageRatio(0, 0)).toBe(0);     // unknown
    expect(diskUsageRatio(-1, 0)).toBe(0);    // garbage
    expect(diskUsageRatio(NaN, 0)).toBe(0);
  });

  it('is 1 for a completely full volume and clamps overshoot', () => {
    expect(diskUsageRatio(100, 0)).toBe(1);
    expect(diskUsageRatio(100, -10)).toBe(1); // bfree > blocks shouldn't exceed 1
  });
});

describe('getTotalDiskUsage (BUG-024 integration)', () => {
  it('returns a real fraction in [0,1] from the live filesystem, never throws', async () => {
    const usage = await new DefaultDiskSpaceManager().getTotalDiskUsage();
    expect(usage).toBeGreaterThanOrEqual(0);
    expect(usage).toBeLessThanOrEqual(1);
  });
});
