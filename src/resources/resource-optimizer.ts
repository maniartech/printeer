// Resource Optimizer Implementation

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