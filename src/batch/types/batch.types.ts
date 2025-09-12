/**
 * Batch Processing Types
 * Type definitions for comprehensive batch processing system
 */

import type { EnhancedPrintConfiguration } from '../../config/types/enhanced-config.types';

export interface BatchJob {
  id: string;
  url: string;
  output: string;
  config?: Partial<EnhancedPrintConfiguration>;
  preset?: string;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
  priority?: number;
  dependencies?: string[];
  retryCount?: number;
  timeout?: number;
}

export interface BatchOptions {
  concurrency: number;
  retryAttempts: number;
  continueOnError: boolean;
  outputDirectory: string;
  reportFormat: 'json' | 'csv' | 'html';
  progressTracking: boolean;
  dryRun: boolean;
  maxMemoryUsage?: string;
  cleanup: boolean;
}

export interface BatchResult {
  jobId: string;
  status: 'completed' | 'failed' | 'skipped';
  startTime: Date;
  endTime: Date;
  duration: number;
  outputFile?: string;
  error?: string;
  retryCount: number;
  memoryUsed?: number;
  pageMetrics?: {
    loadTime: number;
    resourceCount: number;
    totalSize: number;
  };
}

export interface BatchData {
  metadata?: {
    name?: string;
    version?: string;
    created?: string;
    description?: string;
  };
  defaults?: Partial<BatchJob>;
  variables?: Record<string, any>;
  jobs: BatchJob[];
}

export interface BatchReport {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  skippedJobs: number;
  totalDuration: number;
  startTime: Date;
  endTime: Date;
  results: BatchResult[];
  resourceMetrics?: ResourceMetrics[];
  browserPoolMetrics?: BrowserPoolMetrics;
  optimizationInsights?: OptimizationInsights;
}

export interface ResourceMetrics {
  timestamp: Date;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  browserInstances: number;
  activeRequests: number;
}

export interface BrowserPoolMetrics {
  created: number;
  reused: number;
  errors: number;
  averageLifetime: number;
  peakConcurrency: number;
}

export interface OptimizationInsights {
  averageMemoryUsage: number;
  peakMemoryUsage: number;
  averageCpuUsage: number;
  peakCpuUsage: number;
  browserInstancesCreated: number;
  browserInstancesReused: number;
  totalBrowserErrors: number;
}

export interface ResourcePressure {
  memory: boolean;
  cpu: boolean;
  disk: boolean;
}

export class BatchValidationError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message);
    this.name = 'BatchValidationError';
  }
}

export class JobValidationError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message);
    this.name = 'JobValidationError';
  }
}

export class SkipFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkipFileError';
  }
}