#!/usr/bin/env node

/**
 * Test script to verify browser manager is working correctly
 */

const path = require('path');

async function testBrowserManager() {
  console.log('🧪 Testing DefaultBrowserManager...\n');

  try {
    // Import the API (which will create the browser manager)
    const apiPath = path.join(__dirname, '..', 'src', 'api', 'index.ts');
    const printeer = require(apiPath).default;

    console.log('📊 Step 1: Initial status check...');
    const { DefaultBrowserManager } = require(path.join(__dirname, '..', 'src', 'printing', 'browser'));
    
    let manager = DefaultBrowserManager.getGlobalInstance();
    if (manager) {
      console.log('   Browser manager already exists');
      console.log('   Status:', manager.getPoolStatus());
    } else {
      console.log('   No browser manager yet (will be created on first use)');
    }

    console.log('\n🚀 Step 2: Running test conversion...');
    
    // This should create the browser manager and use it properly
    try {
      await printeer('https://example.com', 'test-output.pdf');
      console.log('   ✅ Conversion completed successfully');
    } catch (error) {
      console.log('   ⚠️  Conversion failed (expected in test):', error.message);
    }

    console.log('\n📊 Step 3: Post-conversion status...');
    manager = DefaultBrowserManager.getGlobalInstance();
    if (manager) {
      const status = manager.getPoolStatus();
      console.log('   Browser manager status:');
      console.log(`     Total browsers: ${status.totalBrowsers}`);
      console.log(`     Available: ${status.availableBrowsers}`);
      console.log(`     Busy: ${status.busyBrowsers}`);
      console.log(`     Healthy: ${status.healthyBrowsers}`);
      console.log('   Metrics:');
      console.log(`     Created: ${status.metrics.created}`);
      console.log(`     Destroyed: ${status.metrics.destroyed}`);
      console.log(`     Reused: ${status.metrics.reused}`);
      console.log(`     Errors: ${status.metrics.errors}`);
    }

    console.log('\n🧹 Step 4: Testing cleanup...');
    if (manager) {
      const cleanupResult = await manager.emergencyCleanup();
      console.log(`   ✅ Emergency cleanup: ${cleanupResult.killed} browsers killed`);
      if (cleanupResult.errors.length > 0) {
        console.log('   Errors:', cleanupResult.errors);
      }
    }

    console.log('\n📊 Step 5: Final status...');
    if (manager) {
      const finalStatus = manager.getPoolStatus();
      console.log(`   Final browser count: ${finalStatus.totalBrowsers}`);
      
      if (finalStatus.totalBrowsers === 0) {
        console.log('   ✅ All browsers properly cleaned up!');
      } else {
        console.log('   ⚠️  Some browsers still active');
      }
    }

    console.log('\n✅ Browser manager test completed!');

  } catch (error) {
    console.error('\n❌ Browser manager test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testBrowserManager().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testBrowserManager };