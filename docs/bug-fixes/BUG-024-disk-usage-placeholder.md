# BUG-024 — `getTotalDiskUsage()` hardcoded to 10% (disk decisions were no-ops)

| | |
|---|---|
| **Severity** | Medium (resource management ineffective) |
| **Area** | resources (disk) |
| **Status** | ✅ GREEN |
| **Fixed in** | `src/resources/disk-space-manager.ts` |
| **Test** | `tests/resources/disk-usage.test.ts` (+ updated `resource.test.ts`) |

## Summary

```ts
async getTotalDiskUsage(): Promise<number> {
  return 0.1; // 10%
}
```

The method always returned `0.1` regardless of the real disk. Every
disk-pressure decision downstream (e.g. `DefaultResourceOptimizer` deciding when
to trigger aggressive cleanup) was therefore a no-op — cleanup would never fire,
even on a full disk.

## Fix

Read real filesystem stats via `fs.statfs` (Node 18.15+, cross-platform), with the
in-use fraction derived by a small **pure** helper so the math is unit-testable
without mocking the (non-configurable) `fs/promises` namespace:

```ts
export function diskUsageRatio(blocks: number, bfree: number): number {
  if (!Number.isFinite(blocks) || blocks <= 0) return 0;
  return Math.min(1, Math.max(0, (blocks - bfree) / blocks));
}

async getTotalDiskUsage(): Promise<number> {
  try {
    const statfs = (fs as { statfs?: (p: string) => Promise<{ blocks: number; bfree: number }> }).statfs;
    if (typeof statfs !== 'function') return 0;       // very old Node: unknown -> no pressure
    const stats = await statfs(this.tempDir);
    return stats ? diskUsageRatio(stats.blocks, stats.bfree) : 0;
  } catch {
    return 0;                                          // bad reading -> never trigger aggressive cleanup
  }
}
```

The fallback is **0** ("no measurable pressure"), so a missing/erroring `statfs`
can never *cause* aggressive deletion — failing safe in the deletion direction.

## Tests (red → green)

- `disk-usage.test.ts`: pure `diskUsageRatio` (0.75 from 100/25, clamping, zero
  guards) + an integration check that the live call returns a real fraction in
  `[0,1]` and never throws.
- `resource.test.ts`: three tests that asserted the `0.1` placeholder were updated
  to mock `statfs` and assert the computed ratio (they had enshrined the bug).

## Learnings (carried forward)

1. **A placeholder that satisfies the type silently disables the feature.** `0.1`
   compiles and looks plausible; only an end-to-end "does cleanup ever fire?" check
   reveals it never does. Prefer failing loudly (or wiring the real impl) over a
   benign-looking constant.
2. **Split pure math from IO** to dodge un-mockable module boundaries and get
   deterministic tests (`diskUsageRatio`).
3. **Fail safe in the direction of least harm** — on an unknown disk reading,
   report *no* pressure so cleanup doesn't delete on bad data.
4. **Tests can encode bugs.** Three tests asserted the placeholder; fixing the code
   required fixing the tests that pinned the wrong behavior.
