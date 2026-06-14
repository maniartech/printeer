# Phase 2 — Puppeteer 19 → 25 upgrade + self-maintaining updater

## Summary

Upgraded Puppeteer **19.5.2 → 25.1.0** (bundled Chromium **109 → 149**) and added
a low-maintenance, idempotent, rollback-safe updater so the project can stay
current with one command.

This also resolves the audit finding *"puppeteer pinned to ^19.5.2 (very old)"*
and unblocks modern PDF/screenshot options.

## Code migration (19 → 25 breaking changes)

| Change | Sites |
|---|---|
| `headless: "new"` → `headless: true` (puppeteer 22+ made `true` = new headless; `"new"` removed) | `api/index.ts`, `printing/browser.ts`, `diagnostics/doctor.ts`, `utils/index.ts` (`getHeadlessFromEnv`) |
| Type `PuppeteerLaunchOptions` → `LaunchOptions` (renamed) | `printing/browser.ts`, `diagnostics/doctor.ts` |
| `browser.isConnected()` (method) → `browser.connected` (property) | `core/browser-lifecycle-manager.ts`, `printing/browser.ts`, `test-utils/browser-cleanup.ts` |

Verified: `tsc --noEmit` clean, build clean, **364 unit + 19 e2e** green with real
Chromium 149, `doctor` reports `Chrome/Chromium — v149 (bundled)` and PDF/PNG OK.

## The self-maintaining updater

`scripts/update-puppeteer.mjs`:

- **Idempotent** — reads the latest version from the npm registry (no hardcoded
  versions) and is a **noop** when already current:
  `current=25.1.0 latest=25.1.0 → noop`.
- **Rollback-safe** — snapshots `package.json` + `package-lock.json` before
  changing anything; if post-upgrade verification fails it **auto-restores** and
  `npm ci`s back.
- **Verified** — after install it runs `npm run build` + a Puppeteer smoke
  conversion (`scripts/update-puppeteer.smoke.mjs`). Fail → rollback.
- **Low-maintenance** — data-driven; pure decision logic (`compareVersions`,
  `planUpgrade`) is unit-tested in `tests/scripts/update-puppeteer.test.ts`.

Modes:

```
node scripts/update-puppeteer.mjs            # --check (dry run)
node scripts/update-puppeteer.mjs --apply    # upgrade + verify + auto-rollback
node scripts/update-puppeteer.mjs --rollback # restore last snapshot
```

A scheduled CI job can run `--check` periodically and open a PR when a newer
version exists.

## Known follow-up

`npm audit` reports vulnerabilities in **dev** dependencies (esbuild 0.16,
eslint 8, vitest 1, @vitest/coverage-v8 1). These don't ship (dev-only, excluded
by the `files` allowlist) but are tracked for a separate dev-tooling
modernization.

## Learnings (carried forward)

1. **Do the code migration *with* the upgrade, behind the e2e net.** The 6-major
   jump had three distinct breaking changes; the real-Chromium e2e suite is what
   proved the migration correct (a type-only check would have missed runtime
   behavior).
2. **An updater must verify then rollback.** "Install and hope" is how a tool
   breaks in the field; snapshot → install → verify → (rollback on failure) makes
   updates safe to run unattended.
3. **Keep the decision logic pure and tested**, isolated from the IO, so the risky
   part (version math, upgrade/noop decision) is covered without running installs.
