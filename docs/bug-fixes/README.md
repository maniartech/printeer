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
| BUG-002 | high | cli | `--version` always prints 1.0.0 (require() in ESM bundle) | TODO | |
| BUG-003 | high | resources | Pool mode broken on Windows (`--no-startup-window`) | TODO | |
| BUG-004 | high | batch | README bare-array `jobs.json` rejected by loader | TODO | |
| BUG-005 | high | batch | Batch exit code is 0 even when jobs fail | TODO | |
| BUG-006 | high | batch | Fail-fast leaks an unhandled rejection, doesn't abort | TODO | |
| BUG-007 | high | cli | `--quiet doctor` errors `unknown option '--quiet'` | TODO | |
| BUG-008 | high | packaging | `npm publish` ships ~1MB junk; no `files` field | TODO | |
| BUG-009 | high | diagnostics | Doctor leaves `printeer-doctor-output.*` in CWD | TODO | |
| BUG-010 | high | config | Documented env vars / `.printeerrc.json` not applied | TODO | |
| BUG-011 | high | templates | `--header-template`/`--footer-template` never applied | TODO | |
| BUG-012 | high | docs | README license says ISC; package is Apache-2.0 | TODO | |
| BUG-013 | high | core-api | Public throw-stubs exported (convert/DefaultConfigurationManager/DefaultConverter) | TODO | |

> Remaining medium/low findings (the full 80) are appended to this table as each phase lands.
> See the audit summary for the complete enumeration; rows are added when their test is written.
