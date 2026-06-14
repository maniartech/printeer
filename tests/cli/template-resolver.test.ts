/**
 * Unit coverage for header/footer template resolution. (BUG-011)
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolvePdfTemplate } from '../../src/cli/template-resolver';

describe('resolvePdfTemplate (BUG-011)', () => {
  it('returns undefined for empty/undefined values', async () => {
    expect(await resolvePdfTemplate(undefined)).toBeUndefined();
    expect(await resolvePdfTemplate('')).toBeUndefined();
    expect(await resolvePdfTemplate('   ')).toBeUndefined();
  });

  it('reads the file contents when the value is a path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'tpl-'));
    try {
      const f = join(dir, 'header.html');
      const html = '<div class="hdr">PAGE <span class="pageNumber"></span></div>';
      writeFileSync(f, html);
      const resolved = await resolvePdfTemplate(f);
      expect(resolved).toBe(html);
      expect(resolved).not.toBe(f); // not the raw path
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passes through inline HTML unchanged', async () => {
    const html = '<div>Inline <span class="title"></span></div>';
    expect(await resolvePdfTemplate(html)).toBe(html);
  });

  it('passes a non-existent path through as raw (treated as inline HTML)', async () => {
    expect(await resolvePdfTemplate('not-a-real-file.html')).toBe('not-a-real-file.html');
  });
});
