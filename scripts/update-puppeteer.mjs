#!/usr/bin/env node
/**
 * Self-maintaining Puppeteer updater.
 *
 * Goals: idempotent, low-maintenance (no hardcoded versions - reads the latest
 * from the npm registry), and rollback-safe (snapshots package.json +
 * lockfile before changing anything and restores them automatically if the
 * post-upgrade verification fails).
 *
 * Usage:
 *   node scripts/update-puppeteer.mjs            # --check (dry run): report only
 *   node scripts/update-puppeteer.mjs --apply    # upgrade, verify, auto-rollback on failure
 *   node scripts/update-puppeteer.mjs --rollback # restore the last snapshot
 *   node scripts/update-puppeteer.mjs --apply --yes   # no prompt
 *
 * Verification = `npm run build` + a Puppeteer smoke conversion. If either
 * fails, the snapshot is restored and the script exits non-zero.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKUP_DIR = join(ROOT, '.puppeteer-upgrade-backup');
const FILES = ['package.json', 'package-lock.json'];

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested in tests/scripts/update-puppeteer.test.ts)
// ---------------------------------------------------------------------------

/** Compare two semver strings. Returns -1 / 0 / 1. Ignores pre-release tags. */
export function compareVersions(a, b) {
  const pa = String(a).replace(/^[^0-9]*/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).replace(/^[^0-9]*/, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

/** Decide what to do given current/latest versions. Pure -> easy to test. */
export function planUpgrade(current, latest) {
  if (!latest) return { action: 'error', reason: 'could not resolve latest version' };
  const cmp = compareVersions(current, latest);
  if (cmp >= 0) return { action: 'noop', reason: `already at or above latest (${current} >= ${latest})` };
  return { action: 'upgrade', from: current, to: latest };
}

// ---------------------------------------------------------------------------
// IO / orchestration (only runs when executed as a CLI)
// ---------------------------------------------------------------------------

function log(msg) {
  console.log(`[update-puppeteer] ${msg}`);
}

function sh(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...opts });
}

function readCurrentVersion() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const spec = (pkg.dependencies && pkg.dependencies.puppeteer) || '';
  return spec.replace(/^[^0-9]*/, '') || '0.0.0';
}

function fetchLatestVersion() {
  try {
    return execSync('npm view puppeteer version', { cwd: ROOT }).toString().trim();
  } catch {
    return '';
  }
}

function snapshot() {
  mkdirSync(BACKUP_DIR, { recursive: true });
  for (const f of FILES) {
    if (existsSync(join(ROOT, f))) copyFileSync(join(ROOT, f), join(BACKUP_DIR, f));
  }
  log(`snapshot saved to ${BACKUP_DIR}`);
}

function restore() {
  let restored = 0;
  for (const f of FILES) {
    const from = join(BACKUP_DIR, f);
    if (existsSync(from)) {
      copyFileSync(from, join(ROOT, f));
      restored++;
    }
  }
  if (restored === 0) {
    log('no snapshot found to restore');
    return false;
  }
  log('restoring dependencies from snapshot (npm ci)...');
  sh('npm ci');
  return true;
}

function verify() {
  try {
    log('verifying: npm run build');
    sh('npm run build');
    log('verifying: smoke conversion');
    sh('node scripts/update-puppeteer.smoke.mjs');
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--rollback')
    ? 'rollback'
    : args.includes('--apply')
      ? 'apply'
      : 'check';

  if (mode === 'rollback') {
    const ok = restore();
    process.exit(ok ? 0 : 1);
  }

  const current = readCurrentVersion();
  const latest = fetchLatestVersion();
  const plan = planUpgrade(current, latest);
  log(`current=${current} latest=${latest || 'unknown'} -> ${plan.action}${plan.reason ? ` (${plan.reason})` : ''}`);

  if (plan.action !== 'upgrade') {
    process.exit(plan.action === 'error' ? 1 : 0);
  }

  if (mode === 'check') {
    log(`run with --apply to upgrade puppeteer ${plan.from} -> ${plan.to}`);
    process.exit(0);
  }

  // apply
  snapshot();
  try {
    log(`installing puppeteer@${plan.to}...`);
    sh(`npm install puppeteer@${plan.to} --save`);
    log('installing matching browser...');
    try { sh('npx puppeteer browsers install chrome'); } catch { /* older puppeteer downloads on install */ }
  } catch (e) {
    log(`install failed: ${e.message}; rolling back`);
    restore();
    process.exit(1);
  }

  if (verify()) {
    log(`[ok] upgraded to puppeteer@${plan.to} and verified`);
    rmSync(BACKUP_DIR, { recursive: true, force: true });
    process.exit(0);
  } else {
    log('[fail] verification failed; rolling back to the snapshot');
    restore();
    process.exit(1);
  }
}

// Only run orchestration when invoked directly (not when imported by tests).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
