# BUG-011 — `--header-template` / `--footer-template` file paths never resolved

| | |
|---|---|
| **Severity** | High (blocker) |
| **Area** | templates |
| **Status** | ✅ GREEN |
| **Fixed in** | `src/cli/template-resolver.ts` (new), `src/cli/enhanced-cli.ts` |
| **Test** | `tests/cli/template-resolver.test.ts`, `tests/e2e/templates.e2e.test.ts` |

## Summary

The CLI advertises `--header-template <template>` / `--footer-template <template>`
as "template name or file path", but the value was passed **verbatim** to
Puppeteer's `page.pdf({ headerTemplate })`, which expects raw HTML. So a user who
passed a **file path** got the literal path string rendered as the header.

## Root cause

`convertToLegacyConfig()` mapped the option straight through:

```ts
headerTemplate: config.pdf?.headerTemplate,   // e.g. "./header.html" (a path!)
footerTemplate: config.pdf?.footerTemplate,
```

No resolution step turned a path into its HTML contents.

## Fix

New `resolvePdfTemplate(value)`:

- empty/undefined → `undefined`
- an existing file → its UTF-8 contents
- anything else → returned as-is (treated as inline HTML, preserving the
  raw-HTML use case)

`executeRealConversion()` now `await`s resolution for both header and footer
before calling `printeer()`. (The `printeer` API already flips
`displayHeaderFooter` on when a template is present.)

While here, the placeholder `fileSize: 0` metadata was replaced with the real
output file size via `fs.stat`.

## Test guarantee

- **Unit** (`template-resolver.test.ts`): file path → contents (and explicitly
  **not** the raw path); inline HTML → unchanged; missing path → raw passthrough;
  empty → undefined. This is the deterministic guarantee that paths are resolved.
- **E2E** (`templates.e2e.test.ts`): a real `convert` with header/footer template
  **files** produces a valid PDF and exits 0 (guards the wiring).

> Asserting the rendered header text inside a compressed PDF is not feasible
> dependency-free, so the resolution behaviour is proven at the unit level and the
> end-to-end path is proven not to regress/crash.

## Learnings (carried forward)

1. **"Name or file path" options need an explicit resolution step.** Map → resolve
   → pass; never hand a path to an API that wants content.
2. **When output is hard to assert (binary/compressed), unit-test the pure
   transform** and e2e-test the wiring. Don't skip coverage because the artifact
   is opaque.
