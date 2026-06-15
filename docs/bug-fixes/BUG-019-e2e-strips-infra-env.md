# BUG-019 — E2E helper stripped infra env flags, breaking Chromium on CI Linux

| | |
|---|---|
| **Severity** | High (CI reliability — all e2e red on Linux) |
| **Area** | tests-quality / e2e |
| **Status** | ✅ GREEN |
| **Fixed in** | `tests/e2e/helpers.ts` |
| **Found by** | First real CI run (Linux jobs, after unit tests went green) |

## Summary

Once the unit-test failures (BUG-017/018) were fixed, CI advanced to the **E2E**
step — which then failed across all Linux jobs:

```
✘ doctor (e2e) … BUG-009 → expected '' to match /PDF/i   (empty CLI output)
✘ batch (e2e)  … BUG-004 → CLI timed out after 60000ms
```

Empty output / timeouts are the classic signature of *Chromium never launching*.

## Root cause

The e2e config and CI both export the **infrastructure** flags that make headless
Chrome launch reliably on Linux:

- `PRINTEER_BUNDLED_ONLY=1` — point the CLI at the downloaded bundled Chromium.
- `PRINTEER_NO_SANDBOX=1` — required for headless Chrome on CI Linux runners.

But `runCli()` — which spawns the *built* CLI as a child — stripped
`PRINTEER_BUNDLED_ONLY` from the child env (lumped in with the genuinely
vitest-specific forcing vars), under the banner "exercise real defaults":

```ts
for (const k of ['NODE_ENV','PRINTEER_BROWSER_STRATEGY','PRINTEER_BUNDLED_ONLY',
                 'PRINTEER_CLI_MODE','PRINTEER_BROWSER_POOL_MIN', …]) delete baseEnv[k];
```

So the spawned CLI lost bundled-only and couldn't reliably locate a browser on
Linux → no PDF, empty stdout, eventual timeout. It passed on local Windows only
because a system Chrome / detection fallback was available there.

## Fix

Distinguish **behavioral forcing** (pool sizing, strategy, CLI-mode marker,
`NODE_ENV`) — fine to strip — from **infrastructure** (`PRINTEER_BUNDLED_ONLY`,
`PRINTEER_NO_SANDBOX`) — which must reach the child so the built CLI launches the
same Chromium the harness intends. Removed `PRINTEER_BUNDLED_ONLY` from the strip
list; `PRINTEER_NO_SANDBOX` was never stripped and continues to flow through.

## Verification

`npm run test:e2e` locally → **20/20 green** (8 files). The change is a no-op on a
dev box that doesn't set these flags; it only restores them on CI where they're set.

## Learnings (carried forward)

1. **Separate "test forcing" from "infra config" when sanitizing a child env.**
   Stripping `NODE_ENV`/pool knobs simulates a real invocation; stripping the
   browser-launch flags sabotages it. They look alike (both `PRINTEER_*`) but
   serve opposite purposes.
2. **Empty output + timeout from a browser CLI on Linux CI ⇒ suspect sandbox /
   executable-path first.** It's almost never the test logic.
3. A spawned-child test is only as faithful as the env it forwards — assert the
   *intent* of each var before deleting it.
