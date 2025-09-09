#!/usr/bin/env node

import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const cliPath = join(projectRoot, 'dist', 'bin', 'cli.js');

// Check if CLI is built
if (!existsSync(cliPath)) {
  // Build silently if needed
  try {
    execSync('npm run build:cli:silent', {
      cwd: projectRoot,
      stdio: 'ignore'
    });
  } catch (error) {
    console.error('Failed to build CLI. Please run: npm run build');
    process.exit(1);
  }
}

// Run the CLI with all arguments
try {
  execSync(`node "${cliPath}" ${process.argv.slice(2).join(' ')}`, {
    cwd: projectRoot,
    stdio: 'inherit'
  });
} catch (error) {
  process.exit(error.status || 1);
}
