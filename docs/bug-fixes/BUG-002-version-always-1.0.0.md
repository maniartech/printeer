# BUG-002 — `--version` always prints `1.0.0`

| | |
|---|---|
| **Severity** | High (blocker) |
| **Area** | cli |
| **Status** | ✅ GREEN |
| **Fixed in** | `src/cli/version.ts` (new), `src/cli/enhanced-cli.ts`, `src/cli/index.ts` |
| **Test** | `tests/e2e/cli-meta.e2e.test.ts` › *BUG-002: --version reports the real package version* |

## Summary

`printeer --version` (and `-v`) printed `1.0.0` for every user, regardless of the
real version (`1.2.15`).

## Reproduction (red)

```
$ node dist/bin/cli.js --version
1.0.0            # expected 1.2.15
```

Test asserted `stdout === pkg.version` from three angles (`--version`, `-v`, and
from a different `cwd`) — all failed with `expected '1.0.0' to be '1.2.15'`.

## Root cause

Two compounding defects in `getVersion()` (present in **both** CLIs):

```ts
const packageContent = require('fs').readFileSync(
  path.join(process.cwd(), 'package.json'), 'utf8');   // 1 and 2
```

1. **`require` is undefined in the ESM bundle.** The CLI is built with esbuild
   `--format=esm`. `require('fs')` throws `require is not defined`, which the
   bare `catch` swallows → returns the hardcoded `'1.0.0'`. So it *always*
   failed, even from the correct directory.
2. **`process.cwd()` is the wrong base.** Even if `require` worked, a global
   install run from another directory would read the *consumer's* package.json
   (or nothing).

`--version` routes to the enhanced CLI, whose `getVersion` had this exact bug.

## Fix

New `src/cli/version.ts#getPackageVersion()`:

- Uses ESM-native `import { readFileSync } from 'fs'` (no `require`).
- Resolves package.json **relative to the bundle** via `import.meta.url`
  (`dist/bin/cli.js → ../../package.json`), walking a few levels as a fallback.
- Guards on `pkg.name === 'printeer'` so it can never report another project's
  version.

Both `enhanced-cli.ts` and `index.ts` now delegate to it.

## Test guarantee

`runCli(['--version'])` child-process test asserts the output equals
`package.json`'s version, is **not** `1.0.0`, and stays correct when run from an
unrelated `cwd`.

## Learnings (carried forward)

1. **Never use `require()` in code that is bundled to ESM.** Audit the whole
   tree for `require(` in ESM output — `api/index.ts` has the same smell (Docker
   detection); fixed under the resources sweep.
2. **Resolve bundled resources via `import.meta.url`, never `process.cwd()`.**
   `cwd` is the user's directory, not the package's.
3. **A bare `catch {}` that returns a plausible default hides hard failures.**
   The `1.0.0` fallback masked a 100%-reproducing crash. Prefer narrow catches
   and surface unexpected errors.
