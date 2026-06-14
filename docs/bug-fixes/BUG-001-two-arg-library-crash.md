# BUG-001 — `printeer(url, output)` two-arg library call crashes

| | |
|---|---|
| **Severity** | Critical (launch blocker) |
| **Area** | core-api |
| **Status** | ✅ GREEN |
| **Fixed in** | `src/api/index.ts` |
| **Test** | `tests/e2e/core-conversion.e2e.test.ts` › *BUG-001: …TWO args…* / *…THREE args…* |

## Summary

The package's headline library example — the very first one in the README —
crashed on the first call:

```js
import printeer from 'printeer';
await printeer('https://example.com', 'output.pdf'); // throws
```

## Reproduction (red)

```
TypeError: Cannot read properties of undefined (reading 'waitUntil')
  ❯ runOneshotConversion src/api/index.ts:282:38
  ❯ api_default          src/api/index.ts:218:14
```

No output file is produced. The 2-arg and 3-arg forms both fail; only the
undocumented 4-arg form `printeer(url, out, null, {})` worked (which is why the
CLI — which always passes `{}` — masked the bug).

## Root cause

The default export declared the 4th parameter **without a default value**:

```ts
export default async (url, outputFile, outputType = null, browserOptions: any) => { … }
```

When called with 2 or 3 args, `browserOptions` is `undefined`. The strategy
dispatcher then enters `runPooledConversion`/`runOneshotConversion`, which
dereference it immediately:

```ts
const waitUntil = browserOptions.waitUntil || 'networkidle0'; // 💥 undefined.waitUntil
```

`createOneshotBrowser` *was* guarded against undefined, but the conversion
functions were not, so the crash happened before any browser work.

## Fix

Default the parameter and normalize defensively at the top of the export, before
strategy dispatch:

```ts
export default async (url, outputFile, outputType = null, browserOptions: any = {}) => {
  browserOptions = browserOptions ?? {};
  …
}
```

`= {}` covers omitted args; `?? {}` additionally covers an explicit `undefined`
passed as the 4th argument.

## Test guarantee

`tests/e2e/core-conversion.e2e.test.ts` drives the **built** library against a
real bundled Chromium and the local `FixtureServer`:

- 2-arg `printeer(url, out)` → valid PDF (`%PDF-…%%EOF`, non-trivial size)
- 3-arg `printeer(url, out, null)` → valid PDF
- 4-arg regression guard still works
- non-http URL rejects with a clear error

Verified red→green: 2 failing → 7/7 passing after the one-line fix.

## Learnings (carried forward)

1. **Public entry points must normalize their inputs.** Any optional object
   parameter that is later dereferenced needs a default (`= {}`) *and* a runtime
   guard — TypeScript optionality does not protect JS callers.
2. **Test the *documented* call shapes, not the convenient ones.** The bug
   survived because every internal/CLI caller passed `{}`. e2e tests now exercise
   the exact 2/3/4-arg forms the README shows.
3. **The e2e harness must exercise the built artifact** (`dist/`), not `src/`,
   because bundling (ESM) is itself a source of bugs (see BUG-002).
