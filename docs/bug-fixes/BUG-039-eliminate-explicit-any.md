# BUG-039 — Eliminate all 117 `no-explicit-any` warnings; make it a hard gate

| | |
|---|---|
| **Severity** | Low (type safety / maintainability) |
| **Area** | tests-quality / typing |
| **Status** | ✅ GREEN |
| **Fixed in** | ~20 `src/**` files + `.eslintrc.json` |
| **Guard** | `@typescript-eslint/no-explicit-any` is now **`error`** for `src/**` |

## Summary

The codebase carried **117** `@typescript-eslint/no-explicit-any` warnings (tracked
since BUG-014, which cleared the lint *errors* but left these as warnings). They're
now all removed and the rule is promoted to a hard error for `src/**`, so `any`
cannot creep back into shipped code.

## Approach

Every `any` was replaced with a precise type where obvious, otherwise `unknown`
plus a local narrowing/`as` cast at the use site — **no runtime behavior changed**,
only annotations and casts. Common patterns:

- Dynamic plain objects → `Record<string, unknown>` (config merge, CLI options,
  batch variables, error `details`).
- Env-var narrowing casts → the real literal unions (`OperationMode`, `LogLevel`,
  `Environment`, …) instead of `as any`.
- Puppeteer interop → real `Browser` / `Page` / `LaunchOptions` types with casts at
  the SDK boundary.
- `(global as any).X` → `(global as unknown as { X?: T })`.
- `ConfigMapping` parser/serializer function types → `(value: string) => unknown` /
  `(value: unknown) => string`; the concrete serializers were widened to accept
  `unknown` and narrow internally (resolving the function-parameter contravariance
  that originally forced `any`).

The bulk mechanical work was parallelized across per-file subagents, each
restricted to a single file and verified against `tsc --noEmit`; the shared
type-definition files (which cascade to consumers) were done by hand.

## Verification

- `npm run lint` → **0 problems** (was 117 warnings).
- `npx tsc --noEmit` → 0 errors.
- `npm run build` → clean.
- Full suite green: **402 unit + 20 e2e**.

## Lint gate

`.eslintrc.json`: `@typescript-eslint/no-explicit-any` set to **`error`**, with an
override keeping it a **warning** for `tests/**`, `**/*.test.ts`, and
`src/test-utils/**` (test scaffolding legitimately uses `any` for casting into
private members and mocks). `npm run lint` (which lints `src/**`) is the CI gate.

## Learnings (carried forward)

1. **`unknown` + a cast at the boundary beats `any` everywhere.** It forces the
   narrowing to happen once, at the edge, instead of silently propagating.
2. **Function-type `any` is usually a contravariance smell.** A `(value: any)`
   callback type often hides incompatible concrete signatures; widening the
   concrete functions to `unknown` is the real fix.
3. **Clear the debt, then gate it.** Like BUG-014's error gate, promoting the rule
   to `error` only after reaching zero keeps it from regressing.
4. **Parallelize mechanical, file-local refactors** (per-file subagents) but keep
   shared type-definition edits centralized — they cascade.
