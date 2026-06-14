# BUG-010 — Documented environment variables had no effect

| | |
|---|---|
| **Severity** | High (blocker) |
| **Area** | config |
| **Status** | ✅ GREEN (env vars) — `.printeerrc.json` library wiring tracked separately |
| **Fixed in** | `src/utils/index.ts`, `src/api/index.ts` |
| **Test** | `tests/config/env-options.test.ts`, `tests/e2e/env-config.e2e.test.ts` |

## Summary

The README documents these environment variables, but they did nothing on the
conversion path:

| Documented | Reality (before) |
|---|---|
| `PRINTEER_BROWSER_EXECUTABLE_PATH` | ignored — code only read `PUPPETEER_EXECUTABLE_PATH` |
| `PRINTEER_BROWSER_HEADLESS` | ignored |
| `PRINTEER_LOG_LEVEL` | ignored |

## Fix

- New `getBrowserExecutablePath()` resolves `PRINTEER_BROWSER_EXECUTABLE_PATH`
  first, then falls back to `PUPPETEER_EXECUTABLE_PATH`. Both the oneshot and
  pool launch paths (`src/api/index.ts`) now use it.
- New `getHeadlessFromEnv()` maps `PRINTEER_BROWSER_HEADLESS=false|0|no` to a
  headed browser; `getDefaultBrowserOptions()` uses it.
- `PRINTEER_LOG_LEVEL` of `silent`/`error` now suppresses the debug/strategy
  chatter (same effect as `PRINTEER_SILENT`).

## Test guarantee

- Unit: `getBrowserExecutablePath` precedence/fallback, `getHeadlessFromEnv`
  truthiness, and `getDefaultBrowserOptions` reflecting both.
- E2E: a **bogus** `PRINTEER_BROWSER_EXECUTABLE_PATH` makes a real conversion
  fail (proving the value reaches the launch — it would otherwise succeed with
  bundled Chromium); `PRINTEER_LOG_LEVEL=error` produces a valid PDF with no
  `Using browser strategy` line on stdout/stderr.

## Scope note / follow-up

This fixes the **documented env vars**. The related finding that a
`.printeerrc.json` config file is not applied to the *library API* or the bare
two-arg CLI path is a larger architectural change (config → conversion wiring)
and is tracked as a separate item in the ledger.

## Learnings (carried forward)

1. **Documented config must be wired to the hot path, with a test that observes
   the effect** (not just that the value is read). The bogus-path test is a cheap,
   robust way to prove an env var reaches the browser launch.
2. **Prefer the namespaced env var, keep the upstream one as fallback** so both
   `PRINTEER_*` (documented) and `PUPPETEER_*` (native) work.
