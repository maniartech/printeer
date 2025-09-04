// Resources domain - Resource handling and validation

// Export main resource management classes
export {
  DefaultResourceManager,
  DefaultResourceLimitEnforcer,
  DefaultDegradationStrategy,
  DefaultResourceOptimizer,
  DefaultBrowserPoolOptimizer,
  DefaultDiskSpaceManager,
  DefaultCleanupManager,
  DefaultNetworkOptimizer
} from './resource';

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