# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Launch-readiness remediation (branch `jun26-fixes`). Each fix is backed by an
automated regression test; see [`docs/bug-fixes/`](docs/bug-fixes/README.md).

### Fixed

- **Library API (BUG-001):** `printeer(url, output)` (the documented 2-arg call)
  no longer throws `TypeError: …reading 'waitUntil'`; options now default to `{}`.
- **CLI (BUG-002):** `--version` now reports the real package version instead of
  always printing `1.0.0` (was caused by `require()` in an ESM bundle + `cwd`).
- **CLI (BUG-007):** `printeer --quiet doctor` no longer errors with
  `unknown option '--quiet'`.
- **Browser pool (BUG-003):** the pool strategy now initializes correctly with
  the lazy `minSize=0` config instead of always failing and falling back to
  oneshot.
- **Batch (BUG-004):** the documented bare-array `jobs.json` format is accepted.
- **Batch (BUG-005):** a failed job now yields a non-zero exit code.
- **Batch (BUG-006):** fail-fast aborts cleanly without leaking an unhandled
  rejection; the surprising default `--output-dir ./output` was removed.

### Changed

- Packaging: added a `files` allowlist, `engines.node >= 18`, and a
  `prepublishOnly` build hook; the published tarball no longer contains source,
  tests, build caches, or stray output artifacts.
- License metadata corrected to **Apache-2.0** across README and badges.

## [1.2.15] - 2026-02-20

- Baseline release prior to the launch-readiness remediation.
