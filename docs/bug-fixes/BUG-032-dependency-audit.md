# BUG-032 — Dependency vulnerabilities (`npm audit`)

| | |
|---|---|
| **Severity** | Mixed (1 shipped moderate; rest dev-only) |
| **Area** | dependencies / security |
| **Status** | ✅ GREEN (shipped vuln cleared; dev-only ones triaged) |
| **Changed** | `package-lock.json` (lockfile-only) |

## Starting state

`npm audit` reported **20 vulnerabilities**. Triaged by whether they actually ship:

| Package | Sev | Ships? | Notes |
|---------|-----|--------|-------|
| `yaml` 2.0.0–2.8.2 | moderate | **YES** (runtime dep — batch YAML parsing) | Stack overflow on deeply-nested YAML |
| `rollup` 4.x | high | no (dev, via toolchain) | Path traversal |
| `vitest` <3.2.6 | critical | no (dev) | Only exploitable while the **Vitest UI server** is listening |
| `esbuild`, `@typescript-eslint/*` | mod/high | no (dev) | Build/lint toolchain |

## Action taken

Ran `npm audit fix` (non-breaking). This bumped the **shipped** `yaml` 2.8.1 → 2.9.0
(clearing the only user-facing vulnerability) and reduced the total from **20 → 11**,
**lockfile-only** (the `yaml` semver range already permitted 2.9.0). Verified:
typecheck + build clean, **390 unit + 20 e2e** green, batch e2e (which parses YAML)
passes.

## Deliberately deferred (dev-only, breaking)

The remaining 11 are all **devDependencies** and require major-version bumps
(`npm audit fix --force` → e.g. `vitest@4`, an upgrade from `vitest@1.6`). Decision:
**not now**, because:

1. **None ship.** They cannot affect installed users of `printeer`.
2. **The critical (`vitest`) is not exploitable in our usage** — it requires running
   the Vitest **UI server** (`--ui`), which this project never does (CI runs
   `vitest run`).
3. A `vitest@1 → 4` migration is a large, risky change to the very harness that just
   went green across 6 CI environments; doing it now would jeopardize that signal for
   no shipped-security benefit.

Tracked as a follow-up dev-tooling refresh (its own branch/PR), to be done
deliberately with the suite watched — not bundled into launch remediation.

## Learnings (carried forward)

1. **Triage `npm audit` by "does it ship?" first.** A moderate in a runtime dep
   outranks a critical in a dev-only one that isn't even reachable in your usage.
2. **Prefer lockfile-only `npm audit fix`** for runtime patches; reserve
   `--force` major bumps for a deliberate, separately-verified tooling refresh.
3. **Don't destabilize a just-green test harness for an unexploitable dev CVE.**
