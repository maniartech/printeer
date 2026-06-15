# BUG-023 — Temp-file cleanup used substring matching → could delete user files

| | |
|---|---|
| **Severity** | Medium-High (potential data loss) |
| **Area** | resources (disk / cleanup) |
| **Status** | ✅ GREEN |
| **Fixed in** | `src/resources/disk-space-manager.ts`, `src/resources/cleanup-manager.ts` |
| **Test** | `tests/resources/temp-cleanup-matching.test.ts` |

## Summary

The predicates that decide which files in the **OS temp directory** get deleted
matched with substring `includes()`:

```ts
// disk-space-manager.ts
const tempPatterns = ['printeer-', 'puppeteer_dev_chrome_profile-', 'chrome_', 'chromium_', '.tmp', '.temp'];
return tempPatterns.some(pattern => filename.includes(pattern));

// cleanup-manager.ts
return this.tempFilePatterns.some(pattern => filename.includes(pattern));
```

These predicates gate **real deletion** (`cleanupOldTempFiles`,
`cleanupLargeTempFiles`, `cleanupTempFiles`). Because `includes()` matches
anywhere in the name, unrelated files would be deleted:

- `my_chrome_settings.json` — contains `chrome_`
- `purchase_chrome_extension.dll` — contains `chrome_`
- `report.tmp.docx` — contains `.tmp`
- `important.temp.backup` — contains `.temp`

Any such file living in `os.tmpdir()` (a shared location) was a deletion target.

## Fix

Match precisely by **role**: artifact-name patterns at the **start** (`startsWith`),
temp extensions at the **end** (`endsWith`):

```ts
const prefixes = ['printeer-', 'puppeteer_dev_chrome_profile-', 'chrome_', 'chromium_'];
const suffixes = ['.tmp', '.temp'];
return prefixes.some(p => filename.startsWith(p)) || suffixes.some(s => filename.endsWith(s));
```

Applied to both managers (the cleanup-manager's pattern list is split into
`tempFilePrefixes` / `tempFileSuffixes`).

## Test (red → green)

`temp-cleanup-matching.test.ts` checks both predicates (accessed directly):

- **Red:** the four user files above matched (`expected true to be false`, ×6).
- **Green:** disposable artifacts (`printeer-…`, `puppeteer_dev_chrome_profile-…`,
  `*.tmp`, `*.temp`) still match; the user files do not.

## Learnings (carried forward)

1. **Never gate a delete with substring matching.** Anchor to prefix or extension;
   a `.tmp` *anywhere* in the name is not a `.tmp` file.
2. **Be conservative with shared locations.** `os.tmpdir()` holds other apps' and
   the user's files — a cleanup heuristic there must err toward keeping files.
3. Mirror the same predicate change across every manager that implements it;
   divergent copies hide the second instance.
