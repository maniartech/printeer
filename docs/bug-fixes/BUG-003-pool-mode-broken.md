# BUG-003 — Browser pool mode always fails to initialize (silent fallback to oneshot)

| | |
|---|---|
| **Severity** | High (blocker) |
| **Area** | resources / browser pool |
| **Status** | ✅ GREEN |
| **Fixed in** | `src/printing/browser.ts` |
| **Test** | `tests/e2e/browser-pool.e2e.test.ts` › *BUG-003: forced pool strategy converts without falling back to oneshot* |

## Summary

The browser **pool** strategy — the default for server/library usage and batch —
failed to initialize on *every* run and silently fell back to oneshot:

```
Using browser strategy: pool
Pool strategy failed, falling back to oneshot: Failed to initialize browser
manager: Failed to create any browsers during initialization
```

So the advertised pooling/performance feature did nothing, and every server/API
conversion printed a scary warning.

## Investigation — and a corrected hypothesis

**Initial (wrong) hypothesis:** the factory adds `--no-startup-window` on Windows
([browser.ts](../../src/printing/browser.ts)), and the oneshot path had a comment
saying that flag causes "waiting for target" timeouts. Plausible — but removing
the flag did **not** fix it.

**What the runtime actually showed:** with verbose output, the factory's own
`"Launching browser with optimal configuration…"` log **never appeared**. The
browser launch was never even attempted. That pointed away from the flag and to
the pool's init logic.

## Root cause

The API creates the pool lazily with `minSize: 0` (no pre-warming):

```ts
new DefaultBrowserManager(undefined, { minSize: 0, maxSize: 1, … });
```

But `initialize()` did:

```ts
await this.warmUp();                       // minSize=0 → creates ZERO browsers
if (this.pool.total === 0) {               // ...so this is always true
  throw new Error('Failed to create any browsers during initialization');
}
```

`warmUp()` only creates `minSize - total` browsers, i.e. **none** when
`minSize=0`. The subsequent `pool.total === 0` guard then always threw — before
any browser launch. The lazy design (create browsers on demand in `getBrowser()`)
was sound; the eager "must have ≥1 now" check contradicted it.

## Fix

Only fail initialization when we were actually asked to pre-warm:

```ts
if (this.config.minSize! > 0 && this.pool.total === 0) {
  throw new Error('Failed to create any browsers during initialization');
}
```

With `minSize=0`, `initialize()` succeeds and `getBrowser()` creates the first
browser on demand. The redundant Windows `--no-startup-window` flag was also
removed as defensive hardening (consistent with the oneshot path), but it was
**not** the cause.

## Test guarantee

`tests/e2e/browser-pool.e2e.test.ts` forces `PRINTEER_BROWSER_STRATEGY=pool`,
converts a real page, and asserts the output is a valid PDF **and** that the
output contains none of `Pool strategy failed` / `falling back to oneshot` /
`Failed to create any browsers`. Runs on Windows and Linux in CI.

## Learnings (carried forward)

1. **Verify root cause at runtime before "fixing" the wrong thing.** A confident
   static hypothesis (the flag) was wrong. The decisive clue was a *missing* log
   line proving the launch was never attempted. Always reproduce and instrument.
2. **Lazy-pool config and eager init checks must agree.** An invariant ("≥1
   browser after init") silently contradicted an intentional config (`minSize=0`).
3. **A broad `try/catch` fallback can hide a 100%-reproducing failure.** The
   pool→oneshot fallback masked total pool breakage as a mere warning for a long
   time. Fallbacks should be narrow and loud (see BUG related to fallback masking).
