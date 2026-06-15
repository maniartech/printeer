# BUG-040 — Dev-tooling refresh: clear the remaining dev-only audit vulns

| | |
|---|---|
| **Severity** | Low (dev-only security / tooling currency) |
| **Area** | dependencies / tooling |
| **Status** | ✅ GREEN |
| **Changed** | `package.json` (+`overrides`), `package-lock.json`, `.eslintrc.json` |
| **Follows** | [BUG-032](BUG-032-dependency-audit.md) (which deferred these) |

## Summary

BUG-032 patched the only *shipped* vulnerability (`yaml`) and deferred the
remaining **11 dev-only** advisories pending a deliberate tooling refresh. This
change does that refresh — **`npm audit` is now 0 vulnerabilities** — while
**keeping Node 18 in the support matrix**.

## The Node 18 constraint (key decision)

The obvious move — `vitest@1 → 4` — **does not work**: vitest 4's engines are
`^20 || ^22 || >=24` and its runtime uses Node 20+ APIs (`styleText` from
`node:util`). The package supports Node ≥18 (`engines.node`) and CI tests Node
18/20/22. Jumping to vitest 4 made the **Node 18 CI jobs fail at startup** (proved
on a real CI run). Dropping Node 18 is a *product* decision (Node 18 is EOL, but
that's the maintainer's call), so it was avoided here.

**Resolution:** `vitest@^3.2.6` — the patched 3.x line. It clears the critical
"Vitest UI server" advisory and still supports Node 18. The remaining transitive
**esbuild** dev-server advisories (pulled by vitest 3's bundled vite) were cleared
with an npm `override` pinning esbuild to the patched `^0.28.1` everywhere.

## Upgrades

| Package | From | To | Notes |
|---------|------|----|----|
| `vitest` | ^1.0.0 (1.6.1) | ^3.2.6 | clears the UI-server critical; keeps Node 18 |
| `@vitest/coverage-v8` | ^1.0.0 | ^3.2.6 | matches vitest |
| `esbuild` (direct) | ^0.16.13 | ^0.28.1 | build flags unchanged |
| `@typescript-eslint/parser` | ^6.21.0 | ^8.61.0 | clears transitive `minimatch` ReDoS |
| `@typescript-eslint/eslint-plugin` | ^6.21.0 | ^8.61.0 | (kept ESLint 8.57 — ts-eslint 8 supports it) |
| **override** `esbuild` | — | `^0.28.1` | forces vitest/vite's transitive esbuild to the patched build |

`@types/node` stays `^18` (vitest 3 doesn't require 20), matching the Node-18 floor.

## Adjustments required

- **ESLint `caughtErrors`**: typescript-eslint 8 made `no-unused-vars` flag
  unused `catch (error)` bindings by default (41 pre-existing intentional
  error-swallows). Restored the project's prior baseline with
  `"caughtErrors": "none"` (args/vars checks stay strict). No source churn.

## Verification

- `npm audit` → **0 vulnerabilities** (was 11).
- `npm run lint` → 0 · `npx tsc --noEmit` → clean · `npm run build` → clean.
- Full suite on vitest 3.2.6 (esbuild forced to 0.28.1): **402 unit + 21 e2e** green.
- CI matrix incl. **Node 18** must stay green (the whole reason for staying on 3.x).

## Known follow-up (non-blocking)

vitest 3 emits a deprecation note for four `vi.unmock(...)` calls inside a nested
`beforeEach` in `tests/diagnostics/doctor.test.ts` (hoisted to top level). Tests
pass; a naive move would unmock `os`/`fs` globally and break the file's other
mocked tests, so it needs a deliberate test refactor — tracked, not done here.

If/when the project drops Node 18 (it's EOL), revisit vitest 4 and remove the
esbuild override.

## Learnings (carried forward)

1. **A test-runner major can outrun your supported Node floor.** vitest 4 needs
   Node 20; the package supports 18. Check `engines` against your CI matrix before
   bumping — and let CI's Node-18 job be the proof.
2. **`npm overrides` can patch a transitive dev vuln** without a major bump of the
   parent — here, forcing vitest's bundled esbuild to the fixed version.
3. **Do risky bumps behind the suite, not via `npm audit fix --force`**, which
   would have installed vitest 4 and silently broken Node 18.
4. **Linter major bumps change rule defaults** (ts-eslint 8's `caughtErrors`) —
   that's a config decision, not a code defect.
