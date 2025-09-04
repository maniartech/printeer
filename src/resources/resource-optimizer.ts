/**
 * # Default Resource Optimizer - Intelligent Resource Optimization Engine
 * 
 * ## Purpose
 * The DefaultResourceOptimizer provides intelligent optimization strategies for system resources,
 * coordinating multiple specialized optimizers to maintain optimal performance under varying loads.
 * 
 * ## Core Objectives
 * 1. **Browser Pool Optimization**: Dynamic adjustment of browser instance counts
 * 2. **Disk Space Management**: Intelligent cleanup strategies based on usage patterns
 * 3. **Network Optimization**: Bandwidth and compression optimization
 * 4. **Recommendation Engine**: Provides actionable optimization recommendations
 * 
 * ## Optimization Strategy
 * 
 * ### Multi-Layered Approach
 * 1. **Reactive Optimization**: Responds to current resource pressure
 * 2. **Predictive Optimization**: Anticipates resource needs based on metrics
 * 3. **Adaptive Optimization**: Learns from system behavior patterns
 * 
 * ### Resource-Specific Optimizations
 * 
 * #### Browser Pool Management
 * - Calculates optimal browser instance count based on current load
 * - Adjusts pool size based on memory, CPU, and disk constraints
 * - Balances performance vs resource consumption
 * 
 * #### Disk Space Optimization
 * - Monitors disk usage patterns and triggers appropriate cleanup
 * - Implements aggressive cleanup strategies when disk space is critical
 * - Manages temporary file lifecycle automatically
 * 
 * #### Network Optimization
 * - Coordinates bandwidth usage optimization
 * - Enables compression strategies for resource loading
 * - Optimizes network resource loading patterns
 * 
 * ## Recommendation System
 * 
 * ### Recommendation Types
 * - **Memory Optimization**: Browser pool reduction, garbage collection
 * - **Browser Pool Optimization**: Instance count adjustments based on utilization
 * - **Disk Optimization**: Cleanup strategies and space management
 * - **Network Optimization**: Bandwidth throttling and compression
 * 
 * ### Priority Levels
 * - **High Priority**: Critical resource pressure requiring immediate action
 * - **Medium Priority**: Performance optimizations with measurable impact
 * - **Low Priority**: Fine-tuning optimizations for efficiency gains
 * 
 * ## Usage Patterns
 * 
 * ### Continuous Optimization
 * ```typescript
 * const optimizer = new DefaultResourceOptimizer();
 * 
 * // Get optimal browser pool size
 * const optimalSize = await optimizer.optimizeBrowserPoolSize(metrics);
 * 
 * // Perform comprehensive cleanup
 * await optimizer.cleanupTemporaryFiles();
 * 
 * // Optimize network usage
 * await optimizer.optimizeNetworkUsage();
 * 
 * // Get actionable recommendations
 * const recommendations = optimizer.getOptimizationRecommendations(metrics);
 * ```
 * 
 * ### Integration with Resource Manager
 * - Called automatically by ResourceManager during resource pressure
 * - Provides recommendations for manual optimization decisions
 * - Coordinates with specialized optimizers for comprehensive optimization
 * 
 * ## Performance Impact
 * - Optimizations are designed to improve overall system performance
 * - Resource adjustments are made gradually to avoid service disruption
 * - Cleanup operations are performed efficiently with minimal system impact
 */

import {
  ResourceOptimizer,
  ResourceMetrics,
  OptimizationRecommendation
} from './types/resource';
import { DefaultBrowserPoolOptimizer } from './browser-pool-optimizer';
import { DefaultDiskSpaceManager } from './disk-space-manager';
import { DefaultNetworkOptimizer } from './network-optimizer';
import { DefaultCleanupManager } from './cleanup-manager';

export class DefaultResourceOptimizer implements ResourceOptimizer {
  private browserPoolOptimizer: DefaultBrowserPoolOptimizer;
  private diskSpaceManager: DefaultDiskSpaceManager;
  private networkOptimizer: DefaultNetworkOptimizer;

  constructor() {
    this.browserPoolOptimizer = new DefaultBrowserPoolOptimizer();
    this.diskSpaceManager = new DefaultDiskSpaceManager();
    this.networkOptimizer = new DefaultNetworkOptimizer();
  }

  async optimizeBrowserPoolSize(metrics: ResourceMetrics): Promise<number> {
    const optimalSize = this.browserPoolOptimizer.calculateOptimalPoolSize(metrics);
    const resourceAdjustedSize = this.adjustPoolSizeForResources(optimalSize, metrics);

    console.info(`Browser pool optimization: Current=${metrics.browserInstances}, Optimal=${resourceAdjustedSize}`);
    return resourceAdjustedSize;
  }

  async cleanupTemporaryFiles(): Promise<void> {
    const diskUsage = await this.diskSpaceManager.getTotalDiskUsage();

    if (diskUsage > 0.8) {
      console.info('High disk usage detected, performing aggressive cleanup');
      await this.diskSpaceManager.cleanupOldTempFiles(60 * 60 * 1000);
      await this.diskSpaceManager.cleanupLargeTempFiles(50);
    } else {
      await this.diskSpaceManager.cleanupOldTempFiles(24 * 60 * 60 * 1000);
    }

    const cleanupManager = new DefaultCleanupManager();
    await cleanupManager.cleanupBrowserResources();
  }

  async optimizeNetworkUsage(): Promise<void> {
    await this.networkOptimizer.optimizeBandwidthUsage();
    await this.networkOptimizer.enableCompressionStrategies();
    await this.networkOptimizer.optimizeResourceLoading();
  }

  getOptimizationRecommendations(metrics: ResourceMetrics): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    if (metrics.memoryUsage > 0.8) {
      recommendations.push({
        type: 'memory',
        action: 'Reduce browser pool size and enable garbage collection',
        priority: 'high',
        estimatedImpact: 'Reduce memory usage by 20-30%'
      });
    }

    if (metrics.browserInstances > 3 && metrics.activeRequests < 2) {
      recommendations.push({
        type: 'browser_pool',
        action: 'Reduce browser pool size due to low utilization',
        priority: 'medium',
        estimatedImpact: 'Reduce memory usage by 15-25%'
      });
    }

    if (metrics.diskUsage > 0.7) {
      recommendations.push({
        type: 'disk',
        action: 'Clean up temporary files and browser cache',
        priority: 'medium',
        estimatedImpact: 'Free up 10-20% disk space'
      });
    }

    if (metrics.activeRequests > 5) {
      recommendations.push({
        type: 'network',
        action: 'Enable request throttling to reduce network pressure',
        priority: 'low',
        estimatedImpact: 'Improve response times by 10-15%'
      });
    }

    return recommendations;
  }

  private adjustPoolSizeForResources(baseSize: number, metrics: ResourceMetrics): number {
    let adjustedSize = baseSize;

    if (metrics.memoryUsage > 0.8) {
      adjustedSize = Math.max(1, Math.floor(adjustedSize * 0.5));
    } else if (metrics.memoryUsage > 0.6) {
      adjustedSize = Math.max(1, Math.floor(adjustedSize * 0.7));
    }

    if (metrics.cpuUsage > 0.8) {
      adjustedSize = Math.max(1, Math.floor(adjustedSize * 0.6));
    }

    if (metrics.diskUsage > 0.9) {
      adjustedSize = Math.max(1, Math.floor(adjustedSize * 0.5));
    }

    return adjustedSize;
  }
}