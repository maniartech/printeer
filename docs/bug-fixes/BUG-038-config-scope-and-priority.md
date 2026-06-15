# BUG-038 — `.printeerrc.json` library-path scope + batch `priority` ordering

| | |
|---|---|
| **Severity** | Low (docs accuracy + minor scheduling) |
| **Area** | config / batch / docs |
| **Status** | ✅ GREEN |
| **Fixed in** | `docs/03_configuration.md`, `src/batch/batch-processor.ts` |
| **Test** | `tests/batch/batch-features.test.ts` (priority case) |

## Part A — `.printeerrc.json` is not auto-loaded by the library primitive

`docs/03_configuration.md` presented the config cascade (config files, presets,
environments) and a "Hot Reloading" section as if the **library API** discovered
and watched `.printeerrc.json`. In reality the low-level `printeer(url, output,
type, options)` default export uses only the `options` passed to it; config-file
discovery is done by the **CLI** and by `EnhancedConfigurationManager`.

**Decision: clarify the docs rather than change the primitive.** Auto-loading
config files inside `printeer()` would be a back-compat-affecting behavior change
(an unrelated `.printeerrc.json` in `cwd` would suddenly alter output) and would
require reconciling two different config shapes (the legacy options object vs.
`EnhancedPrintConfiguration`). Keeping the primitive explicit is the safer, more
predictable design.

**Fix:** documented the boundary — the cascade applies to the CLI and to
programmatic use via `EnhancedConfigurationManager.loadConfiguration()` (now
exported from `'printeer'`, see BUG-030); the `printeer()` primitive is explicit.
Rewrote the "Hot Reloading" section to describe the real
`ConfigurationManager.enableHotReload()` API instead of implying the primitive
watches files.

## Part B — batch `priority` was parsed but ignored

`BatchJob.priority` (and the CSV `priority` column, and the shipped example's
`priority: 1`) were parsed but never affected scheduling.

**Fix:** the initial queue of dependency-free jobs is now ordered by `priority`
(lower number = higher priority; unset runs last). Priority is a hint —
dependency edges still gate ordering and concurrency runs several jobs at once —
but it is no longer silently dropped.

**Test:** with `concurrency: 1`, three dependency-free jobs with priorities 3/1/2
start in order `high, mid, low`.

## Learnings (carried forward)

1. **Document the boundary between a primitive and its conveniences.** The library
   call is a primitive; file/preset/env resolution is a higher-level concern.
   Saying so prevents "why didn't my `.printeerrc` apply?" confusion.
2. **Don't add magic file-loading to a low-level call** for doc parity — clarify
   instead; implicit cwd-file behavior is a footgun and a back-compat hazard.
3. **Even "hint" fields shouldn't be silently ignored** — wire `priority` or drop
   it from the schema/example.
