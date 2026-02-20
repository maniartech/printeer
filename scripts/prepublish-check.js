#!/usr/bin/env node

/**
 * Printeer Publish Readiness Checker
 *
 * Validates that the package is ready for npm publishing.
 *
 * Usage:
 *   node scripts/prepublish-check.js
 *   node scripts/prepublish-check.js --fix    # Auto-fix what's possible
 *
 * Checks:
 *   ✓ Git working directory is clean
 *   ✓ On main/master branch
 *   ✓ Package.json is valid
 *   ✓ Version not already published
 *   ✓ Required files exist
 *   ✓ Build succeeds
 *   ✓ Tests pass
 *   ✓ TypeScript compiles without errors
 *   ✓ No console.log in source (optional)
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ANSI colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const CHECK = `${c.green}✓${c.reset}`;
const CROSS = `${c.red}✗${c.reset}`;
const WARN = `${c.yellow}⚠${c.reset}`;
const INFO = `${c.blue}ℹ${c.reset}`;

let hasErrors = false;
let hasWarnings = false;

function log(symbol, message, detail = '') {
  console.log(`  ${symbol} ${message}${detail ? c.dim + ' ' + detail + c.reset : ''}`);
}

function pass(message, detail = '') {
  log(CHECK, message, detail);
}

function fail(message, detail = '') {
  log(CROSS, message, detail);
  hasErrors = true;
}

function warn(message, detail = '') {
  log(WARN, message, detail);
  hasWarnings = true;
}

function info(message, detail = '') {
  log(INFO, message, detail);
}

function run(cmd, options = {}) {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : ['pipe', 'pipe', 'pipe'],
      ...options
    }).trim();
  } catch (error) {
    if (options.allowFail) return null;
    throw error;
  }
}

function fileExists(path) {
  return existsSync(join(ROOT, path));
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
  } catch {
    return null;
  }
}

// ============================================================================
// CHECKS
// ============================================================================

function checkGitStatus() {
  console.log(`\n${c.cyan}Git Status${c.reset}`);

  // Check for uncommitted changes
  const status = run('git status --porcelain', { allowFail: true });
  if (status === null) {
    warn('Not a git repository');
    return;
  }

  if (status) {
    const lines = status.split('\n').length;
    fail(`Uncommitted changes`, `(${lines} files)`);
  } else {
    pass('Working directory is clean');
  }

  // Check branch
  const branch = run('git branch --show-current', { allowFail: true });
  if (branch === 'main' || branch === 'master') {
    pass(`On ${branch} branch`);
  } else {
    warn(`On ${branch} branch`, '(expected main/master)');
  }

  // Check if pushed
  const ahead = run('git rev-list --count @{u}..HEAD 2>/dev/null || echo 0', { allowFail: true });
  if (ahead && parseInt(ahead) > 0) {
    warn(`${ahead} commits ahead of remote`, '(run git push)');
  }
}

function checkPackageJson() {
  console.log(`\n${c.cyan}Package.json${c.reset}`);

  const pkg = readJson('package.json');
  if (!pkg) {
    fail('package.json not found or invalid');
    return null;
  }
  pass('package.json is valid JSON');

  // Required fields
  const required = ['name', 'version', 'description', 'main', 'license'];
  for (const field of required) {
    if (pkg[field]) {
      pass(`Has ${field}`, `"${pkg[field]}"`);
    } else {
      fail(`Missing ${field}`);
    }
  }

  // Recommended fields
  const recommended = ['repository', 'keywords', 'author', 'homepage', 'bugs'];
  for (const field of recommended) {
    if (pkg[field]) {
      pass(`Has ${field}`);
    } else {
      warn(`Missing ${field}`, '(recommended)');
    }
  }

  // Check types
  if (pkg.types || pkg.typings) {
    pass('TypeScript types declared');
  } else {
    warn('No types field', '(add "types" for TypeScript users)');
  }

  // Check bin
  if (pkg.bin) {
    pass('CLI binary configured');
  }

  return pkg;
}

function checkVersion(pkg) {
  console.log(`\n${c.cyan}Version${c.reset}`);

  if (!pkg) return;

  info(`Current version`, pkg.version);

  // Check if version already published
  try {
    const published = run(`npm view ${pkg.name} version 2>/dev/null`, { allowFail: true });
    if (published === pkg.version) {
      fail(`Version ${pkg.version} already published`, '(bump version)');
    } else if (published) {
      pass(`Not yet published`, `(latest: ${published})`);
    } else {
      pass('First publish');
    }
  } catch {
    info('Could not check npm registry');
  }
}

function checkRequiredFiles() {
  console.log(`\n${c.cyan}Required Files${c.reset}`);

  const required = [
    'README.md',
    'LICENSE',
    'package.json',
    'tsconfig.json'
  ];

  for (const file of required) {
    if (fileExists(file)) {
      pass(file);
    } else {
      fail(`Missing ${file}`);
    }
  }

  // Check dist directory
  const distFiles = ['dist/lib/index.js', 'dist/bin/cli.js'];
  let hasDist = true;
  for (const file of distFiles) {
    if (!fileExists(file)) {
      hasDist = false;
    }
  }

  if (hasDist) {
    pass('dist/ built');
  } else {
    fail('dist/ not built', '(run: node scripts/build.js)');
  }

  // Check types
  if (fileExists('dist/lib/index.d.ts')) {
    pass('Type declarations generated');
  } else {
    warn('Type declarations missing', '(run: npm run build:types)');
  }
}

function checkBuild() {
  console.log(`\n${c.cyan}Build${c.reset}`);

  try {
    info('Running build...');
    run('node scripts/build.js --silent', { silent: true });
    pass('Build successful');
  } catch (error) {
    fail('Build failed');
  }
}

function checkTests() {
  console.log(`\n${c.cyan}Tests${c.reset}`);

  try {
    info('Running tests...');
    run('npm test 2>&1', { silent: true });
    pass('All tests pass');
  } catch (error) {
    fail('Tests failed');
  }
}

function checkTypeScript() {
  console.log(`\n${c.cyan}TypeScript${c.reset}`);

  try {
    run('npx tsc --noEmit', { silent: true });
    pass('No TypeScript errors');
  } catch {
    fail('TypeScript compilation errors');
  }
}

function checkCodeQuality() {
  console.log(`\n${c.cyan}Code Quality${c.reset}`);

  // Check for console.log in source
  try {
    const result = run('grep -r "console.log" src/ --include="*.ts" -l 2>/dev/null || true', { allowFail: true });
    if (result) {
      const files = result.split('\n').filter(Boolean).length;
      warn(`console.log found in ${files} files`, '(consider removing)');
    } else {
      pass('No console.log in source');
    }
  } catch {
    info('Skipping console.log check');
  }

  // Check for TODO/FIXME
  try {
    const result = run('grep -rE "(TODO|FIXME)" src/ --include="*.ts" -c 2>/dev/null || echo 0', { allowFail: true });
    const count = parseInt(result) || 0;
    if (count > 0) {
      warn(`${count} TODO/FIXME comments found`);
    } else {
      pass('No TODO/FIXME comments');
    }
  } catch {
    info('Skipping TODO check');
  }
}

function checkNpmPack() {
  console.log(`\n${c.cyan}Package Contents${c.reset}`);

  try {
    const files = run('npm pack --dry-run 2>&1', { silent: true });
    const lines = files.split('\n').filter(l => l.startsWith('npm notice') && !l.includes('total files'));
    const fileCount = lines.length;
    const sizeMatch = files.match(/total files:\s+(\d+)/);
    const totalFiles = sizeMatch ? sizeMatch[1] : fileCount;

    pass(`Package contains ${totalFiles} files`);

    // Check for accidental inclusions
    const problematic = ['.env', 'node_modules', '.git'];
    for (const item of problematic) {
      if (files.includes(item)) {
        fail(`Package includes ${item}`, '(add to .npmignore)');
      }
    }
  } catch {
    warn('Could not check package contents');
  }
}

// ============================================================================
// MAIN
// ============================================================================

console.log(`\n${c.bold}🖨️  Printeer Publish Readiness Check${c.reset}\n`);
console.log(`${c.dim}Checking if package is ready for npm publish...${c.reset}`);

checkGitStatus();
const pkg = checkPackageJson();
checkVersion(pkg);
checkRequiredFiles();
checkBuild();
checkTests();
checkTypeScript();
checkCodeQuality();
checkNpmPack();

// Summary
console.log(`\n${c.bold}Summary${c.reset}`);
console.log('─'.repeat(40));

if (hasErrors) {
  console.log(`\n${CROSS} ${c.red}Not ready to publish${c.reset}`);
  console.log(`${c.dim}Fix the errors above before publishing.${c.reset}\n`);
  process.exit(1);
} else if (hasWarnings) {
  console.log(`\n${WARN} ${c.yellow}Ready with warnings${c.reset}`);
  console.log(`${c.dim}Consider addressing warnings before publishing.${c.reset}`);
  console.log(`\n${c.green}To publish:${c.reset} npm publish\n`);
  process.exit(0);
} else {
  console.log(`\n${CHECK} ${c.green}Ready to publish!${c.reset}`);
  console.log(`\n${c.green}To publish:${c.reset} npm publish\n`);
  process.exit(0);
}
