#!/usr/bin/env node

/**
 * Printeer Build Script
 *
 * Usage:
 *   node scripts/build.js [options]
 *
 * Options:
 *   --lib       Build library only
 *   --cli       Build CLI only
 *   --types     Build types only
 *   --watch     Watch mode (CLI only)
 *   --clean     Clean dist before build
 *   --silent    Suppress build output
 *   --help      Show this help message
 *
 * Examples:
 *   node scripts/build.js              # Full build (clean + lib + cli + types)
 *   node scripts/build.js --cli        # CLI build only
 *   node scripts/build.js --watch      # CLI watch mode
 *   node scripts/build.js --clean      # Clean dist directory
 */

import { execSync, spawn } from 'child_process';
import { rmSync, existsSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log(`${colors.cyan}[${step}]${colors.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logError(message) {
  console.error(`${colors.red}✗${colors.reset} ${message}`);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getFileSize(path) {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}

function run(cmd, options = {}) {
  const { silent = false, cwd = ROOT } = options;
  try {
    execSync(cmd, {
      cwd,
      stdio: silent ? 'pipe' : 'inherit',
      encoding: 'utf8'
    });
    return true;
  } catch (error) {
    if (!silent) {
      logError(`Command failed: ${cmd}`);
    }
    return false;
  }
}

function clean() {
  logStep('clean', 'Removing dist directory...');
  const distPath = join(ROOT, 'dist');
  if (existsSync(distPath)) {
    rmSync(distPath, { recursive: true, force: true });
    logSuccess('Cleaned dist/');
  } else {
    log('  dist/ does not exist, skipping', 'dim');
  }
}

function buildLib(silent = false) {
  logStep('lib', 'Building library...');
  const cmd = [
    'npx esbuild',
    './src/index.ts',
    '--outfile=./dist/lib/index.js',
    '--bundle',
    '--platform=node',
    '--packages=external',
    '--target=node16.8',
    '--format=esm',
    '--sourcemap',
    silent ? '--log-level=error' : ''
  ].filter(Boolean).join(' ');

  if (run(cmd, { silent })) {
    const size = getFileSize(join(ROOT, 'dist/lib/index.js'));
    logSuccess(`Built dist/lib/index.js (${formatBytes(size)})`);
    return true;
  }
  return false;
}

function buildCli(silent = false) {
  logStep('cli', 'Building CLI...');
  const cmd = [
    'npx esbuild',
    './src/cli/index.ts',
    '--outfile=./dist/bin/cli.js',
    '--bundle',
    '--platform=node',
    '--packages=external',
    '--target=node16.8',
    '--format=esm',
    '--sourcemap',
    silent ? '--log-level=error' : ''
  ].filter(Boolean).join(' ');

  if (run(cmd, { silent })) {
    const size = getFileSize(join(ROOT, 'dist/bin/cli.js'));
    logSuccess(`Built dist/bin/cli.js (${formatBytes(size)})`);
    return true;
  }
  return false;
}

function buildTypes() {
  logStep('types', 'Generating TypeScript declarations...');
  if (run('npx tsc --project tsconfig.build.json', { silent: true })) {
    logSuccess('Generated type declarations');
    return true;
  }
  return false;
}

function watchCli() {
  logStep('watch', 'Starting CLI watch mode...');
  log('  Press Ctrl+C to stop\n', 'dim');

  const child = spawn('npx', [
    'esbuild',
    './src/cli/index.ts',
    '--outfile=./dist/bin/cli.js',
    '--bundle',
    '--platform=node',
    '--packages=external',
    '--target=node16.8',
    '--format=esm',
    '--sourcemap',
    '--watch'
  ], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true
  });

  child.on('error', (err) => {
    logError(`Watch failed: ${err.message}`);
    process.exit(1);
  });

  process.on('SIGINT', () => {
    child.kill();
    process.exit(0);
  });
}

function showHelp() {
  console.log(`
${colors.bright}Printeer Build Script${colors.reset}

${colors.yellow}Usage:${colors.reset}
  node scripts/build.js [options]

${colors.yellow}Options:${colors.reset}
  --lib       Build library only
  --cli       Build CLI only
  --types     Build types only
  --watch     Watch mode (CLI only)
  --clean     Clean dist before build (or clean only if sole flag)
  --silent    Suppress build output
  --help      Show this help message

${colors.yellow}Examples:${colors.reset}
  node scripts/build.js              # Full build (clean + lib + cli + types)
  node scripts/build.js --cli        # CLI build only
  node scripts/build.js --watch      # CLI watch mode
  node scripts/build.js --clean      # Clean dist directory only
  node scripts/build.js --cli --types  # CLI + types
`);
}

// Parse arguments
const args = process.argv.slice(2);
const flags = {
  lib: args.includes('--lib'),
  cli: args.includes('--cli'),
  types: args.includes('--types'),
  watch: args.includes('--watch'),
  clean: args.includes('--clean'),
  silent: args.includes('--silent'),
  help: args.includes('--help') || args.includes('-h')
};

// Show help
if (flags.help) {
  showHelp();
  process.exit(0);
}

// Main execution
const startTime = Date.now();

console.log(`\n${colors.bright}🖨️  Printeer Build${colors.reset}\n`);

// Determine what to build
const buildAll = !flags.lib && !flags.cli && !flags.types && !flags.watch;
const cleanOnly = flags.clean && !flags.lib && !flags.cli && !flags.types && !flags.watch;

// Clean
if (flags.clean || buildAll) {
  clean();
}

// Clean only mode
if (cleanOnly) {
  process.exit(0);
}

// Watch mode
if (flags.watch) {
  watchCli();
} else {
  // Build steps
  let success = true;

  if (buildAll || flags.lib) {
    success = buildLib(flags.silent) && success;
  }

  if (buildAll || flags.cli) {
    success = buildCli(flags.silent) && success;
  }

  if (buildAll || flags.types) {
    success = buildTypes() && success;
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log();

  if (success) {
    log(`Build completed in ${duration}s`, 'green');
  } else {
    logError(`Build failed after ${duration}s`);
    process.exit(1);
  }
}
