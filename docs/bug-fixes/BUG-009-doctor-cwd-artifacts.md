# BUG-009 — `doctor` leaves `printeer-doctor-output.*` in the working directory

| | |
|---|---|
| **Severity** | High (blocker) + offline-safety fix |
| **Area** | diagnostics |
| **Status** | ✅ GREEN |
| **Fixed in** | `src/diagnostics/doctor.ts` |
| **Test** | `tests/e2e/doctor.e2e.test.ts` |

## Summary

Running `printeer doctor` wrote `printeer-doctor-output.pdf` and
`printeer-doctor-output.png` into the **current working directory** and left them
there. (They were also part of the published-junk problem, BUG-008.) Separately,
the PDF/PNG probes converted **`https://example.com`**, so they failed on offline
or firewalled machines.

## Root cause

The output probes:

```ts
const out = path.resolve(process.cwd(), 'printeer-doctor-output.pdf');
try { fs.existsSync(out) && fs.unlinkSync(out); } catch {}   // cleanup BEFORE, not after
…
await printeer('https://example.com', out, 'pdf', options);  // needs internet
```

Cleanup ran only *before* the probe, never after — so a successful run always
left the file behind. And the probe URL was a public website.

## Fix

Rewrote both probes through a shared `testOutput(type)`:

- Writes to **`os.tmpdir()`** (`printeer-doctor-output-<pid>.<ext>`), never `cwd`.
- Converts a page served by an **ephemeral localhost HTTP server**
  (`withLocalPage()`), so the probe is fully **offline-safe**.
- **Always removes** the temp artifact in a `finally` block.

The two probes collapse to `testOutput('pdf')` / `testOutput('png')`, removing
~120 lines of duplication.

## Test guarantee

`tests/e2e/doctor.e2e.test.ts` runs `doctor` with `cwd` set to a fresh temp dir
and asserts: a real exit code (0/1), **no** `printeer-doctor-output*` files left
in that dir, and that the PDF/PNG probes ran. Because the probe now uses
localhost, the test (and real users) need no internet.

## Learnings (carried forward)

1. **Diagnostics must be side-effect-free.** Never write probe artifacts into the
   user's `cwd`; use a temp dir and clean up in `finally`.
2. **Health checks shouldn't depend on the public internet.** Use a localhost
   fixture so `doctor` is deterministic offline and behind firewalls.
3. **"Cleanup before" is not cleanup.** Removing a stale file before writing does
   nothing for the file you just created — clean up after, guaranteed.
