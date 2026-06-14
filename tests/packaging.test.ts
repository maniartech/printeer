/**
 * Packaging / publish-readiness guards (no browser needed).
 *
 * Uses `npm pack --dry-run --json` to assert exactly what would be published,
 * plus package.json hygiene fields.
 *
 * Guards: BUG-008 (junk published / no files field), BUG-012 (license),
 * and the packaging/docs sweep (engines, description, prepublishOnly,
 * single lockfile, .parcel-cache, workspace + doctor artifacts).
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

function packedFiles(): string[] {
  const out = execSync('npm pack --dry-run --json', { cwd: ROOT, encoding: 'utf8' });
  const parsed = JSON.parse(out);
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  return (entry.files || []).map((f: { path: string }) => f.path.replace(/\\/g, '/'));
}

describe('packaging (BUG-008)', () => {
  const files = packedFiles();

  it('publishes the built entry points', () => {
    expect(files).toContain('dist/bin/cli.js');
    expect(files).toContain('dist/lib/index.js');
    expect(files.some((f) => f === 'README.md')).toBe(true);
    expect(files.some((f) => f.toUpperCase() === 'LICENSE')).toBe(true);
  });

  it('does NOT publish source, tests, or build caches', () => {
    const offenders = files.filter(
      (f) =>
        f.startsWith('src/') ||
        f.startsWith('tests/') ||
        f.startsWith('output/') ||
        f.startsWith('.parcel-cache/') ||
        f.startsWith('mock-server') ||
        f.startsWith('scripts/') ||
        f.endsWith('.code-workspace') ||
        f.startsWith('printeer-doctor-output')
    );
    expect(offenders, `unexpected published files: ${offenders.join(', ')}`).toEqual([]);
  });
});

describe('package.json hygiene', () => {
  it('BUG-008: has an explicit files allowlist', () => {
    expect(Array.isArray(pkg.files)).toBe(true);
    expect(pkg.files).toContain('dist');
  });

  it('declares an engines.node range', () => {
    expect(pkg.engines?.node).toBeTruthy();
  });

  it('has a prepublishOnly build hook', () => {
    expect(pkg.scripts?.prepublishOnly).toMatch(/build/);
  });

  it('BUG-012: license is Apache-2.0 (not ISC)', () => {
    expect(pkg.license).toBe('Apache-2.0');
  });

  it('description does not say "Coming Soon" for PNG (it is implemented)', () => {
    expect(pkg.description).not.toMatch(/coming soon/i);
  });

  it('commits a single lockfile (npm), not yarn.lock', () => {
    expect(existsSync(join(ROOT, 'yarn.lock'))).toBe(false);
  });
});

describe('docs accuracy (BUG-012)', () => {
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');

  it('README does not advertise the ISC license', () => {
    expect(readme).not.toMatch(/License:\s*ISC/i);
    expect(readme).not.toMatch(/badge\/License-ISC/i);
  });

  it('a CHANGELOG.md exists (README links to it)', () => {
    expect(existsSync(join(ROOT, 'CHANGELOG.md'))).toBe(true);
  });
});
