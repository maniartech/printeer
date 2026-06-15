# BUG-040 — Dev-tooling refresh: drop EOL Node 18, clear `npm audit` to 0

| | |
|---|---|
| **Severity** | Low (dev-only security / tooling currency) |
| **Area** | dependencies / tooling / runtime support |
| **Status** | ✅ GREEN (`npm audit` 0) |
| **Changed** | `package.json` (engines), `package-lock.json`, `.eslintrc.json`, `.github/workflows/ci.yml` |
| **Follows** | [BUG-032](BUG-032-dependency-audit.md) (which deferred these) |

## Summary

BUG-032 patched the only *shipped* vuln (`yaml`) and deferred **11 dev-only**
advisories. This refresh takes `npm audit` to **0** and modernizes the toolchain
(vitest 4 / vite 8 / typescript-eslint 8), at the cost of **dropping Node 18**.

## The decision: drop Node 18 (EOL)

A pristine audit requires `vitest@4` / `vite@7+`, whose engines are **Node ≥20**
(`vitest@4` uses the Node-20 `node:util.styleText`; a real CI run proved vitest@4
fails the Node 18 jobs at startup). An interim attempt — `vitest@3.2.6` + a pinned
`vite@^6` — kept Node 18 but left **6 non-exploitable esbuild dev-server**
advisories (unreachable in `vitest run`).

Since **Node 18 reached end-of-life in April 2025**, supporting it is itself weak
posture; the maintainer chose to drop it for a clean audit and current tooling.
`engines.node` is now **`>=20`** and the CI matrix is **Node 20/22/24** (was
18/20/22).

## Upgrades

| Package | From | To | Why |
|---------|------|----|----|
| `vitest` / `@vitest/coverage-v8` | ^1.0.0 | ^4.1.9 | clears the UI-server **criticals** + transitive esbuild |
| `vite` | transitive | 8 (transitive) | pulled by vitest 4; no Node-18 pin needed |
| `esbuild` (direct, our build) | ^0.16.13 | ^0.28.1 | build flags unchanged |
| `@typescript-eslint/parser` + `eslint-plugin` | ^6.21.0 | ^8.61.0 | clears the transitive `minimatch` ReDoS |
| `@types/node` | ^18 | ^20 | matches the new Node-20 floor (vitest 4 peer) |
| `engines.node` | `>=18` | `>=20` | Node 18 is EOL |
| CI matrix | 18/20/22 | 20/22/24 | drop EOL 18, add current 24 |

## Adjustment

typescript-eslint 8 made `no-unused-vars` flag unused `catch (error)` bindings
(41 pre-existing intentional swallows). Restored the prior baseline with
`"caughtErrors": "none"` (args/vars checks stay strict) — no source churn.

## Verification

- `npm audit` → **0 vulnerabilities** (was 11).
- `npm ci --dry-run` → in sync.
- `npm run lint` 0 · `npx tsc --noEmit` clean · `npm run build` clean.
- Full suite on vitest 4: **402 unit + 21 e2e** green. CI green on Node 20/22/24
  (Windows + Linux).

## Consumer impact

`engines.node >= 20` means installing on Node 18 now warns (npm) / can be blocked
(with `engine-strict`). The *shipped* code is unaffected — it already targeted
Node ≥18 APIs — but the supported runtimes are now the maintained ones (20+).

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
