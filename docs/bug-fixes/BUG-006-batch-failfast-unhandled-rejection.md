# BUG-006 — Fail-fast batch leaks an unhandled rejection and doesn't abort

| | |
|---|---|
| **Severity** | High (blocker) |
| **Area** | batch |
| **Status** | ✅ GREEN |
| **Fixed in** | `src/batch/batch-processor.ts` (`processJobsWithResourceOptimization`) |
| **Test** | `tests/e2e/batch.e2e.test.ts` › *BUG-006: fail-fast aborts without leaking an unhandled rejection* |

## Summary

In the default (non-`--continue-on-error`) mode, a failing job printed:

```
Unhandled rejection: Error: Job execution failed: net::ERR_CONNECTION_REFUSED …
```

and the batch did **not** abort — it kept processing remaining jobs, contradicting
fail-fast semantics, and leaked an unhandled promise rejection (which can crash
strict hosts).

## Root cause

The scheduler launched workers as **unawaited** promises and rethrew inside their
`.catch`:

```ts
this.processJobWithResourceMonitoring(...)
  .catch(error => {
    this.emit('job-failed', job, error);
    if (!options.continueOnError) {
      throw error;       // rethrow inside an unawaited promise → unhandled rejection
    }
  });
```

Nothing awaited that promise, so the rethrow became an unhandled rejection, and
the outer `while` loop (keyed only on queue/processing sizes) kept scheduling.

## Fix

Rewrote the scheduler around an **awaited** in-flight map:

- Track each worker promise in `inFlight: Map<id, Promise>`.
- Each worker's `.catch` records the **first** fail-fast error into `abortError`
  (no rethrow → no unhandled rejection).
- The loop stops scheduling once `abortError` is set; it `await Promise.race(...)`
  to advance and `await Promise.allSettled(...)` to drain cleanly.
- After draining, it `throw abortError`, which the batch CLI action catches and
  turns into a clean message + exit 1.

The double `job-failed` emit (outer + worker) was also removed — the worker is now
the single source.

## Test guarantee

`tests/e2e/batch.e2e.test.ts` runs a fail-fast batch with a failing first job and
asserts a non-zero exit **and** that the combined output contains no
`unhandled rejection`.

## Learnings (carried forward)

1. **Never `throw` inside an unawaited `.catch`.** It produces an unhandled
   rejection. Capture errors into state you actually await.
2. **Concurrency loops must own their promises.** Track in-flight work explicitly
   (`Promise.race`/`allSettled`) so completion, cancellation, and error
   propagation are deterministic.
3. **Assert "no unhandled rejection" in tests** for any fan-out code path.
