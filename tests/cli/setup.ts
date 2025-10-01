/**
 * CLI Test Setup
 * This file runs before CLI tests to ensure the environment is ready
 */

import { TEST_CONFIG, waitForMockServer } from './test-utils';
import { existsSync, mkdirSync } from 'fs';

// Ensure test directories exist
if (!existsSync(TEST_CONFIG.tempDir)) {
  mkdirSync(TEST_CONFIG.tempDir, { recursive: true });
}

if (!existsSync(TEST_CONFIG.outputDir)) {
  mkdirSync(TEST_CONFIG.outputDir, { recursive: true });
}

// Check if mock server is available (warn if not, but don't fail)
waitForMockServer(3).then(isAvailable => {
  if (!isAvailable) {
    console.warn('⚠️  Mock server not available - some CLI tests may fail');
    console.warn('   Start mock server: cd mock-server && yarn start');
  } else {
    console.log('✅ Mock server is available');
  }
});