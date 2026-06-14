# Phase 0 & 1 — Test foundation and CI (the "100% guarantee" machinery)

This isn't a single bug; it's the infrastructure that makes every per-bug
guarantee real. It also closes several **tests-quality** audit findings.

## What was built

### Phase 0 — test foundation

- **`tests/fixtures/fixture-server.ts`** — a dependency-free localhost HTTP
  server (Node `http` only) with deterministic routes (static, tall, delayed,
  headers, 404/500, flaky-for-retries). No public-internet dependency.
- **`tests/e2e/helpers.ts`** — drives the **built** artifacts: `runCli()` spawns
  `dist/bin/cli.js` as a child process (capturing stdout/stderr/exit code, with
  vitest's forced env stripped so it behaves like a real user), plus
  dependency-free `assertValidPdf` / `assertValidPng` / `readPngSize`.
- A growing **e2e suite** under `tests/e2e/` that exercises real conversions with
  bundled Chromium on Windows and Linux.

### Phase 1 — CI on Windows + Linux

- **`.github/workflows/ci.yml`** — matrix `os: [ubuntu-latest, windows-latest] ×
  node: [18, 20, 22]`. Steps: install → lint (non-blocking for now) → typecheck →
  build → unit tests → e2e tests → `npm pack --dry-run`. Caches the Puppeteer
  browser. Sets `PRINTEER_NO_SANDBOX=1` so headless Chrome launches on CI Linux.
- Added a `PRINTEER_NO_SANDBOX` hook to the oneshot launch path (and root
  detection) so server/CI Linux environments work out of the box.

## Test isolation learning (important)

The browser e2e files passed individually and as a group, but **failed when run
amid the full parallel unit-test fork storm** on Windows — dozens of forks plus
concurrent Chrome launches caused launch contention/timeouts.

**Fix:** split configs.
- `vitest.config.ts` (default, parallel) runs unit/integration and **excludes**
  `tests/e2e/**`.
- `vitest.e2e.config.ts` runs the e2e suite with `fileParallelism: false`
  (serial), longer timeouts, and the bundled-Chromium env.
- Scripts: `test` (unit), `test:e2e` (build + serial e2e), `test:all` (both).

**Learning:** browser-driven tests must be isolated from high-parallelism unit
runs; resource-contended Chrome launches are a flakiness source, especially on
Windows. Serial e2e + parallel unit is the reliable split.

## Audit findings closed

- *CI runs no tests (default CircleCI stub)* → real GitHub Actions matrix runs the
  full suite on Windows + Linux.
- *No automated test exercises the core `printeer()` conversion* → covered by
  `tests/e2e/core-conversion.e2e.test.ts` (real PDF/PNG bytes).
- *e2e/CLI/batch tests excluded from `npm test`* → now run via `test:e2e`/`test:all`.

## Current status

- Unit: **360 passing** / 30 pre-existing skips.
- E2E: **19 passing** (serial), real Chromium, Windows-verified locally.
- Typecheck: clean. Build: clean.
