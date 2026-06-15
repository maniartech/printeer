# Printeer Launch-Readiness Bug Fixes — Traceability Ledger

This directory documents the remediation of the launch-readiness audit (2026-06-14).
**One Markdown file per bug**, each backed by an automated regression test that fails
before the fix and passes after (red→green). CI runs the full suite on Windows + Linux.

## How to read a bug report

Each `BUG-XYZ-*.md` contains: summary, severity, the reproduction (red), root cause,
the fix, the test(s) that guarantee it, and any **learnings** carried forward.

## Definition of done (per bug)

1. A dedicated automated test reproduces the bug (red) and passes after the fix (green).
2. The fix is committed in isolation (or a tightly-scoped group) on `jun26-fixes`.
3. A report file exists here.
4. The ledger row below is updated.

## Status legend

`RED` = test written, failing · `GREEN` = fixed + test passing · `TODO` = not started

## Phases

- **Phase 0** — Test foundation (fixture server, e2e/CLI harness, vitest projects)
- **Phase 1** — CI on Windows + Linux
- **Phase 2** — Puppeteer 19→25 upgrade + self-maintaining update script
- **Phase 3** — Core/API + CLI blockers
- **Phase 4** — Batch
- **Phase 5** — Config + Diagnostics + Templates
- **Phase 6** — Resources / browser pool
- **Phase 7** — Packaging + Docs
- **Phase 8** — Tests/lint quality gate

## Ledger

| ID | Severity | Area | Title | Status | Report |
|----|----------|------|-------|--------|--------|
| BUG-001 | critical | core-api | `printeer(url,out)` 2-arg library call crashes (TypeError) | GREEN | [link](BUG-001-two-arg-library-crash.md) |
| BUG-002 | high | cli | `--version` always prints 1.0.0 (require() in ESM bundle) | GREEN | [link](BUG-002-version-always-1.0.0.md) |
| BUG-003 | high | resources | Pool mode always fails to init (minSize=0 vs eager check) | GREEN | [link](BUG-003-pool-mode-broken.md) |
| BUG-004 | high | batch | README bare-array `jobs.json` rejected by loader | GREEN | [link](BUG-004-batch-array-format-rejected.md) |
| BUG-005 | high | batch | Batch exit code is 0 even when jobs fail | GREEN | [link](BUG-005-batch-exit-code.md) |
| BUG-006 | high | batch | Fail-fast leaks an unhandled rejection, doesn't abort | GREEN | [link](BUG-006-batch-failfast-unhandled-rejection.md) |
| BUG-007 | high | cli | `--quiet doctor` errors `unknown option '--quiet'` | GREEN | [link](BUG-007-quiet-doctor-unknown-option.md) |
| BUG-008 | high | packaging | `npm publish` ships ~1MB junk; no `files` field | GREEN | [link](BUG-008-packaging-junk.md) |
| BUG-009 | high | diagnostics | Doctor leaves `printeer-doctor-output.*` in CWD | GREEN | [link](BUG-009-doctor-cwd-artifacts.md) |
| BUG-010 | high | config | Documented env vars wired to conversion path | GREEN | [link](BUG-010-env-vars-ignored.md) |
| BUG-011 | high | templates | `--header-template`/`--footer-template` never applied | GREEN | [link](BUG-011-header-footer-templates.md) |
| BUG-012 | high | docs | README license says ISC; package is Apache-2.0 | GREEN | [link](BUG-012-license-mismatch.md) |
| BUG-013 | high | core-api | Public throw-stubs exported (convert/DefaultConfigurationManager/DefaultConverter) | GREEN | [link](BUG-013-public-throw-stubs.md) |

### Medium/low fixes (sweep, in progress)

