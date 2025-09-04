/**
 * # Browser Pool Optimizer - Intelligent Browser Instance Management
 * 
 * ## Purpose
 * The DefaultBrowserPoolOptimizer provides intelligent management of browser instances
 * for PDF generation, optimizing the balance between performance and resource consumption.
 * 
 * ## Core Objectives
 * 1. **Dynamic Pool Sizing**: Automatically adjust browser instance count based on load
 * 2. **Resource-Aware Scaling**: Consider memory, CPU, and disk constraints in decisions
 * 3. **Performance Optimization**: Maintain optimal response times while minimizing resource usage
 * 4. **Load Balancing**: Distribute requests efficiently across available browser instances
 * 
 * ## Optimization Algorithm
 * 
 * ### Multi-Factor Calculation
 * The optimal pool size is determined by combining three key factors:
 * 
 * 1. **Base Size Calculation**
 *    - Derived from current request load and target requests-per-browser ratio
 *    - Ensures sufficient capacity for current demand
 * 
 * 2. **Resource Constraints**
 *    - Memory pressure: Reduces pool size when memory usage is high
 *    - CPU pressure: Limits concurrent browser operations
 *    - Disk pressure: Prevents excessive temporary file creation
 * 
 * 3. **Load Factor Adjustment**
 *    - High utilization: Increases pool size to handle load spikes
 *    - Low utilization: Reduces pool size to conserve resources
 *    - Balanced utilization: Maintains current pool size
 * 
 * ### Pool Size Boundaries
 * - **Minimum Pool Size**: 1 (ensures service availability)
 * - **Maximum Pool Size**: 4 (prevents resource exhaustion)
 * - **Optimal Memory Usage**: 60% (target for memory efficiency)
 * 
 * ## Decision Logic
 * 
 * ### Pool Expansion Criteria
 * - Memory usage below optimal threshold (< 60%)
 * - Active requests exceed browser capacity (> 2x browser count)
 * - Current pool size below maximum limit
 * 
 * ### Pool Shrinking Criteria
 * - Memory usage above critical threshold (> 80%)
 * - Active requests below browser count (underutilization)
 * - Pool size above minimum limit
 * 
 * ## Resource Thresholds
 * 
 * ### Memory Thresholds
 * - **High**: 80% - Aggressive pool size reduction (40% of calculated size)
 * - **Medium**: 60% - Moderate pool size reduction (70% of calculated size)
 * - **Normal**: <60% - No memory-based constraints
 * 
 * ### CPU Thresholds
 * - **High**: 80% - Significant pool size reduction (50% of calculated size)
 * - **Medium**: 60% - Moderate pool size reduction (80% of calculated size)
 * - **Normal**: <60% - No CPU-based constraints
 * 
 * ### Disk Thresholds
 * - **High**: 90% - Aggressive pool size reduction (60% of calculated size)
 * - **Medium**: 70% - Moderate pool size reduction (90% of calculated size)
 * - **Normal**: <70% - No disk-based constraints
 * 
 * ## Usage Scenarios
 * 
 * ### High-Load Periods
 * - Automatically scales up browser instances to handle increased demand
 * - Monitors resource constraints to prevent system overload
 * - Provides recommendations for manual scaling decisions
 * 
 * ### Low-Load Periods
 * - Scales down browser instances to conserve resources
 * - Maintains minimum service capacity for immediate response
 * - Optimizes resource utilization for cost efficiency
 * 
 * ### Resource-Constrained Environments
 * - Prioritizes system stability over maximum performance
 * - Implements conservative scaling to prevent resource exhaustion
 * - Provides early warnings for capacity planning
 * 
 * ## Integration Points
 * - **Resource Manager**: Provides metrics for optimization decisions
 * - **Resource Optimizer**: Coordinates with other optimization strategies
 * - **Limit Enforcer**: Ensures pool size respects system limits
 * 
 * ## Performance Characteristics
 * - Optimization calculations are lightweight and fast
 * - Pool size changes are gradual to avoid service disruption
 * - Provides detailed logging for performance analysis and debugging
 */

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