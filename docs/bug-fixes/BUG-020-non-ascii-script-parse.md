# BUG-020 — Non-ASCII glyphs in tooling scripts break parse on Windows CI

| | |
|---|---|
| **Severity** | Medium (CI reliability — Windows unit step red) |
| **Area** | tests-quality / scripts |
| **Status** | ✅ GREEN |
| **Fixed in** | `scripts/update-puppeteer.mjs`, `scripts/update-puppeteer.smoke.mjs` |
| **Found by** | First real CI run (Windows jobs) |

## Summary

On the Windows CI runners, the unit step failed loading the updater test:

```
FAIL tests/scripts/update-puppeteer.test.ts
SyntaxError: Invalid or unexpected token
  ❯ new Script node:vm:117:7
  ❯ tests/scripts/update-puppeteer.test.ts:2:31
```

The test only imports `scripts/update-puppeteer.mjs`; the parse failure was in
that imported module, not the test. It passed on local Windows and on CI Linux.

## Root cause

`update-puppeteer.mjs` (and its smoke companion) contained non-ASCII glyphs inside
string literals and comments — em-dash `—`, arrow `→`, and `✓`/`✗`:

```js
log(`current=${current} latest=${latest || 'unknown'} → ${plan.action}…`);
log(`✓ upgraded to puppeteer@${plan.to} and verified`);
```

The file is committed as valid, BOM-less UTF-8 (e.g. `✓` = `e2 9c 93`). It parses
fine everywhere the toolchain reads it as UTF-8, but under vitest's transform on
the GitHub **Windows** runners those multibyte sequences were mis-decoded, so the
`runInThisContext`/`new Script` compile step hit an "unexpected token." Linux and
local Windows happened to decode it correctly; the hosted Windows runner did not.

## Fix

Make the build/CI scripts **ASCII-only** — the durable, encoding-independent
choice for tooling that runs across shells and runners:

| Was | Now |
|-----|-----|
| `—` | `-` |
| `→` | `->` |
| `✓` | `[ok]` |
| `✗` | `[fail]` |

No behavior change; only the log/comment glyphs differ.

## Verification

`grep -P "[^\x00-\x7F]"` over both scripts → no matches. `update-puppeteer.test.ts`
passes locally; the scripts run identically.

## Learnings (carried forward)

1. **Keep tooling/build scripts ASCII-only.** Decorative Unicode (arrows, check
   marks, em-dashes) in scripts buys nothing and is a portability landmine across
   OS/encoding/CI-transform combinations.
2. **"Invalid or unexpected token" with no obvious bad syntax ⇒ check for
   non-ASCII bytes** (smart quotes pasted from docs, glyphs in log strings).
3. Reserve pretty Unicode for *runtime user-facing output* if you must, never for
   source that a transform/`vm` compile step will re-parse on an unknown host.
