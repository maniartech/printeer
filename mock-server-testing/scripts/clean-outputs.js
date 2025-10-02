#!/usr/bin/env node

import { Command } from 'commander';
import { OutputVerifier } from '../framework/output-verifier.js';
import { MockServerClient } from '../framework/mock-server-client.js';
import fs from 'fs';
import path from 'path';

const program = new Command();

program
  .name('printeer-clean-outputs')
  .description('Clean up old test output files and reports')
  .option('-d, --directory <dir>', 'Output directory to clean', './output')
  .option('-a, --age <age>', 'Maximum file age (24h, 7d, 30d)', '24h')
  .option('--dry-run', 'Show what would be deleted without actually deleting')
  .option('--preserve-reports', 'Keep report files while cleaning test outputs')
  .option('--verbose', 'Verbose output')
  .action(async (options) => {
    try {
      console.log('🧹 Cleaning up old test outputs...');
      console.log(`📁 Target Directory: ${options.directory}`);
      console.log(`⏰ Max Age: ${options.age}`);

      if (options.dryRun) {
        console.log('🔍 DRY RUN - No files will be deleted');
      }

      // Parse age string to milliseconds
      const ageMs = parseAgeString(options.age);
      console.log(`📅 Files older than ${new Date(Date.now() - ageMs).toLocaleString()} will be cleaned`);

      const outputVerifier = new OutputVerifier({ maxFileAge: ageMs });

      // Clean output files
      if (!options.dryRun) {
        const cleaned = await outputVerifier.cleanupOldFiles(options.directory, ageMs);

        if (cleaned.length > 0) {
          console.log(`\n🗑️  Cleaned ${cleaned.length} files:`);
          cleaned.forEach(file => {
            console.log(`   - ${path.basename(file)}`);
          });
        } else {
          console.log('✨ No old files found to clean');
        }
      } else {
        // Dry run - just show what would be deleted
        const filesToDelete = [];
        await scanForOldFiles(options.directory, Date.now() - ageMs, filesToDelete, options.preserveReports);

        if (filesToDelete.length > 0) {
          console.log(`\n🔍 Would delete ${filesToDelete.length} files:`);
          filesToDelete.forEach(file => {
            const stats = fs.statSync(file);
            console.log(`   - ${path.basename(file)} (${stats.birthtime.toLocaleDateString()})`);
          });
        } else {
          console.log('✨ No old files found');
        }
      }

      // Clean empty directories
      if (!options.dryRun) {
        await cleanEmptyDirectories(options.directory);
      }

      console.log('✅ Cleanup completed');

    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      process.exit(1);
    }
  });

// Utility functions
function parseAgeString(ageStr) {
  const match = ageStr.match(/^(\d+)([hdw])$/);
  if (!match) {
    throw new Error('Invalid age format. Use format like: 24h, 7d, 4w');
  }

  const [, amount, unit] = match;
  const multipliers = {
    'h': 60 * 60 * 1000,      // hours
    'd': 24 * 60 * 60 * 1000, // days
    'w': 7 * 24 * 60 * 60 * 1000 // weeks
  };

  return parseInt(amount) * multipliers[unit];
}

async function scanForOldFiles(dir, cutoffTime, filesToDelete, preserveReports) {
  if (!fs.existsSync(dir)) return;

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const itemPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      // Skip reports directory if preserving reports
      if (preserveReports && item.name === 'reports') {
        continue;
      }
      await scanForOldFiles(itemPath, cutoffTime, filesToDelete, preserveReports);
    } else if (item.isFile()) {
      const stats = fs.statSync(itemPath);
      if (stats.birthtime.getTime() < cutoffTime) {
        filesToDelete.push(itemPath);
      }
    }
  }
}

async function cleanEmptyDirectories(dir) {
  if (!fs.existsSync(dir)) return;

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      const itemPath = path.join(dir, item.name);
      await cleanEmptyDirectories(itemPath);

      // Check if directory is now empty
      const remaining = fs.readdirSync(itemPath);
      if (remaining.length === 0) {
        fs.rmdirSync(itemPath);
        console.log(`📁 Removed empty directory: ${item.name}`);
      }
    }
  }
}

program.parse();