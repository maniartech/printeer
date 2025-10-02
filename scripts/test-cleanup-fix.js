#!/usr/bin/env node

/**
 * Test script to verify browser cleanup is working
 */

const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

async function countChromeProcesses() {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync(`
        (Get-WmiObject Win32_Process | 
         Where-Object { $_.Name -eq "chrome.exe" -or $_.Name -eq "chromium.exe" }).Count
      `, { shell: 'powershell', timeout: 10000 });
      return parseInt(stdout.trim()) || 0;
    } else {
      const { stdout } = await execAsync('ps aux | grep -E "(chrome|chromium)" | grep -v grep | wc -l', 
        { timeout: 10000 });
      return parseInt(stdout.trim()) || 0;
    }
  } catch (error) {
    console.warn('Failed to count Chrome processes:', error.message);
    return -1;
  }
}

async function runTest() {
  console.log('🧪 Testing browser cleanup fix...\n');

  // Count initial processes
  const initialCount = await countChromeProcesses();
  console.log(`📊 Initial Chrome processes: ${initialCount}`);

  // Run a simple test
  console.log('\n🚀 Running test conversion...');
  
  const testPromise = new Promise((resolve, reject) => {
    const child = spawn('node', [
      path.join(__dirname, '..', 'scripts', 'run-cli.js'),
      'convert',
      'https://example.com',
      'test-cleanup.pdf',
      '--dry-run'
    ], {
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PRINTEER_BUNDLED_ONLY: '1',
        PRINTEER_FORCE_CLEANUP: '1'
      }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    child.on('error', reject);
  });

  try {
    const result = await testPromise;
    console.log(`   Exit code: ${result.code}`);
    if (result.code !== 0) {
      console.log(`   stderr: ${result.stderr}`);
    }
  } catch (error) {
    console.error('   Test failed:', error.message);
  }

  // Wait a bit for cleanup
  console.log('\n⏳ Waiting for cleanup...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Count final processes
  const finalCount = await countChromeProcesses();
  console.log(`📊 Final Chrome processes: ${finalCount}`);

  // Check if cleanup worked
  const leaked = finalCount - initialCount;
  if (leaked <= 0) {
    console.log('✅ No browser processes leaked!');
  } else {
    console.log(`❌ ${leaked} browser processes leaked`);
    
    // Try emergency cleanup
    console.log('\n🔥 Running emergency cleanup...');
    try {
      const { performTestCleanup } = require('../src/test-utils/test-cleanup');
      await performTestCleanup();
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      const afterCleanupCount = await countChromeProcesses();
      console.log(`📊 After emergency cleanup: ${afterCleanupCount}`);
      
      if (afterCleanupCount <= initialCount) {
        console.log('✅ Emergency cleanup successful!');
      } else {
        console.log('❌ Emergency cleanup failed');
      }
    } catch (error) {
      console.error('Emergency cleanup error:', error);
    }
  }
}

if (require.main === module) {
  runTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { runTest };