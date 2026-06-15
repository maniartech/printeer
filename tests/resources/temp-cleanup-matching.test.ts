/**
 * BUG-023: temp-file cleanup matched filenames with substring `includes()`, so
 * the patterns `chrome_` / `chromium_` / `.tmp` / `.temp` matched *unrelated*
 * user files anywhere in the name. Because these predicates gate real deletion
 * (cleanupOldTempFiles / cleanupLargeTempFiles / cleanupTempFiles), a file like
 * `my_chrome_settings.json` or `report.tmp.docx` sitting in the OS temp dir could
 * be deleted. Prefixes must match at the START; extensions must match at the END.
 */

import { describe, it, expect } from 'vitest';
import { DefaultDiskSpaceManager } from '../../src/resources/disk-space-manager';
import { DefaultCleanupManager } from '../../src/resources/cleanup-manager';

type Matcher = (filename: string) => boolean;

const SHOULD_MATCH = [
  'printeer-abc123',
  'puppeteer_dev_chrome_profile-XYZ',
  'session.tmp',
  'cache.temp',
];

// Files that the loose substring matching would have (wrongly) deleted.
const SHOULD_NOT_MATCH = [
  'my_chrome_settings.json',       // contains 'chrome_'
  'purchase_chrome_extension.dll', // contains 'chrome_'
  'report.tmp.docx',               // contains '.tmp' but ends .docx
  'important.temp.backup',         // contains '.temp' but ends .backup
  'notes.txt',
  'budget.xlsx',
];

describe('temp-cleanup filename matching (BUG-023)', () => {
  const disk = new DefaultDiskSpaceManager();
  const cleanup = new DefaultCleanupManager();
  const diskMatch = (disk as unknown as { shouldCleanupTempFile: Matcher })
    .shouldCleanupTempFile.bind(disk);
  const cleanupMatch = (cleanup as unknown as { shouldCleanupFile: Matcher })
    .shouldCleanupFile.bind(cleanup);

  for (const name of SHOULD_MATCH) {
    it(`DiskSpaceManager matches disposable artifact: ${name}`, () => {
      expect(diskMatch(name)).toBe(true);
    });
  }

  for (const name of SHOULD_NOT_MATCH) {
    it(`DiskSpaceManager does NOT match user file: ${name}`, () => {
      expect(diskMatch(name)).toBe(false);
    });
    it(`CleanupManager does NOT match user file: ${name}`, () => {
      expect(cleanupMatch(name)).toBe(false);
    });
  }

  it('CleanupManager still matches its own prefixes and temp extensions', () => {
    expect(cleanupMatch('printeer-xyz')).toBe(true);
    expect(cleanupMatch('puppeteer_dev_chrome_profile-1')).toBe(true);
    expect(cleanupMatch('a.tmp')).toBe(true);
    expect(cleanupMatch('a.temp')).toBe(true);
  });
});
