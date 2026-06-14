/**
 * Resolve a `--header-template` / `--footer-template` value into the HTML string
 * that Puppeteer's `page.pdf({ headerTemplate, footerTemplate })` expects.
 *
 * The CLI advertises the value as a "template name or file path", but the raw
 * string was previously passed straight to Puppeteer — so a file path rendered
 * its own path as the header text. (BUG-011)
 *
 * Resolution rules:
 *  - empty / non-string  → `undefined`
 *  - an existing file    → the file's contents (UTF-8)
 *  - anything else       → returned as-is (treated as inline HTML)
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

export async function resolvePdfTemplate(value?: string): Promise<string | undefined> {
  if (!value || typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    if (existsSync(trimmed)) {
      return await readFile(trimmed, 'utf8');
    }
  } catch {
    // Unreadable path — fall through and treat the value as inline HTML.
  }

  return value;
}
