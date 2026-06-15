# BUG-027 — `doctor --json` stdout was not pure JSON

| | |
|---|---|
| **Severity** | Medium (machine-readable output unusable) |
| **Area** | diagnostics / cli |
| **Status** | ✅ GREEN |
| **Fixed in** | `src/diagnostics/doctor.ts`, `src/cli/index.ts` |
| **Test** | `tests/e2e/doctor.e2e.test.ts` (BUG-027 case) |

## Summary

`printeer doctor --json` is meant to emit a single JSON document on stdout for
tooling to parse. It didn't:

- A trailing human summary (`"\nAll checks passed. Your system is ready."`) was
  `console.log`'d to **stdout** after the JSON report — **unconditionally**, even
  in `--json` mode. So plain `doctor --json` failed `JSON.parse`.
- With `--json --verbose`, ~270 `doctorTrace` lines (`console.log(JSON.stringify(...))`
  in the doctor) were also interleaved on stdout.

## Fix

1. **Doctor traces → stderr.** `vlog()` and all seven raw
   `console.log(JSON.stringify({ doctorTrace... }))` launch traces now use
   `console.error`. Diagnostic traces belong on stderr; stdout stays for the report.
2. **Suppress the human summary in `--json`.** The trailing pass/warn/fail summary
   lines are gated on `!json` (the success line had gone to stdout and corrupted it).

## Verification

```
doctor --json            -> stdout is one JSON doc (13 results)
doctor --json --verbose  -> stdout is one JSON doc; traces on stderr
```

e2e asserts `JSON.parse(stdout)` succeeds and stdout contains no `doctorTrace`.

## Learnings (carried forward)

1. **stdout is the data channel; stderr is for humans/diagnostics.** Anything not
   part of the machine output (summaries, traces, progress) goes to stderr.
2. **A `--json` flag must gate *every* stdout writer on the path**, including
   trailing summaries emitted by an outer caller, not just the report line.
3. Grep for *all* `console.log` on the command path — there were 8 separate
   writers; fixing one (`vlog`) wasn't enough.
