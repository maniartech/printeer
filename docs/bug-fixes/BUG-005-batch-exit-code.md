# BUG-005 — Batch exits 0 even when jobs fail

| | |
|---|---|
| **Severity** | High (blocker) |
| **Area** | batch |
| **Status** | ✅ GREEN |
| **Fixed in** | `src/cli/enhanced-cli.ts` (`runBatchProcess`) |
| **Test** | `tests/e2e/batch.e2e.test.ts` › *BUG-005: exits non-zero when a job fails…* |

## Summary

A batch run with failing jobs printed `Failed: 1` but exited with code **0**, so
CI pipelines and scripts could not detect batch failures.

## Reproduction (red)

```
$ printeer batch mixed.json --continue-on-error
  Successful: 1
  Failed: 1
$ echo $?        # → 0  (should be 1)
```

## Root cause

`runBatchProcess()` printed the report and returned normally. With
`--continue-on-error`, the processor resolves with a report (failures recorded
but not thrown), so the CLI action never saw an error and the process exited 0.

## Fix

After reporting, set a non-zero exit code when any job failed:

```ts
if (report.failedJobs > 0) {
  process.exitCode = 1;
}
```

`process.exitCode` (rather than `process.exit(1)`) lets the report finish
printing and any cleanup run, then the process exits non-zero. Fail-fast mode
throws earlier (see BUG-006) and is handled by the action's catch.

## Test guarantee

The test runs a mixed good/bad batch with `--continue-on-error` and asserts
`exit === 1` **and** that the healthy job still produced a valid PDF (so we don't
regress into aborting everything).

## Learnings (carried forward)

1. **Exit codes are part of the contract for any batch/CI tool.** "Reported a
   failure" and "signalled a failure" are different; tests must assert the exit
   code, not just stdout.
2. **`--continue-on-error` means "don't abort", not "report success".** The
   process should still end non-zero if anything failed.