| ID | Severity | Area | Title | Status | Report |
|----|----------|------|-------|--------|--------|
| BUG-014 | medium | tests-quality | Lint debt (36 errors); CI lint now a hard gate | GREEN | [link](BUG-014-lint-debt.md) |
| BUG-015 | medium | core-api | Pool path installed crash-swallowing process handlers | GREEN | [link](BUG-015-016-api-safety.md) |
| BUG-016 | low | core-api | Auto-cleanup timer not unref'd (delayed process exit) | GREEN | [link](BUG-015-016-api-safety.md) |
| BUG-017 | medium | tests-quality | Config tests fail on CI (CI/Docker env signal not cleared) | GREEN | [link](BUG-017-config-tests-ci-env-leak.md) |
| BUG-018 | low | tests-quality | Resource-optimizer test confounds load + pressure (machine-dependent) | GREEN | [link](BUG-018-resource-optimizer-test-confounded.md) |
| BUG-019 | high | tests-quality | E2E helper stripped infra env flags → Chromium dead on CI Linux | GREEN | [link](BUG-019-e2e-strips-infra-env.md) |
| BUG-020 | medium | tests-quality | CRLF-on-checkout breaks shebang'd .mjs parse on Windows CI (.gitattributes) | GREEN | [link](BUG-020-non-ascii-script-parse.md) |
| BUG-021 | high | resources | Pool browser path ignored PRINTEER_NO_SANDBOX → hang on CI Linux | GREEN | [link](BUG-021-pool-path-ignores-no-sandbox.md) |
| BUG-022 | medium | resources | Pool acquisition TOCTOU exceeds maxSize under concurrency | GREEN | [link](BUG-022-025-pool-concurrency.md) |
| BUG-025 | low | resources | Pool used 100ms busy-wait instead of event-based waiter queue | GREEN | [link](BUG-022-025-pool-concurrency.md) |
| BUG-023 | medium | resources | Temp-cleanup substring match could delete user files | GREEN | [link](BUG-023-temp-cleanup-overmatch.md) |
| BUG-024 | medium | resources | `getTotalDiskUsage()` hardcoded 10% → disk decisions no-op | GREEN | [link](BUG-024-disk-usage-placeholder.md) |
| BUG-026 | low | resources | Dead `src/core` module (unused 536-line manager + empty stubs) | GREEN | [link](BUG-026-dead-core-module.md) |
| BUG-027 | medium | diagnostics | `doctor --json` stdout not pure JSON (summary + traces) | GREEN | [link](BUG-027-doctor-json-purity.md) |
| BUG-028 | low | docs | README browser-mgmt example + missing `cleanup()` alias | GREEN | [link](BUG-028-031-library-docs-api.md) |
| BUG-029 | low | docs | `PRINTEER_DUMPIO=1` documented but not implemented | GREEN | [link](BUG-028-031-library-docs-api.md) |
| BUG-030 | medium | docs | Documented subpath imports / config field didn't exist | GREEN | [link](BUG-028-031-library-docs-api.md) |
| BUG-031 | low | diagnostics | Doctor reported `bundled-chromium` placeholder, not real path | GREEN | [link](BUG-028-031-library-docs-api.md) |
| BUG-032 | moderate | dependencies | `npm audit`: shipped `yaml` vuln patched; dev-only ones triaged | GREEN | [link](BUG-032-dependency-audit.md) |

### Infrastructure phases

| Phase | Title | Status | Report |
|-------|-------|--------|--------|
| 0 | Test foundation (fixture server, e2e/CLI harness, vitest split) | GREEN | [link](PHASE-0-1-test-foundation-and-ci.md) |
| 1 | CI on Windows + Linux (GitHub Actions matrix) | GREEN | [link](PHASE-0-1-test-foundation-and-ci.md) |
| 2 | Puppeteer 19→25 upgrade + self-maintaining updater | GREEN | [link](PHASE-2-puppeteer-upgrade.md) |

## Progress summary

- **All 13 launch blockers: GREEN** (fixed, regression-tested, committed, reported).
- **Phases 0–2: GREEN.**
- **CI is GREEN on real runners** — Windows + Linux × Node 18/20/22, all steps
  (lint / typecheck / build / unit / e2e / pack). Verified on commit `d3d52d5`.
- Suite: **364 unit + 20 e2e passing**; typecheck + build clean on Puppeteer 25.
- **BUG-017–021** were found by the *first real CI run* (things local verification
  could not see): CI-env leak in config tests, a machine-dependent optimizer
  assertion, the e2e helper stripping infra env, CRLF-on-checkout breaking a
  shebang'd `.mjs` on Windows, and the pool path ignoring `PRINTEER_NO_SANDBOX`
  on Linux. All fixed, tested, and green.
- Several medium/low findings folded in along the way (output-dir default,
  offline doctor, real fileSize metadata, package description, single lockfile,
  `.parcel-cache`/`output/` no longer published, env-var wiring).

## Remaining (medium/low sweep — next batches)

Tracked, not yet done. Each will follow the same red→green + report discipline:

- **Lint debt** — 36 eslint errors (unused imports/vars, one unreachable block in
  `disk-space-manager.ts`, `no-undef` for `NodeJS`/`document`/`window`). Fixing
  these flips CI's lint step from non-blocking to a hard gate.
- **API safety** — remove process-wide `uncaughtException`/`unhandledRejection`
  handlers in the pool path; narrow the pool→oneshot fallback to init-only errors;
  `unref()` the cleanup timer; Windows tree-kill on oneshot cleanup.
- **Resources** — pool TOCTOU vs `maxSize`; event-based `waitForAvailableBrowser`;
  pool metric accounting; real disk/memory checks (drop the 10% placeholder);
  tighten temp-cleanup matching; delete dead `BrowserLifecycleManager`/empty
  `core/*` stubs.
- **Batch** — implement `--retry`, `--report csv/html`, `defaults`/`variables`,
  job dependencies; fix shipped `examples/batch-jobs.yaml`; `.printeerrc.json`
  applied to the library/bare path.
- **Diagnostics** — verbose `--json` purity; report actual Chrome source; font
  check; network check configurability.
- **Docs** — rewrite the "Custom Browser Management" example to the real API (add a
  `cleanup()` alias); `exports` map for subpath imports; remove `PRINTEER_DUMPIO`
  doc; fix `EnhancedConfigurationManager` example fields.
