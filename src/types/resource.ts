// Resource management interfaces and types

export interface ResourceMetrics {
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  browserInstances: number;
  activeRequests: number;
  timestamp: Date;
}

export interface ResourcePressure {
  memory: boolean;
  cpu: boolean;
  disk: boolean;
  network: boolean;
  overall: boolean;
}

export interface ResourceThresholds {
  memoryWarning: number;
  memoryCritical: number;
  cpuWarning: number;
  cpuCritical: number;
  diskWarning: number;
  diskCritical: number;
}

export interface ResourceLimits {
  maxMemoryMB: number;
  maxCpuPercent: number;
  maxDiskMB: number;
  maxConcurrentRequests: number;
  maxBrowserInstances: number;
}

export interface DegradationStrategy {
  reduceBrowserPoolSize(): Promise<void>;
  reduceRenderingQuality(): Promise<void>;
  enableRequestThrottling(): Promise<void>;
  disableNonEssentialFeatures(): Promise<void>;
}

export interface ResourceLimitEnforcer {
  setLimits(limits: Partial<ResourceLimits>): void;
  getLimits(): ResourceLimits;
  checkLimitsViolation(metrics: ResourceMetrics): boolean;
  enforceLimits(metrics: ResourceMetrics): Promise<void>;
  enableGracefulDegradation(): Promise<void>;
  disableGracefulDegradation(): Promise<void>;
}

export interface ResourceOptimizer {
  optimizeBrowserPoolSize(metrics: ResourceMetrics): Promise<number>;
  cleanupTemporaryFiles(): Promise<void>;
  optimizeNetworkUsage(): Promise<void>;
  getOptimizationRecommendations(metrics: ResourceMetrics): OptimizationRecommendation[];
}

export interface OptimizationRecommendation {
  type: 'browser_pool' | 'memory' | 'disk' | 'network';
  action: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: string;
}

export interface BrowserPoolOptimizer {
  calculateOptimalPoolSize(metrics: ResourceMetrics): number;
  shouldExpandPool(metrics: ResourceMetrics): boolean;
  shouldShrinkPool(metrics: ResourceMetrics): boolean;
}

export interface DiskSpaceManager {
  getTotalDiskUsage(): Promise<number>;
  cleanupOldTempFiles(maxAgeMs: number): Promise<number>;
  cleanupLargeTempFiles(maxSizeMB: number): Promise<number>;
  getRecommendedCleanupActions(): Promise<string[]>;
}

export interface ResourceManager {
  startMonitoring(): void;
  stopMonitoring(): void;
  getCurrentMetrics(): ResourceMetrics;
  checkResourcePressure(): ResourcePressure;
  enforceResourceLimits(): Promise<void>;
  cleanup(): Promise<void>;
}

export interface CleanupManager {
  cleanupTempFiles(): Promise<void>;
  cleanupBrowserResources(): Promise<void>;
  cleanupMemory(): Promise<void>;
  scheduleCleanup(intervalMs: number): void;
  stopScheduledCleanup(): void;
}