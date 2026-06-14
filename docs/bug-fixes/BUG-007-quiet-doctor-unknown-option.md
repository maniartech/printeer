# BUG-007 — `printeer --quiet doctor` errors with `unknown option '--quiet'`

| | |
|---|---|
| **Severity** | High (blocker) |
| **Area** | cli |
| **Status** | ✅ GREEN |
| **Fixed in** | `src/cli/index.ts` (routing), `src/cli/enhanced-cli.ts` (global option) |
| **Test** | `tests/e2e/cli-meta.e2e.test.ts` › *BUG-007: --quiet works with subcommands* |

## Summary

The documented global `--quiet`/`-q` flag broke when combined with the `doctor`
subcommand.

## Reproduction (red)

```
$ node dist/bin/cli.js --quiet doctor
error: unknown option '--quiet'
(exit 1)
```

## Root cause

`runCLI()` decided whether to use the legacy program (which owns `doctor` and the
global `--quiet`) by inspecting **`args[0]`** literally:

```ts
const isLegacyCommand = legacyCommands.includes(args[0]); // args[0] === '--quiet'
```

With `--quiet doctor`, `args[0]` is `'--quiet'`, not `'doctor'`, so routing fell
through to the **enhanced** program — which had neither a `doctor` command nor a
`--quiet` option → parse error.

## Fix

1. **Route on the first non-flag token**, so global options before the
   subcommand don't change dispatch:

   ```ts
   const firstNonFlag = args.find(a => !a.startsWith('-'));
   const isLegacyCommand = firstNonFlag !== undefined && legacyCommands.includes(firstNonFlag);
   ```

   `printeer --quiet doctor`, `-q doctor`, and `doctor --verbose` all now reach
   the legacy program, which already honours `--quiet`.

2. **Defensively add a global `-q, --quiet` option to the enhanced program** too,
   so `--quiet` is never an "unknown option" for any command.

## Test guarantee

`runCli(['--quiet', 'doctor'])` asserts stderr contains no `unknown option` and
the exit code is a real doctor result (`0` healthy / `1` issues), never a parse
error.

## Learnings (carried forward)

1. **Two-parser CLIs must agree on global flags.** Splitting "legacy" and
   "enhanced" Commander programs created seams where a global option exists in
   one but not the other. Where a dual-parser design persists, global options
   must be declared on **both**, and routing must be flag-tolerant.
2. **Dispatch on positional intent, not raw `argv[0]`.** Users freely place
   global flags before the subcommand.
