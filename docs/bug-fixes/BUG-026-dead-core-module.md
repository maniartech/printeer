# BUG-026 — Remove dead `src/core` module (unused 536-line manager + empty stubs)

| | |
|---|---|
| **Severity** | Low (maintainability / dead weight) |
| **Area** | resources / repo-hygiene |
| **Status** | ✅ GREEN |
| **Removed** | `src/core/` (browser-lifecycle-manager.ts, browser.ts, doctor.ts, README.md, __tests__/) |
| **Guard** | typecheck + build + full suite green after removal |

## Summary

`src/core/` contained:

- `browser-lifecycle-manager.ts` — a **536-line** `BrowserLifecycleManager`
  singleton (browser registration, process monitoring, graceful/force shutdown).
- `browser.ts`, `doctor.ts` — **empty (0-byte)** stub files.
- `README.md` — documentation for the lifecycle manager only.
- `__tests__/` — an **empty** directory.

A repo-wide search found **zero** references to `BrowserLifecycleManager` or any
`core/*` path outside the module itself — no imports, no dynamic requires, no
public-surface export, no test usage.

## Why it's safe to delete

The lifecycle manager's capability (no zombie Chromium processes) is already
implemented and **used** in `DefaultBrowserManager` / `DefaultBrowserFactory`:
`destroyBrowserInstanceAggressively()`, `forceKillProcess()`,
`systemKillBrowserProcess()`, and `verifyNoRemainingProcesses()`. Removing the
unused duplicate loses no functionality.

Notably, this dead file had been **carried along as cost**: the BUG-014 lint sweep
removed unused imports from it, and the Phase-2 Puppeteer migration updated its
`isConnected()→connected` call — effort spent maintaining code nothing runs.

## Verification

After `git rm -r src/core`: `tsc --noEmit` clean, `npm run build` clean,
**388 unit + 20 e2e** green. Nothing imported it, so nothing broke.

## Learnings (carried forward)

1. **Delete dead modules promptly** — they silently tax every sweep (lint,
   migration, typecheck) while running nothing.
2. **Before deleting, prove zero references** across src, tests, dynamic imports,
   and the public export surface — then let the build + full suite be the guard.
3. **Duplicate capability is a smell**: two implementations of "kill zombie
   browsers" meant one was unused. Keep the wired one, drop the orphan.
