# BUG-004 — README bare-array `jobs.json` rejected by the batch loader

| | |
|---|---|
| **Severity** | High (blocker) |
| **Area** | batch |
| **Status** | ✅ GREEN |
| **Fixed in** | `src/batch/batch-processor.ts` |
| **Test** | `tests/e2e/batch.e2e.test.ts` › *BUG-004: accepts a bare JSON array jobs file* |

## Summary

The README documents the batch file as a **top-level array**:

```json
[ { "url": "https://example.com", "output": "example.pdf" } ]
```

but running `printeer batch jobs.json` on that file errored:

```
Batch processing failed: Invalid batch file
```

Only the wrapped form `{ "jobs": [ … ] }` worked.

## Root cause

`loadBatchFile()` returned `JSON.parse(content)` directly for `.json`, and
`validateBatchData()` then read `batchData.jobs`. A bare array has no `.jobs`
property → "Batch file must contain at least one job" → "Invalid batch file".

## Fix

Normalize both JSON and YAML through `normalizeBatchData()`: a top-level array is
treated as the job list (`{ jobs: parsed }`); an object is passed through. Both
the documented bare-array form and the wrapped form now work.

## Test guarantee

`tests/e2e/batch.e2e.test.ts` writes a bare-array jobs file pointing at the
fixture server, runs the real `batch` command, and asserts no
`Invalid batch file`, exit 0, and two valid PDFs produced.

## Learnings (carried forward)

1. **Accept the shape you document.** Parsers should be permissive about
   documented input variants; the canonical example must be a passing test.
2. **Ship example files as tests.** The repo's `examples/batch-jobs.yaml` should
   also be loaded by a test so docs and parser never drift (tracked in the batch
   sweep).
