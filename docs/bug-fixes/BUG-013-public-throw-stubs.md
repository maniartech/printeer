# BUG-013 — Public API exported unfinished throw-stubs

| | |
|---|---|
| **Severity** | High (blocker) |
| **Area** | core-api |
| **Status** | ✅ GREEN |
| **Fixed in** | `src/api/index.ts`, `src/printing/index.ts`, `src/config/index.ts`; deleted `src/printing/converter.ts`, `src/config/configuration.ts` |
| **Test** | `tests/public-surface.test.ts` |

## Summary

Three symbols on the package's **public** surface were unfinished stubs that
threw at runtime:

- `convert()` — `throw new Error('Enhanced convert function not implemented yet …')`
- `DefaultConverter` — every method threw "not implemented"
- `DefaultConfigurationManager` — every method threw "Not implemented yet …",
  and it shadowed the real configuration managers

A consumer who discovered any of these via autocomplete/types hit an exception.

## Decision

Per the remediation decision, **remove them from the public API** (rather than
implement or soft-error), because they were advertised but non-functional and
nothing in the codebase used them.

## Fix

- Removed the `convert()` export from `src/api/index.ts`.
- Removed `export { DefaultConverter }` from `src/printing/index.ts` and **deleted**
  the orphaned `src/printing/converter.ts`.
- Removed `export * from './configuration'` from `src/config/index.ts` and
  **deleted** the orphaned `src/config/configuration.ts`.

Verified no internal code imported any of them (only barrel re-exports did).

## Test guarantee

`tests/public-surface.test.ts` imports the **built** library and asserts
`convert`, `DefaultConverter`, and `DefaultConfigurationManager` are all
`undefined`, while the real surface (`default` = `printeer()`, `doctor`,
`DefaultBrowserManager`) remains intact. This doubles as a guard against any
future "not implemented" export sneaking onto the surface.

## Learnings (carried forward)

1. **Don't export aspirational stubs.** A throw-on-call public symbol is worse
   than an absent one — it advertises capability that doesn't exist.
2. **Barrel `export *` leaks everything.** Wildcard re-exports surfaced internal
   placeholders. Prefer explicit named re-exports for the public entry, and keep
   a surface test as the contract.
