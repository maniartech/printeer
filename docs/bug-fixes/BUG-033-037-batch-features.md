# BUG-033..037 — Batch features documented but not implemented

The batch file format and CLI advertised several features that were parsed but
never applied. Each is now implemented with a regression test.

| | |
|---|---|
| **Area** | batch |
| **Status** | ✅ GREEN |
| **Fixed in** | `src/batch/batch-processor.ts`, `src/batch/report-formatters.ts`, `src/cli/enhanced-cli.ts`, `examples/batch-jobs.yaml` |
| **Tests** | `tests/batch/batch-features.test.ts`, `tests/batch/report-formatters.test.ts` |

## BUG-033 — `--retry` was a no-op

`--retry <n>` parsed into `BatchOptions.retryAttempts` but no code re-attempted a
failed job. `executeJob()` now retries the conversion up to
`job.retryCount ?? options.retryAttempts ?? 0` times with a small linear backoff,
emits `job-retry`, and records the retries actually performed in
`BatchResult.retryCount`. Failure messages report the attempt count
(`failed after N attempts`).

## BUG-034 — `defaults` block was ignored

A file-level `defaults` block (`Partial<BatchJob>`) was parsed into `BatchData`
but never merged. `applyBatchDefaultsAndVariables()` now merges `defaults` into
every job (per-job value wins; `config` is **deep-merged** so a default
header/footer coexists with a per-job override).

## BUG-035 — file-level `variables` and `{{var}}` templating didn't work

- File-level `variables` were parsed but unused; now pooled into each job with
  precedence **job > defaults > file-level**.
- Substitution only handled `{var}` (single brace), but the docs/examples use
  `{{var}}` (double brace). `substituteString()` now supports **both** (and
  tolerates inner whitespace, `{{ var }}`).
- Substitution was limited to `url`/`output`; it now also recurses into any
  string inside the job's `config` (e.g. a header template referencing
  `{{companyName}}`).

## BUG-036 — `--report csv|html` only ever wrote JSON

`--report` accepted `json|csv|html` but the CLI always wrote `JSON.stringify`.
Added pure formatters (`src/batch/report-formatters.ts`):
`formatBatchReport(report, format)` with CSV (RFC-style escaping of commas,
quotes, newlines) and a self-contained HTML table. The CLI now writes the report
file in the requested format. `formatBatchReport` is exported from the main entry.

## BUG-037 — shipped `examples/batch-jobs.yaml` would not run

The example used `{{...}}` (unsupported until BUG-035), a `defaults` block (ignored
until BUG-034), and `defaults.outputDirectory`/`retryAttempts` which are **not**
`BatchJob` fields. Fixed: the example now uses only valid `defaults` fields
(`preset`, `timeout`, `retryCount`) with a header comment explaining the model. A
test loads the **shipped file** via dry-run and asserts every `{{variable}}`
resolves, so it can't silently rot again.

### Ordering fix (validation vs. substitution)

`validateBatchData()` ran `new URL(job.url)` **before** substitution, so a
templated URL (`{{baseUrl}}`) failed validation. URL-format validation now skips
strings still containing a `{{var}}`/`{var}` template; a substituted-but-invalid
URL is caught at convert time and recorded as a failed job.

## Tests (red → green)

`batch-features.test.ts` (11 tests): defaults merge + precedence, `{{}}`/`{}`
substitution, dry-run pipeline (file variables + array expansion), the shipped
example, and retry (succeeds-after-N, exhausts-retries, no-retry-when-0).
`report-formatters.test.ts` (3 tests): CSV header/rows/escaping, HTML structure,
format dispatch.

## Learnings (carried forward)

1. **"Parsed and stored" ≠ "applied."** Every one of these had a type field and a
   CLI flag but no code consuming it — a feature isn't done until something reads it.
2. **Validate after transformation, not before.** Validating a template URL before
   substitution is checking the wrong artifact.
3. **Ship an example that the code can actually run, and test it.** A dry-run test
   over the shipped file keeps docs/examples honest for free.
