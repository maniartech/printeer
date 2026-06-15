# BUG-021 — Pool browser path ignored PRINTEER_NO_SANDBOX (CI Linux hang)

| | |
|---|---|
| **Severity** | High (CI reliability — pool/batch e2e hung on Linux) |
| **Area** | resources / printing (browser pool) |
| **Status** | ✅ GREEN |
| **Fixed in** | `src/printing/browser.ts` |
| **Test** | `tests/printing/launch-options.test.ts` + the pool/batch e2e on CI Linux |
| **Found by** | First real CI run, after the bundled-only fix (BUG-019) let e2e advance |

## Summary

On CI Linux, single (oneshot) conversions succeeded, but the **pool-strategy** and
**batch** e2e tests timed out at 60s:

```
✘ browser pool strategy (e2e) … BUG-003 → CLI timed out after 60000ms
✘ batch processing (e2e)      … BUG-004 → CLI timed out after 60000ms
✘ batch processing (e2e)      … BUG-005 → CLI timed out after 60000ms
```

## Root cause

`DefaultBrowserFactory.getEnvironmentOptimizedArgs()` only disabled the sandbox
for **root** or **Docker**:

```ts
if (isRoot || isDocker) {
  args.push('--no-sandbox', '--disable-setuid-sandbox');
}
```

GitHub Actions' `ubuntu-latest` runs jobs as a **non-root** user in a **non-Docker**
VM, where the kernel user-namespace sandbox is unavailable — so headless Chrome
can only launch with `--no-sandbox`. The factory never read `PRINTEER_NO_SANDBOX`,
so the pool path launched **without** it. And because the e2e harness sets
`PRINTEER_BUNDLED_ONLY=1`, the factory's no-sandbox **fallback configurations**
were deliberately skipped (`createBrowser()` throws instead of trying them when
bundled-only) — so there was no recovery. Chrome failed to come up and the launch
hung until the test's 60s ceiling.

The asymmetry is the key clue: the **oneshot** path already honored
`PRINTEER_NO_SANDBOX` (added during the BUG-001/010 work), which is exactly why
single conversions passed on the same runner while the pool path didn't.

## Fix

Make the pool factory honor the same signal:

```ts
const wantNoSandbox = process.env.PRINTEER_NO_SANDBOX === '1';
if (isRoot || isDocker || wantNoSandbox) {
  args.push('--no-sandbox', '--disable-setuid-sandbox');
}
```

## Tests

- `tests/printing/launch-options.test.ts` (new, OS-agnostic): asserts
  `getOptimalLaunchOptions().args` **contains** `--no-sandbox` when
  `PRINTEER_NO_SANDBOX=1` (non-root/non-Docker), and **does not** force it by
  default off-CI (so we don't silently disable the sandbox for every desktop user).
- The real-Chromium **pool + batch e2e** on CI Linux is the integration guard;
  it could not reproduce locally (Windows/root don't need the flag), so the unit
  test pins the argument-selection logic that the e2e depends on.

## Learnings (carried forward)

1. **Every browser-launch path must honor the same sandbox policy.** Oneshot and
   pool diverged; the env flag worked for one and not the other. Centralize or
   mirror these decisions, and test each path.
2. **`bundledOnly` removes your safety net.** Skipping the no-sandbox fallbacks is
   fine *only if* the primary launch already has the right flags — otherwise a
   single misconfig becomes an unrecoverable hang.
3. **Different failure shapes for the same infra gap:** missing executable →
   empty output (BUG-019); missing sandbox flag → hang/timeout (this bug). On CI
   Linux, "the browser won't start" has more than one signature.
