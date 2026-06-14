/**
 * Resolve the printeer package version robustly.
 *
 * History (BUG-002): the previous implementation did
 * `require('fs').readFileSync(join(process.cwd(), 'package.json'))`. That was
 * broken two ways:
 *   1. The CLI ships as an ESM bundle, where `require` is undefined — every call
 *      threw and fell back to the hardcoded "1.0.0".
 *   2. It read `process.cwd()/package.json`, so even if `require` worked it would
 *      report the *consumer's* version on a global install.
 *
 * This version reads printeer's own package.json relative to the bundle's
 * location (`import.meta.url`), and verifies `name === 'printeer'` so it can
 * never accidentally report another project's version.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

export function getPackageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    // The bundle lives at dist/bin/cli.js (published) → ../../package.json.
    // Source/other layouts are covered by walking a few levels up.
    const candidates = [
      '../package.json',
      '../../package.json',
      '../../../package.json',
    ];
    for (const rel of candidates) {
      try {
        const pkg = JSON.parse(readFileSync(join(here, rel), 'utf8'));
        if (pkg && pkg.name === 'printeer' && typeof pkg.version === 'string') {
          return pkg.version;
        }
      } catch {
        // try next candidate
      }
    }
  } catch {
    // import.meta / fs not available — fall through
  }
  return '0.0.0-unknown';
}
