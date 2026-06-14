# BUG-012 — README advertises ISC; package is Apache-2.0

| | |
|---|---|
| **Severity** | High (blocker — legal/licensing clarity) |
| **Area** | docs |
| **Status** | ✅ GREEN |
| **Fixed in** | `README.md`, `CHANGELOG.md` (new) |
| **Test** | `tests/packaging.test.ts` › *docs accuracy (BUG-012)* |

## Summary

`package.json` declares `"license": "Apache-2.0"` and the repo ships an Apache-2.0
`LICENSE` file, but the README advertised **ISC** in two places:

- the badge: `![License: ISC](…/badge/License-ISC-blue…)`
- the footer: `[ISC](LICENSE) © ManiarTech`

Conflicting license signals are a real legal-clarity problem for adopters.

## Fix

- Badge → `License: Apache 2.0` linking to the Apache-2.0 text.
- Footer → `[Apache-2.0](LICENSE) © ManiarTech`.
- Created `CHANGELOG.md` (the README links to it; it previously 404'd).

## Test guarantee

`tests/packaging.test.ts` asserts the README contains no `License: ISC` /
`badge/License-ISC` and that `CHANGELOG.md` exists. `package.json` license is
asserted to be `Apache-2.0`.

## Learnings (carried forward)

1. **Single source of truth for license.** `package.json` + `LICENSE` are
   authoritative; badges/prose must be tested against them, not hand-maintained.
2. **Treat doc links as testable artifacts.** A README link to a non-existent
   file (`CHANGELOG.md`) is a broken promise; assert referenced files exist.
