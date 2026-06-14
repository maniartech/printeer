/**
 * Public API surface guard.
 *
 * Guards: BUG-013 — unfinished throw-stubs (convert, DefaultConverter,
 * DefaultConfigurationManager) must NOT be part of the published surface, and
 * no exported symbol should be a "not implemented" stub. Also asserts the real
 * surface stays intact.
 */

import { describe, it, expect } from 'vitest';
import { pathToFileURL } from 'url';
import { join } from 'path';

const LIB = join(__dirname, '..', 'dist', 'lib', 'index.js');

describe('public API surface (BUG-013)', () => {
  it('does not export the unfinished throw-stubs', async () => {
    const mod: Record<string, unknown> = await import(pathToFileURL(LIB).href);
    expect(mod.convert).toBeUndefined();
    expect(mod.DefaultConverter).toBeUndefined();
    expect(mod.DefaultConfigurationManager).toBeUndefined();
  });

  it('still exports the real, working surface', async () => {
    const mod: Record<string, unknown> = await import(pathToFileURL(LIB).href);
    expect(typeof mod.default).toBe('function'); // printeer()
    expect(typeof mod.doctor).toBe('function');
    expect(typeof mod.DefaultBrowserManager).toBe('function');
  });
});
