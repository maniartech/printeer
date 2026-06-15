# BUG-020 — Windows CI parse failure: CRLF-on-checkout breaks a shebang'd .mjs

| | |
|---|---|
| **Severity** | Medium (CI reliability — Windows unit step red) |
| **Area** | tests-quality / scripts / repo-hygiene |
| **Status** | ✅ GREEN |
| **Fixed in** | `.gitattributes` (root cause) + ASCII-only `scripts/update-puppeteer*.mjs` (hygiene) |
| **Found by** | First real CI run (Windows jobs) |

> **Two-part investigation.** The first hypothesis (non-ASCII glyphs) was a real
> code-smell and was fixed, but CI stayed red — the actual cause was **CRLF line
> endings on the Windows runner**. Both are documented below; the `.gitattributes`
> change is the fix.

## Summary

On the Windows CI runners, the unit step failed loading the updater test:

```
FAIL tests/scripts/update-puppeteer.test.ts
SyntaxError: Invalid or unexpected token
  ❯ new Script node:vm:117:7
  ❯ tests/scripts/update-puppeteer.test.ts:2:31
```

The test only imports `scripts/update-puppeteer.mjs`; the parse failure was in
that imported module, not the test. It passed on local Windows and on CI Linux.

## Symptom

```
FAIL tests/scripts/update-puppeteer.test.ts
SyntaxError: Invalid or unexpected token
  ❯ new Script node:vm:117:7
  ❯ Object.runInThisContext node:vm:317:10
  ❯ tests/scripts/update-puppeteer.test.ts:2:31
```

Windows CI only — passed on CI Linux and on local Windows. The source-map points
at the test's import line; the bad token is actually in the imported
`scripts/update-puppeteer.mjs` as vite-node compiles it via `runInThisContext`.

## Hypothesis 1 (real smell, but NOT the cause): non-ASCII glyphs

The `.mjs` carried em-dash `—`, arrow `→`, and `✓`/`✗` in log strings/comments.
Plausible "unexpected token" source, so they were replaced with ASCII
(`-`, `->`, `[ok]`, `[fail]`). Good hygiene — **but CI stayed red**, which ruled
this out as the root cause.

## Root cause: CRLF line endings on the Windows runner

The `.mjs` blob is committed as **LF**, but GitHub's Windows runners default to
`core.autocrlf=true`, which rewrites text files to **CRLF on checkout**. vite-node's
transform of a **shebang'd** `.mjs` (`#!/usr/bin/env node`) throws
`SyntaxError: Invalid or unexpected token` when the source has CRLF endings. Local
Windows passed only because this repo's dev box runs `core.autocrlf=false` (LF).

Reproduced deterministically:

```
# convert the .mjs to CRLF locally, then:
npx vitest run tests/scripts/update-puppeteer.test.ts
→ SyntaxError: Invalid or unexpected token   (LF version passes)
```

## Fix

Add a repo `.gitattributes` that forces **LF** for text files on every platform,
overriding the runner's `autocrlf`:

```gitattributes
* text=auto eol=lf
*.mjs text eol=lf
…
*.png binary   # never normalize binaries
```

Because some already-tracked files were stored as CRLF in the index, the repo was
**renormalized** in the same change (`git add --renormalize .`) so the index and
the new attributes agree — otherwise a fresh checkout would show a perpetually
"dirty" working tree. `git diff --cached --ignore-all-space` confirmed the
renormalization changed **only** line endings, no content.

## Verification

LF `.mjs` parses; CRLF reproduces the failure. After `.gitattributes` + renormalize,
a fresh checkout (incl. CI Windows) yields an LF working tree. Full unit suite green.

## Learnings (carried forward)

1. **A repo that runs CI on Windows needs `.gitattributes` with `eol=lf`.** Relying
   on contributors' `autocrlf` is non-deterministic; the hosted Windows runner uses
   `autocrlf=true` and will hand you CRLF.
2. **Shebang + CRLF + a `vm`/transform loader = parse failure.** If a tool re-parses
   your `.mjs` (vite-node, bundlers), CRLF on the shebang line is a landmine.
3. **"Passes locally, fails only on CI Windows" ⇒ suspect line endings first.**
   `git ls-files --eol` and a local CRLF reproduction beat guessing.
4. **Don't stop at the first plausible cause.** The non-ASCII glyphs *looked* guilty
   and were worth fixing, but verifying against CI (still red) forced the real
   diagnosis. Keep ASCII-only scripts anyway — it's cheap insurance.
