#!/usr/bin/env node

/**
 * Comprehensive test script for both browser strategies
 */

const { spawn } = require('child_process');
const path = require('path');

async function runTests(testPattern, description) {
  console.log(`\n🧪 ${description}...`);
  
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['test', testPattern], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} passed`);
        resolve(code);
      } else {
        console.log(`❌ ${description} failed with code ${code}`);
        resolve(code); // Don't reject, continue with other tests
      }
    });

    child.on('error', (error) => {
      console.error(`❌ ${description} error:`, error);
      resolve(1);
    });
  });
}

async function runAllTests() {
  console.log('🚀 Running comprehensive browser strategy tests...\n');

  const testSuites = [
    {
      pattern: 'tests/browser-strategy.test.ts',
      description: 'Browser Strategy Selection Tests'
    },
    {
      pattern: 'tests/batch-strategy.test.ts',
      description: 'Batch Strategy Detection Tests'
    },
    {
      pattern: 'tests/browser-pool.test.ts', 
      description: 'Browser Pool Strategy Tests'
    },
    {
      pattern: 'tests/browser-integration.test.ts',
      description: 'Browser Integration Tests'
    },
    {
      pattern: 'tests/browser-performance.test.ts',
      description: 'Browser Performance Tests'
    },
    {
      pattern: 'tests/cli/batch.test.ts',
      description: 'CLI Batch Tests (should use pool strategy)'
    }
  ];

  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of testSuites) {
    const result = await runTests(suite.pattern, suite.description);
    if (result === 0) {
      totalPassed++;
    } else {
      totalFailed++;
    }
  }

  console.log('\n📊 Test Summary:');
  console.log(`   ✅ Passed: ${totalPassed}`);
  console.log(`   ❌ Failed: ${totalFailed}`);
  console.log(`   📝 Total: ${totalPassed + totalFailed}`);

  if (totalFailed === 0) {
    console.log('\n🎉 All browser strategy tests passed!');
    console.log('   Both oneshot and pool strategies are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }

  return totalFailed === 0 ? 0 : 1;
}

if (require.main === module) {
  runAllTests().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };