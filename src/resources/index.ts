/**
 * # Resources Domain - Comprehensive Resource Management System
 * 
 * ## Overview
 * The Resources domain provides intelligent resource management for PDF generation services,
 * ensuring optimal performance, stability, and resource utilization in production environments.
 * 
 * ## Core Objectives
 * 1. **Resource Monitoring**: Real-time tracking of system resources (CPU, memory, disk)
 * 2. **Intelligent Optimization**: Automatic resource allocation and browser pool management
 * 3. **Graceful Degradation**: Maintain service availability under resource pressure
 * 4. **Cleanup Management**: Automatic cleanup of temporary files and browser resources
 * 5. **Production Monitoring**: Health checks and validation for production deployments
 * 
 * ## Key Components
 * 
 * ### Core Management
 * - **ResourceManager**: Central orchestrator for all resource operations
 * - **ResourceOptimizer**: Intelligent optimization strategies and recommendations
 * - **ResourceValidator**: Production health checks and monitoring
 * 
 * ### Specialized Optimizers
 * - **BrowserPoolOptimizer**: Dynamic browser instance management
 * - **DiskSpaceManager**: Disk usage monitoring and cleanup strategies
 * - **NetworkOptimizer**: Network bandwidth and compression optimization
 * - **CleanupManager**: Automated cleanup of temporary resources
 * 
 * ### Resource Control
 * - **ResourceLimitEnforcer**: Enforce system resource limits and quotas
 * - **DegradationStrategy**: Graceful service degradation under pressure
 * 
 * ## Typical Workflow
 * 
 * ```typescript
 * // 1. Initialize resource management
 * const resourceManager = new DefaultResourceManager();
 * resourceManager.startMonitoring();
 * 
 * // 2. Monitor and optimize during operations
 * const metrics = await resourceManager.getLatestMetrics();
 * const recommendations = resourceManager.getOptimizationRecommendations();
 * 
 * // 3. Handle resource pressure automatically
 * resourceManager.onResourcePressure((pressure) => {
 *   console.log('Resource pressure detected:', pressure);
 * });
 * 
 * // 4. Cleanup when done
 * await resourceManager.cleanup();
 * ```
 * 
 * ## Production Usage
 * This system is designed for high-throughput PDF generation services where:
 * - Multiple browser instances need intelligent management
 * - System resources must be carefully monitored and optimized
 * - Temporary files and browser resources require automatic cleanup
 * - Service degradation should be graceful under load
 * - Production health monitoring is essential
 * 
 * ## Requirements Addressed
 * - **8.5**: Immediate cleanup of temporary files when disk space is limited
 * - **8.6**: Network resource optimization and compression strategies
 * - **8.7**: Respect for system resource limits in shared environments
 */

// Export main resource management classes
export { DefaultResourceManager } from './resource-manager';
export { DefaultResourceLimitEnforcer } from './resource-limit-enforcer';
export { DefaultDegradationStrategy } from './degradation-strategy';
export { DefaultResourceOptimizer } from './resource-optimizer';
export { DefaultBrowserPoolOptimizer } from './browser-pool-optimizer';
export { DefaultDiskSpaceManager } from './disk-space-manager';
export { DefaultCleanupManager } from './cleanup-manager';
export { DefaultNetworkOptimizer } from './network-optimizer';

// Export validation and monitoring classes
export {
  ResourceValidator,
  ProductionMonitor,
  type ValidationResult,
  type ProductionHealthCheck
} from './validator';

// Export all types and interfaces
export type {
  ResourceMetrics,
  ResourcePressure,
  ResourceThresholds,
  ExtendedResourceLimits,
  DegradationStrategy,
  ResourceLimitEnforcer,
  ResourceOptimizer,
  OptimizationRecommendation,
  BrowserPoolOptimizer,
  DiskSpaceManager,
  ResourceManager,
  CleanupManager,
  NetworkOptimizer
} from './types/resource';