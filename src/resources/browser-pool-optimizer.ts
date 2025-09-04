// Browser Pool Optimizer Implementation

import { BrowserPoolOptimizer, ResourceMetrics } from './types/resource';

export class DefaultBrowserPoolOptimizer implements BrowserPoolOptimizer {
  private readonly minPoolSize = 1;
  private readonly maxPoolSize = 4;
  private readonly optimalMemoryUsage = 0.6;
  private readonly resourceThresholds = {
    memoryHigh: 0.8,
    memoryMedium: 0.6,
    cpuHigh: 0.8,
    cpuMedium: 0.6,
    diskHigh: 0.9,
    diskMedium: 0.7
  };

  calculateOptimalPoolSize(metrics: ResourceMetrics): number {
    const baseSize = this.calculateBasePoolSize(metrics);
    const resourceConstraints = this.calculateResourceConstraints(metrics);
    const loadFactor = this.calculateLoadFactor(metrics);

    const optimalSize = Math.floor(baseSize * resourceConstraints * loadFactor);
    const finalSize = Math.max(this.minPoolSize, Math.min(this.maxPoolSize, optimalSize));

    console.debug(`Pool size calculation: base=${baseSize}, constraints=${resourceConstraints}, load=${loadFactor}, final=${finalSize}`);
    return finalSize;
  }

  shouldExpandPool(metrics: ResourceMetrics): boolean {
    return (
      metrics.memoryUsage < this.optimalMemoryUsage &&
      metrics.activeRequests > metrics.browserInstances * 2 &&
      metrics.browserInstances < this.maxPoolSize
    );
  }

  shouldShrinkPool(metrics: ResourceMetrics): boolean {
    if (metrics.browserInstances <= this.minPoolSize) {
      return false;
    }

    return (
      metrics.memoryUsage > 0.8 ||
      metrics.activeRequests < metrics.browserInstances
    );
  }

  private calculateBasePoolSize(metrics: ResourceMetrics): number {
    if (metrics.activeRequests === 0) {
      return 1;
    }

    const requestsPerBrowser = 2;
    return Math.ceil(metrics.activeRequests / requestsPerBrowser);
  }

  private calculateResourceConstraints(metrics: ResourceMetrics): number {
    let constraintFactor = 1.0;

    if (metrics.memoryUsage > this.resourceThresholds.memoryHigh) {
      constraintFactor *= 0.4;
    } else if (metrics.memoryUsage > this.resourceThresholds.memoryMedium) {
      constraintFactor *= 0.7;
    }

    if (metrics.cpuUsage > this.resourceThresholds.cpuHigh) {
      constraintFactor *= 0.5;
    } else if (metrics.cpuUsage > this.resourceThresholds.cpuMedium) {
      constraintFactor *= 0.8;
    }

    if (metrics.diskUsage > this.resourceThresholds.diskHigh) {
      constraintFactor *= 0.6;
    } else if (metrics.diskUsage > this.resourceThresholds.diskMedium) {
      constraintFactor *= 0.9;
    }

    return Math.max(0.2, constraintFactor);
  }

  private calculateLoadFactor(metrics: ResourceMetrics): number {
    const currentUtilization = metrics.browserInstances > 0
      ? metrics.activeRequests / metrics.browserInstances
      : 0;

    if (currentUtilization > 3) {
      return 1.3;
    } else if (currentUtilization > 2) {
      return 1.1;
    } else if (currentUtilization < 0.5 && metrics.browserInstances > 1) {
      return 0.7;
    }

    return 1.0;
  }
}