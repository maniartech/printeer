// Resources domain - Resource handling and validation

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