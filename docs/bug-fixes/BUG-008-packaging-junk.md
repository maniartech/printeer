# BUG-008 — `npm publish` ships ~1 MB of junk; no `files` allowlist

| | |
|---|---|
| **Severity** | High (blocker) |
| **Area** | packaging |
| **Status** | ✅ GREEN |
| **Fixed in** | `package.json`, `yarn.lock` (removed) |
| **Test** | `tests/packaging.test.ts` |

## Summary

`npm pack --dry-run` showed the published tarball (159 files, ~1 MB) included
test artifacts and machine-specific junk:

- `output/**` — stale test reports (CSV/JSON/HTML, a 395 KB JSON)
- `.parcel-cache/**` — a build cache (incl. `data.mdb`/`lock.mdb`, leaking
  absolute machine paths)
- `printeer-doctor-output.pdf` / `.png` — doctor leftovers (see BUG-009)
- `printeer.code-workspace` — an editor file

There was **no `files` field**, so publishing relied on an incomplete
`.npmignore` — and npm ignores `.gitignore` when a `.npmignore` exists, so the
`output/` etc. entries in `.gitignore` had no effect at publish time.

## Fix

- Added an explicit **`files` allowlist** — the authoritative include list:
  ```json
  "files": ["dist", "README.md", "LICENSE", "CHANGELOG.md"]
  ```
  Only these (plus `package.json`) are published; all junk is excluded by
  construction.
- Added `engines.node >= 18.0.0` (matches the Puppeteer upgrade).
- Added a `prepublishOnly: "npm run build"` hook so a stale/missing `dist/` can
  never be published.
- Fixed the package `description` (it claimed PNG was "Coming Soon").
- Removed `yarn.lock` so a single lockfile (`package-lock.json`) is the source of
  truth.

## Test guarantee

`tests/packaging.test.ts` runs `npm pack --dry-run --json` and asserts the file
list **contains** `dist/bin/cli.js`, `dist/lib/index.js`, `README.md`, `LICENSE`
and **contains none** of `src/`, `tests/`, `output/`, `.parcel-cache/`,
`mock-server`, `scripts/`, `*.code-workspace`, or `printeer-doctor-output*`. It
also asserts the hygiene fields (`files`, `engines`, `prepublishOnly`,
single lockfile).

## Learnings (carried forward)

1. **Prefer a `files` allowlist over an `.npmignore` denylist.** Allowlists fail
   safe: new stray files are excluded by default.
2. **`.npmignore` shadows `.gitignore` for npm.** If both exist, git-ignored junk
   can still publish. Test the actual `npm pack` output, don't assume.
3. **Gate publishing on a fresh build** (`prepublishOnly`).
