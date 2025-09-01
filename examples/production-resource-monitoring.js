#!/usr/bin/env node

// Production Resource Monitoring Example
// This shows how to use resource optimization in a real production environment

const { DefaultResourceManager, DefaultResourceOptimizer } = require('../dist/core/resource');
const { ProductionMonitor, ResourceValidator } = require('../dist/core/resource-validator');

async function productionExample() {
  console.log('🚀 Starting Production Resource Monitoring Example\n');

  // 1. Initialize resource management
  const resourceManager = new DefaultResourceManager();
  const optimizer = new DefaultResourceOptimizer();
  const monitor = new ProductionMonitor();
  const validator = new ResourceValidator();

  try {
    // 2. Perform initial health check
    console.log('📊 Performing initial health check...');
    const initialHealth = await validator.performHealthCheck();
    
    console.log('System Health:', initialHealth.systemHealth.isValid ? '✅ GOOD' : '❌ ISSUES');
    console.log('Optimization Health:', initialHealth.optimizationHealth.isValid ? '✅ GOOD' : '❌ ISSUES');
    
    if (initialHealth.systemHealth.errors.length > 0) {
      console.log('❌ System Errors:', initialHealth.systemHealth.errors);
    }
    
    if (initialHealth.optimizationHealth.errors.length > 0) {
      console.log('❌ Optimization Errors:', initialHealth.optimizationHealth.errors);
    }
    
    if (initialHealth.recommendations.length > 0) {
      console.log('💡 Recommendations:', initialHealth.recommendations);
    }

    // 3. Start resource monitoring
    console.log('\n🔍 Starting resource monitoring...');
    resourceManager.startMonitoring(30000); // Monitor every 30 seconds
    
    // Wait for initial metrics
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Get current system metrics
    const metrics = await resourceManager.getLatestMetrics();
    console.log('\n📈 Current System Metrics:');
    console.log(`  Memory Usage: ${(metrics.memoryUsage * 100).toFixed(1)}%`);
    console.log(`  CPU Usage: ${(metrics.cpuUsage * 100).toFixed(1)}%`);
    console.log(`  Disk Usage: ${(metrics.diskUsage * 100).toFixed(1)}%`);
    console.log(`  Browser Instances: ${metrics.browserInstances}`);
    console.log(`  Active Requests: ${metrics.activeRequests}`);

    // 5. Get optimization recommendations
    console.log('\n🎯 Getting optimization recommendations...');
    const recommendations = resourceManager.getOptimizationRecommendations();
    
    if (recommendations.length > 0) {
      console.log('Optimization Recommendations:');
      recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.action}`);
        console.log(`     Impact: ${rec.estimatedImpact}`);
      });
    } else {
      console.log('✅ No optimization recommendations - system is running optimally');
    }

    // 6. Optimize browser pool size
    console.log('\n🔧 Optimizing browser pool size...');
    const optimalPoolSize = await optimizer.optimizeBrowserPoolSize(metrics);
    console.log(`Optimal browser pool size: ${optimalPoolSize}`);

    // 7. Perform resource cleanup
    console.log('\n🧹 Performing resource cleanup...');
    await optimizer.cleanupTemporaryFiles();
    console.log('✅ Temporary files cleanup completed');

    // 8. Optimize network usage
    console.log('\n🌐 Optimizing network usage...');
    await optimizer.optimizeNetworkUsage();
    console.log('✅ Network optimization completed');

    // 9. Start production monitoring
    console.log('\n📊 Starting production monitoring (will run for 2 minutes)...');
    monitor.startMonitoring(30000); // Check every 30 seconds

    // 10. Simulate some load and monitor
    console.log('\n⚡ Simulating load...');
    
    // Simulate browser instances
    for (let i = 0; i < 3; i++) {
      resourceManager.incrementBrowserInstances();
      resourceManager.incrementActiveRequests();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Wait and show monitoring results
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute

    // 11. Get monitoring summary
    const healthSummary = monitor.getHealthSummary();
    console.log('\n📊 Production Monitoring Summary:');
    console.log(`  Total Health Checks: ${healthSummary.totalChecks}`);
    console.log(`  Successful Checks: ${healthSummary.successfulChecks}`);
    console.log(`  Failed Checks: ${healthSummary.failedChecks}`);
    console.log(`  Success Rate: ${healthSummary.successRate.toFixed(1)}%`);
    
    if (healthSummary.commonIssues.length > 0) {
      console.log('  Common Issues:');
      healthSummary.commonIssues.forEach(issue => {
        console.log(`    - ${issue}`);
      });
    }

    // 12. Final health check
    console.log('\n🏁 Final health check...');
    const finalHealth = await monitor.getCurrentHealth();
    console.log('Final System Health:', finalHealth.systemHealth.isValid ? '✅ GOOD' : '❌ ISSUES');
    console.log('Final Optimization Health:', finalHealth.optimizationHealth.isValid ? '✅ GOOD' : '❌ ISSUES');

    // 13. Test error handling
    console.log('\n🧪 Testing error handling...');
    try {
      // Test with invalid metrics
      const invalidMetrics = {
        memoryUsage: -1, // Invalid
        cpuUsage: 2, // Invalid
        diskUsage: 0.5,
        browserInstances: 0,
        activeRequests: 0,
        timestamp: new Date()
      };
      
      const poolSizeWithInvalidMetrics = await optimizer.optimizeBrowserPoolSize(invalidMetrics);
      console.log(`Pool size with invalid metrics: ${poolSizeWithInvalidMetrics} (should still work)`);
      
    } catch (error) {
      console.log('❌ Error handling test failed:', error.message);
    }

    console.log('\n✅ Production example completed successfully!');

  } catch (error) {
    console.error('❌ Production example failed:', error);
    process.exit(1);
  } finally {
    // 14. Cleanup
    console.log('\n🧹 Cleaning up...');
    resourceManager.stopMonitoring();
    monitor.stopMonitoring();
    await resourceManager.cleanup();
    await monitor.cleanup();
    console.log('✅ Cleanup completed');
  }
}

// Handle process signals for graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the example
if (require.main === module) {
  productionExample().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { productionExample };