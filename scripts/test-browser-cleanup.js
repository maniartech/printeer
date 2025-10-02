#!/usr/bin/env node

/**
 * Test script for browser cleanup functionality
 * 
 * This script helps verify that browser cleanup is working properly
 * by launching browsers and then cleaning them up.
 */

const { spawn } = require('child_process');
const path = require('path');

async function testBrowserCleanup() {
  console.log('🧪 Testing browser cleanup functionality...\n');

  try {
    // Test 1: Check current status
    console.log('📊 Step 1: Checking current browser status...');
    await runCommand('cleanup', ['status', '--verbose']);

    // Test 2: Launch a few test conversions to create browsers
    console.log('\n🚀 Step 2: Creating test browsers...');
    const testPromises = [];
    for (let i = 0; i < 3; i++) {
      testPromises.push(
        runCommand('convert', [
          'https://example.com',
          `test-output-${i}.pdf`,
          '--dry-run'
        ])
      );
    }
    await Promise.all(testPromises);

    // Test 3: Check status after creating browsers
    console.log('\n📊 Step 3: Checking status after browser creation...');
    await runCommand('cleanup', ['status', '--verbose']);

    // Test 4: Perform cleanup
    console.log('\n🧹 Step 4: Performing cleanup...');
    await runCommand('cleanup', []);

    // Test 5: Final status check
    console.log('\n📊 Step 5: Final status check...');
    await runCommand('cleanup', ['status', '--verbose']);

    console.log('\n✅ Browser cleanup test completed successfully!');

  } catch (error) {
    console.error('\n❌ Browser cleanup test failed:', error.message);
    process.exit(1);
  }
}

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const cliPath = path.join(__dirname, '..', 'scripts', 'run-cli.js');
    const child = spawn('node', [cliPath, command, ...args], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PRINTEER_BUNDLED_ONLY: '1'
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Run the test
if (require.main === module) {
  testBrowserCleanup().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testBrowserCleanup };