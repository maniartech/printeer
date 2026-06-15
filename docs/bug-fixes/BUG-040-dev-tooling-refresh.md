# BUG-040 — Dev-tooling refresh: clear the dev-only audit vulns (Node-18 constrained)

| | |
|---|---|
| **Severity** | Low (dev-only security / tooling currency) |
| **Area** | dependencies / tooling |
| **Status** | ✅ GREEN (critical + most highs cleared; residual documented) |
| **Changed** | `package.json`, `package-lock.json`, `.eslintrc.json` |
| **Follows** | [BUG-032](BUG-032-dependency-audit.md) (which deferred these) |

## Summary

BUG-032 patched the only *shipped* vuln (`yaml`) and deferred **11 dev-only**
advisories. This refresh upgrades the tooling **while keeping Node 18 in the
support matrix**, taking `npm audit` from **11 → 6** — clearing both **criticals**
(the Vitest UI-server RCE), both moderates, and the `minimatch` ReDoS high.

The remaining **6 high** are a single transitive **esbuild dev-server** advisory
and are **not reachable in this project**: they require running esbuild/Vite's
network dev server, which `vitest run` (CI) and normal local test runs never start.

## The Node 18 constraint (why not 0)

A pristine audit needs `vitest@4` / `vite@7`, whose engines are **Node ≥20**
(`vite@7` requires `^20.19 || >=22.12`; vitest@4 uses Node-20 `node:util.styleText`).
The package declares `engines.node >= 18` and CI tests Node 18/20/22 — and a real
CI run **proved** vitest@4 fails the Node-18 jobs at startup. Dropping Node 18 is a
*product* decision (Node 18 is EOL since Apr 2025), so it was **not** taken
unilaterally here.

**Resolution:** `vitest@^3.2.6` (clears the UI-server critical, supports Node 18),
with `vite` pinned to **^6** as a direct devDependency so the tree resolves to a
Node-18-compatible Vite (a fresh install otherwise pulls `vite@7` → Node 20+, which
breaks `npm ci` on the Node 18 jobs).

## Upgrades

| Package | From | To | Why |
|---------|------|----|----|
| `vitest` / `@vitest/coverage-v8` | ^1.0.0 | ^3.2.6 | clears the UI-server **critical**; keeps Node 18 |
| `vite` (pinned direct dev) | (transitive 7) | ^6 | Node-18-compatible Vite for the test toolchain |
| `esbuild` (direct, our build) | ^0.16.13 | ^0.28.1 | build flags unchanged |
| `@typescript-eslint/parser` + `eslint-plugin` | ^6.21.0 | ^8.61.0 | clears the transitive `minimatch` ReDoS |

`@types/node` stays `^18` (matches the Node-18 floor; vitest 3 doesn't require 20).

## Adjustment

typescript-eslint 8 made `no-unused-vars` flag unused `catch (error)` bindings
(41 pre-existing intentional swallows). Restored the prior baseline with
`"caughtErrors": "none"` (args/vars checks stay strict) — no source churn.

## Verification

- `npm audit` → **6 high** (down from 11), all the transitive esbuild dev-server
  advisory; criticals/moderates/minimatch cleared.
- `npm ci --dry-run` → in sync (the Node-18 CI jobs install cleanly again).
- `npm run lint` 0 · `npx tsc --noEmit` clean · `npm run build` clean.
- Full suite on vitest 3.2.6 + vite 6: **402 unit + 21 e2e** green.

## The remaining decision (maintainer's call)

To reach **`npm audit` 0**, drop Node 18 (EOL): bump `engines.node` to `>=20`,
remove `18` from the CI matrix, and move to `vitest@4` / `vite@7` (and
`@types/node@^20`). Until then, the 6 residual advisories are dev-only and
unreachable in `vitest run`.

## Known follow-up (non-blocking)

vitest 3 warns about four `vi.unmock(...)` calls inside a nested `beforeEach` in
`tests/diagnostics/doctor.test.ts` (hoisted to top level). Tests pass; a naive move
would unmock `os`/`fs` globally and break the file's other mocked tests — needs a
deliberate test refactor.

## Learnings (carried forward)

1. **A test-runner major can outrun your supported Node floor.** Check `engines`
   against the CI matrix before bumping; let the Node-18 job be the proof.
2. **`npm audit fix --force` would have silently installed vitest 4** and broken
   Node 18 — do risky bumps behind the suite instead.
3. **Pin the transitive that gates your Node floor** (here `vite@^6`) rather than
   chasing a clean audit into an unsupported runtime.
4. **Severity ≠ exploitability.** A "high" esbuild *dev-server* advisory is moot
   when you never run the dev server — weigh reachability, not just the number.
