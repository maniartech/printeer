# CLI Command Fixes (March 2026)

This note documents three Linux CLI regressions that were identified and fixed.

## 1) Help Command Not Working Correctly

### Symptom

`printeer help doctor` was incorrectly routed through conversion logic in some cases.

### Root Cause

CLI routing treated some two-argument invocations as direct URL conversion too early.

### Fix

- Added explicit known command filtering for routing logic.
- Required the first positional argument to actually look like a URL (`http://` or `https://`) before treating input as direct conversion.

### Result

`printeer help doctor` now resolves to doctor help correctly.

## 2) Doctor Command Problems

### Symptom A

Top-level help did not show doctor in enhanced CLI command listings.

### Symptom B

`printeer doctor --json` printed non-JSON summary lines, which broke JSON parsing.

### Root Cause

- Doctor command was not exposed in enhanced CLI command registration.
- Standard doctor flow printed summary text even in JSON mode.

### Fix

- Registered `doctor` in enhanced CLI so command discovery/help is consistent.
- Suppressed human-readable completion lines when JSON mode is enabled.

### Result

- `printeer --help` now includes doctor.
- `printeer doctor --json` now emits clean JSON output only.

## 3) Cleanup Command Triggering Unrelated Apps (Steam)

### Symptom

Running `printeer cleanup` killed Chromium processes used by other applications, causing Steam launcher to reopen.

### Root Cause

Process matching in cleanup was too broad (generic Chrome/Chromium patterns).

### Fix

- Added a Printeer process marker argument: `--printeer-owned=1`.
- Ensured Printeer-launched browser processes always include this marker.
- Changed default cleanup to target only Printeer-owned processes.
- Kept broad cleanup behind `--force` only.

### Result

- `printeer cleanup` is safe by default and does not target unrelated app browser processes.
- `printeer cleanup --force` is available for emergency broad cleanup.

## Cross-OS Validation

Cleanup safety is now covered by an OS-aware test suite.

- Test: `tests/cli/cleanup-cross-os.test.ts`
- Script: `npm run test:cleanup:cross-os`
- Full guide: [Cross-OS Cleanup Testing](./cross-os-cleanup-testing.md)
