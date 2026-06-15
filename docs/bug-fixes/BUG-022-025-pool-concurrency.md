# BUG-022 / BUG-025 — Browser pool: maxSize overflow + busy-wait acquisition

| | |
|---|---|
| **Severity** | Medium (resource correctness / efficiency) |
| **Area** | resources / printing (browser pool) |
| **Status** | ✅ GREEN |
| **Fixed in** | `src/printing/browser.ts` |
| **Test** | `tests/printing/pool-concurrency.test.ts` |

## BUG-022 — TOCTOU: concurrent acquisition exceeds `maxSize`

`getBrowser()` checked capacity and then `await`ed the browser creation:

```ts
if (this.pool.total < this.pool.maxSize) {
  browserInstance = await this.createBrowserInstance(); // total++ happens AFTER the await
}
```

`createBrowserInstance()` only increments `pool.total` **after** `await
factory.createBrowser()` resolves. JavaScript is single-threaded, but `await`
yields — so N acquirers arriving together all observe the *old* `total`, all pass
the check, and all create. With `maxSize=2`, five concurrent `getBrowser()` calls
produced **five** live browsers. For a pool whose entire purpose is to bound
resource use, that's a real defect (unbounded Chromium processes under load).

**Fix:** reserve the slot **synchronously** before the async create. A
`pendingCreations` counter is incremented up-front and counted against `maxSize`:

```ts
if (this.pool.total + this.pendingCreations < this.pool.maxSize) {
  return this.createReserved(); // pendingCreations++ now, create, pendingCreations-- in finally
}
```

Concurrent acquirers now see the reservation immediately, so only `maxSize`
browsers are ever created; the rest queue.

## BUG-025 — busy-wait when at capacity

Callers that hit capacity polled:

```ts
while (Date.now() - startTime < timeout) {
  const b = this.getAvailableBrowser();
  if (b) return b;
  await new Promise(r => setTimeout(r, 100)); // poll every 100ms
}
```

This wastes wake-ups and adds up to 100ms of latency per acquisition even when a
browser is released immediately.

**Fix:** an event-based FIFO **waiter queue**. `releaseBrowser()` (and the
create-failure path) call `notifyWaiters()`, which hands a freed browser directly
to the oldest waiter, or — if a slot opened — lets the oldest waiter create one.
`shutdown()` rejects any still-blocked waiters with a clear error. The 30s timeout
is preserved (and its timer is `unref()`'d so it never keeps the process alive).

## Test (red → green)

`pool-concurrency.test.ts` injects a **fake** `BrowserFactory` (no real Chromium,
runs on any OS) with a 20ms create delay to force overlap. It fires 5 concurrent
`getBrowser()` against `maxSize=2`:

- **Red:** `expected 5 to be less than or equal to 2` (overflow).
- **Green:** at most 2 browsers ever created; all 5 acquirers are served (3 via
  reuse through the waiter queue); `metrics.reused >= 3`.

Full suite: **367 unit + 20 e2e green**; pool/batch e2e unaffected.

## Learnings (carried forward)

1. **`await` between a capacity check and the mutation it guards is a TOCTOU**,
   even in single-threaded JS. Reserve/commit synchronously, do the slow work
   after.
2. **Pools should wake waiters on release, not poll.** Polling couples latency to
   the poll interval and burns wake-ups; a FIFO queue is fair and immediate.
3. **Always `unref()` a waiter/timeout timer in a library** so a pending acquire
   can't pin the host's event loop.
4. **Fake the expensive dependency to test concurrency deterministically** — a DI
   factory with a controlled delay exposed the race that real browsers hide.
