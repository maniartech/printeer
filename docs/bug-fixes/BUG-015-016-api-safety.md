# BUG-015 / BUG-016 — Library safety: crash-swallowing handlers + lingering timer

| | |
|---|---|
| **Severity** | Medium (library footguns) |
| **Area** | core-api |
| **Status** | ✅ GREEN |
| **Fixed in** | `src/api/index.ts` |
| **Test** | `tests/e2e/api-safety.e2e.test.ts` |

## BUG-015 — process-wide crash handlers swallow the host app's crashes

The pool path registered:

```ts
process.once('uncaughtException', cleanup);
process.once('unhandledRejection', cleanup);
```

For a **library**, this is harmful: the mere presence of an `uncaughtException`
listener stops Node from crashing on an uncaught error, so a host application's
real, unrelated crash would be silently swallowed (and only printeer's cleanup
would run). 

**Fix:** removed both handlers. Cleanup still runs on `exit`/`SIGINT`/`SIGTERM`,
which is appropriate for releasing the browser pool without hijacking the host's
error semantics.

**Test:** a pooled conversion is run in-process and we assert the
`uncaughtException` / `unhandledRejection` listener counts are **unchanged**
before vs after (red: count went 1→2; green: unchanged).

## BUG-016 — auto-cleanup timer kept the process alive ~2s

`scheduleAutomaticCleanup()` used `setTimeout(…, 2000)` without `unref()`, so a
finished one-off conversion lingered ~2 seconds before the event loop drained.

**Fix:** `timer.unref()` — the housekeeping timer no longer keeps the process
alive; a completed conversion exits immediately, while the timer still fires if
the process is otherwise busy.

## Learnings (carried forward)

1. **Libraries must not install `uncaughtException`/`unhandledRejection`
   handlers.** That's the host application's prerogative; doing so masks crashes.
   Assert listener-count invariants in tests.
2. **`unref()` every background/housekeeping timer in a library** so it never
   delays a host's clean exit.
