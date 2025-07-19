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