# BUG-040 — Dev-tooling refresh: clear the remaining dev-only audit vulns

| | |
|---|---|
| **Severity** | Low (dev-only security / tooling currency) |
| **Area** | dependencies / tooling |
| **Status** | ✅ GREEN |
| **Changed** | `package.json`, `package-lock.json`, `.eslintrc.json` |
| **Follows** | [BUG-032](BUG-032-dependency-audit.md) (which deferred these) |

## Summary

BUG-032 patched the only *shipped* vulnerability (`yaml`) and deliberately
deferred the remaining **11 dev-only** advisories because they required breaking
major bumps (notably `vitest@1 → 4`) and weren't worth destabilizing a
just-green test harness. This change does that refresh deliberately, with the
suite watched.

`npm audit` is now **0 vulnerabilities** (was 11).

## Upgrades

| Package | From | To | Notes |
|---------|------|----|----|
| `vitest` | ^1.0.0 (1.6.1) | ^4.1.9 | keystone — pulls fresh `vite`/`esbuild`, clears the "UI server" critical |
| `@vitest/coverage-v8` | ^1.0.0 | ^4.1.9 | matches vitest |
| `@types/node` | ^18 | ^20 | required by vitest@4's peer (`^20 || ^22 || >=24`) |
| `esbuild` | ^0.16.13 | ^0.28.1 | build flags unchanged; clears esbuild dev-server CVEs |
| `@typescript-eslint/parser` | ^6.21.0 | ^8.61.0 | clears transitive `minimatch` ReDoS |
| `@typescript-eslint/eslint-plugin` | ^6.21.0 | ^8.61.0 | (kept ESLint 8.57 — ts-eslint 8 supports it) |

## Adjustments required

- **ESLint `caughtErrors`**: typescript-eslint 8 made `no-unused-vars` flag
  unused `catch (error)` bindings by default (41 pre-existing intentional
  error-swallows). Restored the project's prior baseline with
  `"caughtErrors": "none"` (args/vars checks stay strict). No source churn — the
  bump is behavior-neutral for `src/`.
- **`@types/node` ^18 → ^20**: only type definitions; the code already targets
  Node ≥18 APIs (`fs.statfs`) and CI still runs the matrix on Node 18/20/22.

## Verification

- `npm audit` → **0 vulnerabilities**.
- `npm run lint` → 0 problems · `npx tsc --noEmit` → clean · `npm run build` → clean.
- Full suite under vitest 4: **402 unit + 21 e2e** green (the e2e config and all
  `vi.mock`/`vi.spyOn` usage work unchanged on v4).

## Known follow-up (non-blocking)

vitest 4 emits a deprecation warning for four `vi.unmock(...)` calls placed inside
a nested `beforeEach` in `tests/diagnostics/doctor.test.ts` (vitest hoists them to
module top level). Tests pass; moving them naively would unmock `os`/`fs` globally
and break the file's other mocked tests, so it needs a deliberate test refactor —
tracked, not done here, to keep this change a pure dependency bump.

## Learnings (carried forward)

1. **Do risky major bumps deliberately, behind the test suite** — not via
   `npm audit fix --force`, which would have cascaded every breaking major at once.
2. **A peer-dep bump can ride along** (`@types/node` for vitest@4); read the
   ERESOLVE message rather than reaching for `--force`.
3. **Linter major bumps change rule defaults.** ts-eslint 8's stricter
   `caughtErrors` is a config decision, not a code defect — restore the baseline
   or fix deliberately, but don't conflate it with the upgrade's success.
