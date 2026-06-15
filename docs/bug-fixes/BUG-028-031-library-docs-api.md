# BUG-028 / 029 / 030 / 031 — Library docs vs. real API

A cluster of documentation-vs-code mismatches found by auditing `docs/05_library.md`
and `docs/06_diagnostics.md` against the actual exports. Each is fixed so the docs
are honest and the documented features actually work.

| | |
|---|---|
| **Status** | ✅ GREEN |
| **Test** | `tests/public-surface.test.ts`, `tests/printing/pool-concurrency.test.ts`, `tests/e2e/doctor.e2e.test.ts` |

## BUG-028 — README "Custom Browser Management" example didn't match the API

The docs hinted at "internal managers" with no working example, and the bug-fixes
backlog noted a missing `cleanup()` method. The real `DefaultBrowserManager` had
`shutdown()` and `emergencyCleanup()` but no `cleanup()`.

**Fix:** added `cleanup()` as a graceful-shutdown alias (`async cleanup() { await
this.shutdown(); }`), and rewrote the doc section with a real, working example
(`new DefaultBrowserManager(...)` → `initialize` → `getBrowser`/`releaseBrowser` →
`cleanup()` in `finally`). Guarded by a unit test (idempotent, releases the pool).

## BUG-029 — `PRINTEER_DUMPIO=1` documented but not implemented

`docs/06_diagnostics.md` told users to set `PRINTEER_DUMPIO=1` to see Chrome's
stdio. No code read that variable (the doctor only piped stdio when verbose).

**Fix:** the doctor now enables Puppeteer `dumpio` when `this.verbose` **or**
`process.env.PRINTEER_DUMPIO === '1'`, making the documented variable real.

## BUG-030 — documented subpath imports / fields didn't exist

The docs imported from non-existent subpath packages and referenced a field that
isn't in the schema:

- `import { EnhancedConfigurationManager } from 'printeer/config'` — the class
  wasn't exported at all, and `printeer/config` doesn't resolve (no `exports` map).
- `import { BatchProcessor } from 'printeer/batch'` — `BatchProcessor` wasn't exported.
- `config.browser.headless` — `EnhancedPrintConfiguration` has no `browser` field
  (its sections are `page/pdf/image/viewport/wait/auth/emulation/performance`).

**Fix:** re-exported `EnhancedConfigurationManager`, `EnhancedPrintConfiguration`,
and `BatchProcessor` from the **main** entry (`'printeer'`); rewrote the docs to
import from `'printeer'` (no subpath packages exist) and to use real config fields
(`config.wait?.timeout`, `config.viewport?.width`, `config.pdf?.format`). Decided
against introducing an `exports` map (it would restrict consumers' module
resolution) — a single curated main entry is simpler and matches the docs.
Guarded by `public-surface.test.ts`.

## BUG-031 — doctor reported `bundled-chromium` placeholder instead of a real path

`getBrowserInfo()` returned `path: 'bundled-chromium'` for the bundled browser, so
the report said `Browser found at: bundled-chromium` — not actionable.

**Fix:** resolve the actual on-disk path via Puppeteer's `executablePath()` (async
in v25; await-unwrapped) and report it. The `buildLaunchOptions` sentinel that
avoids pinning `executablePath` for the bundled browser was switched from a
path-string check to a `source !== 'bundled'` check, so reporting the real path
doesn't change launch behavior.

## Learnings (carried forward)

1. **Docs are part of the surface — test the symbols they import.** A
   public-surface test that imports exactly what the README shows catches drift.
2. **Prefer a curated main entry over an `exports` map** unless subpath packages
   are truly needed; the map restricts resolution and is easy to get wrong.
3. **Don't ship placeholder strings in user-facing reports** (`bundled-chromium`,
   `0.1`) — resolve the real value or say "unknown" explicitly.
4. **A documented env var is an API contract** — implement it or remove the doc;
   `PRINTEER_DUMPIO` sat documented-but-dead.
