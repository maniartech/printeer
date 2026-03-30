# Cross-OS Cleanup Testing

This page documents how cleanup safety is validated across Linux, macOS, and Windows.

## Why This Exists

Cleanup behavior is OS-specific because process discovery and termination differ by platform.

- Windows uses PowerShell and `Win32_Process` queries.
- Linux and macOS use `ps`-based command matching and PID signals.

To prevent regressions, cleanup logic is validated with explicit cross-OS unit tests.

## Test File

- `tests/cli/cleanup-cross-os.test.ts`

This suite validates:

1. Default cleanup is marker-scoped on Windows.
2. Default cleanup is marker-scoped on macOS/Unix paths.
3. Force mode enables broader fallback matching.

## Run Locally

From repo root:

```bash
npm run test:cleanup:cross-os
```

Or with Bun:

```bash
bun run test:cleanup:cross-os
```

Script source:

- `package.json` script `test:cleanup:cross-os`
- uses `vitest.cleanup.config.ts` to run only the cleanup cross-OS suite.

## CI Matrix Recommendation

Run this test in an OS matrix to verify command paths continuously.

Example GitHub Actions job:

```yaml
name: cleanup-cross-os

on:
  pull_request:
  push:
    branches: [main]

jobs:
  cleanup-cross-os:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:cleanup:cross-os
```

## Runtime Note

If you run into local runner-specific worker issues, run the same suite in Node-based CI matrix for canonical verification.
