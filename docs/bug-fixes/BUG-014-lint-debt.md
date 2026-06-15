# BUG-014 — Lint debt (36 eslint errors) blocked a hard CI lint gate

| | |
|---|---|
| **Severity** | Medium (quality / CI infrastructure) |
| **Area** | tests-quality |
| **Status** | ✅ GREEN |
| **Fixed in** | `.eslintrc.json`, `.github/workflows/ci.yml`, ~13 source files |
| **Guard** | `npm run lint` now exits 0 errors; CI `Lint` step is a hard gate |

## Summary

`npm run lint` reported **36 errors** (plus 117 `no-explicit-any` warnings), so CI's
lint step had to be `continue-on-error`. The errors were genuine: dead imports,
unused vars/args, one unreachable block, an intentional `while(true)`, and
`no-undef` for `NodeJS`/`document`/`window`.

## Fixes

- **`no-undef` (4)** — added `NodeJS`, `document`, `window` to `.eslintrc.json`
  `globals` (TS namespace + the browser globals used inside `page.evaluate`).
- **Unreachable code** — `disk-space-manager.ts#getTotalDiskUsage` had a dead
  `try/catch` around a constant `return`; simplified to the plain return (the
  10% placeholder itself is tracked in the resources sweep).
- **`no-constant-condition`** — `filename-utils.ts` has an intentional
  `do { … } while (true)` bounded by a 1000-iteration throw; added a scoped
  `eslint-disable-line`.
- **Unused imports (~15)** — removed dead imports across `batch-processor`,
  `enhanced-cli`, `config/manager`, `config/index`, `core/browser-lifecycle-manager`,
  `templates/template-manager`, `test-utils/browser-cleanup`, `cli/types/cli.types`.
- **Unused args (~9)** — prefixed with `_` (`argsIgnorePattern: "^_"`), preserving
  signatures.
- **Unused locals (~4)** — removed (kept side-effecting calls, e.g. the preset
  validation `await configManager.getPreset(...)`).

## CI change

The `Lint` step in `.github/workflows/ci.yml` dropped `continue-on-error` — lint is
now a **hard gate** on Windows + Linux.

## Verification

`npm run lint` → **0 errors** (117 `any` warnings remain, non-blocking). Typecheck
clean, build clean, **364 unit + 19 e2e** still green.

## Learnings (carried forward)

1. **Keep lint at zero errors so it can gate.** A perpetually-red lint step trains
   everyone to ignore it; clear the debt, then make it blocking.
2. **`no-undef` for framework globals is a config concern, not a code one** —
   `page.evaluate` bodies legitimately reference `document`/`window`.
3. The remaining `no-explicit-any` warnings are a separate, larger typing effort —
   tracked, not blocking.
