# BUG-018 — Resource-optimizer integration test confounds two variables

| | |
|---|---|
| **Severity** | Low (flaky test / machine-dependent) |
| **Area** | tests-quality / resources |
| **Status** | ✅ GREEN |
| **Fixed in** | `tests/resources/resource.integration.test.ts` |
| **Found by** | First real CI run on GitHub Actions (Linux node 22) |

## Summary

`resource.integration.test.ts > … > should handle resource optimization under
different system conditions` passed locally but failed on CI:

```
✘ expected 3 to be less than or equal to 2
```

## Root cause

The test built its "high resource" metrics by bumping **both** resource pressure
*and* load relative to a real-system baseline:

```ts
const lowResourceMetrics = await resourceManager.getLatestMetrics(); // real machine
const highResourceMetrics = {
  ...lowResourceMetrics,
  memoryUsage: +0.3, cpuUsage: +0.3,   // more pressure  → smaller pool
  activeRequests: 5, browserInstances: 3 // more load     → LARGER pool
};
expect(highResourcePoolSize).toBeLessThanOrEqual(lowResourcePoolSize + 1);
```

But the optimizer's base pool size scales with load:
`baseSize = ceil(activeRequests / 2)`. So raising `activeRequests` 0→5 grows the
pool (base 1→3) while the +0.3 pressure only dampens it. The two signals fight,
and the outcome depends on the **host machine's real baseline metrics**: locally
`lowResourcePoolSize` happened to be ~2 (slack absorbed it); on the CI runner the
real baseline `activeRequests` was 0, so `lowResourcePoolSize`=1 and
`highResourcePoolSize`=3 — the `+1` slack wasn't enough.

The optimizer was behaving correctly; the test conflated two independent inputs
and asserted on one.

## Fix

Hold load constant and vary **only** resource pressure, so the test measures what
it claims and is deterministic on any machine:

```ts
const lowResourceMetrics  = { ...base, memoryUsage: 0.3, cpuUsage: 0.3, activeRequests: 5, browserInstances: 3 };
const highResourceMetrics = { ...lowResourceMetrics, memoryUsage: 0.9, cpuUsage: 0.9 };
// same load → higher pressure must not grow the pool
expect(highResourcePoolSize).toBeLessThanOrEqual(lowResourcePoolSize);
```

The assertion is also tightened from `+ 1` to exact `<=` because, with load fixed,
higher pressure can only hold or shrink the pool — never grow it.

## Verification

`CI=true npx vitest run tests/resources/resource.integration.test.ts` → green;
full `CI=true npm run test` → 364 passed.

## Learnings (carried forward)

1. **One assertion, one independent variable.** A test that changes two inputs at
   once and asserts on the net effect is testing an accident, not a property.
2. **Don't anchor a deterministic assertion to live machine metrics.** Use
   `getLatestMetrics()` for the shared shape, then pin the fields the assertion
   actually depends on to fixed values.
