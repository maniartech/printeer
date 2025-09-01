// Production validation and monitoring for resource optimization
// This ensures the optimization strategies work correctly in production

import * as os from 'os';
import { ResourceMetrics, ResourcePressure } from '../types/resource';
import { DefaultResourceManager } from './resource';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metrics?: ResourceMetrics;
}

export interface ProductionHealthCheck {
  timestamp: Date;
  systemHealth: ValidationResult;
  optimizationHealth: ValidationResult;
  recommendations: string[];
}

export class ResourceValidator {
  private resourceManager: DefaultResourceManager;

  constructor() {
    this.resourceManager = new DefaultResourceManager();
  }

  /**
   * Validates that resource monitoring is working correctly in production
   */
  async validateResourceMonitoring(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Test basic metrics collection
      const metrics = await this.resourceManager.getLatestMetrics();
      
      // Validate memory metrics
      if (metrics.memoryUsage < 0 || metrics.memoryUsage > 1) {
        errors.push(`Invalid memory usage: ${metrics.memoryUsage}. Should be between 0 and 1.`);
      }
      
      // Validate CPU metrics
      if (metrics.cpuUsage < 0 || metrics.cpuUsage > 1) {
        errors.push(`Invalid CPU usage: ${metrics.cpuUsage}. Should be between 0 and 1.`);
      }
      
      // Validate disk metrics
      if (metrics.diskUsage < 0 || metrics.diskUsage > 1) {
        errors.push(`Invalid disk usage: ${metrics.diskUsage}. Should be between 0 and 1.`);
      }
      
      // Check if metrics are realistic
      const totalMemoryGB = os.totalmem() / (1024 * 1024 * 1024);
      if (totalMemoryGB < 0.5) {
        warnings.push(`Very low total memory detected: ${totalMemoryGB.toFixed(2)}GB`);
      }
      
      // Validate timestamp
      const now = Date.now();
      const metricsTime = metrics.timestamp.getTime();
      if (Math.abs(now - metricsTime) > 60000) { // More than 1 minute old
        warnings.push(`Metrics timestamp is stale: ${new Date(metricsTime).toISOString()}`);
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metrics
      };
      
    } catch (error) {
      errors.push(`Failed to collect metrics: ${error instanceof Error ? error.message : String(error)}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Validates that resource optimization is working correctly
   */
  async validateResourceOptimization(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const metrics = await this.resourceManager.getLatestMetrics();
      
      // Test browser pool optimization
      const optimalPoolSize = await this.resourceManager.getOptimalBrowserPoolSize();
      if (optimalPoolSize < 1 || optimalPoolSize > 10) {
        errors.push(`Invalid optimal pool size: ${optimalPoolSize}. Should be between 1 and 10.`);
      }
      
      // Test optimization recommendations
      const recommendations = this.resourceManager.getOptimizationRecommendations();
      if (!Array.isArray(recommendations)) {
        errors.push('Optimization recommendations should return an array');
      }
      
      // Validate recommendation structure
      for (const rec of recommendations) {
        if (!rec.type || !rec.action || !rec.priority || !rec.estimatedImpact) {
          errors.push(`Invalid recommendation structure: ${JSON.stringify(rec)}`);
        }
        
        if (!['browser_pool', 'memory', 'disk', 'network'].includes(rec.type)) {
          errors.push(`Invalid recommendation type: ${rec.type}`);
        }
        
        if (!['low', 'medium', 'high'].includes(rec.priority)) {
          errors.push(`Invalid recommendation priority: ${rec.priority}`);
        }
      }
      
      // Test resource pressure detection
      const pressure = this.resourceManager.checkResourcePressure();
      if (typeof pressure.overall !== 'boolean') {
        errors.push('Resource pressure detection should return boolean values');
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metrics
      };
      
    } catch (error) {
      errors.push(`Failed to validate optimization: ${error instanceof Error ? error.message : String(error)}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Performs a comprehensive health check for production use
   */
  async performHealthCheck(): Promise<ProductionHealthCheck> {
    const systemHealth = await this.validateResourceMonitoring();
    const optimizationHealth = await this.validateResourceOptimization();
    
    const recommendations: string[] = [];
    
    // Generate recommendations based on validation results
    if (systemHealth.metrics) {
      const metrics = systemHealth.metrics;
      
      if (metrics.memoryUsage > 0.8) {
        recommendations.push('High memory usage detected. Consider reducing browser pool size or restarting the service.');
      }
      
      if (metrics.cpuUsage > 0.8) {
        recommendations.push('High CPU usage detected. Consider throttling requests or scaling horizontally.');
      }
      
      if (metrics.diskUsage > 0.9) {
        recommendations.push('Critical disk usage detected. Immediate cleanup required.');
      }
      
      if (metrics.browserInstances > 4) {
        recommendations.push('High number of browser instances. Consider optimizing pool size.');
      }
      
      if (metrics.activeRequests > 10) {
        recommendations.push('High request load detected. Consider implementing request queuing.');
      }
    }
    
    // Add system-specific recommendations
    const totalMemoryGB = os.totalmem() / (1024 * 1024 * 1024);
    if (totalMemoryGB < 2) {
      recommendations.push('Low system memory. Consider upgrading hardware or reducing resource limits.');
    }
    
    return {
      timestamp: new Date(),
      systemHealth,
      optimizationHealth,
      recommendations
    };
  }

  /**
   * Validates that cleanup operations work correctly
   */
  async validateCleanupOperations(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Test that cleanup methods don't throw errors
      await this.resourceManager.optimizeResources();
      
      // Test resource limits enforcement
      await this.resourceManager.enforceResourceLimits();
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
      
    } catch (error) {
      errors.push(`Cleanup validation failed: ${error instanceof Error ? error.message : String(error)}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.resourceManager.cleanup();
  }
}

/**
 * Production monitoring utility
 */
export class ProductionMonitor {
  private validator: ResourceValidator;
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private healthHistory: ProductionHealthCheck[] = [];
  private readonly maxHistorySize = 100;

  constructor() {
    this.validator = new ResourceValidator();
  }

  /**
   * Start continuous production monitoring
   */
  startMonitoring(intervalMs: number = 300000): void { // Default 5 minutes
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        const healthCheck = await this.validator.performHealthCheck();
        this.addHealthCheck(healthCheck);
        
        // Log critical issues
        if (!healthCheck.systemHealth.isValid || !healthCheck.optimizationHealth.isValid) {
          console.error('Production health check failed:', {
            systemErrors: healthCheck.systemHealth.errors,
            optimizationErrors: healthCheck.optimizationHealth.errors
          });
        }
        
        // Log warnings
        const allWarnings = [
          ...healthCheck.systemHealth.warnings,
          ...healthCheck.optimizationHealth.warnings
        ];
        
        if (allWarnings.length > 0) {
          console.warn('Production health warnings:', allWarnings);
        }
        
        // Log recommendations
        if (healthCheck.recommendations.length > 0) {
          console.info('Production recommendations:', healthCheck.recommendations);
        }
        
      } catch (error) {
        console.error('Production monitoring error:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Get current health status
   */
  async getCurrentHealth(): Promise<ProductionHealthCheck> {
    return await this.validator.performHealthCheck();
  }

  /**
   * Get health history
   */
  getHealthHistory(): ProductionHealthCheck[] {
    return [...this.healthHistory];
  }

  /**
   * Get health summary
   */
  getHealthSummary(): {
    totalChecks: number;
    successfulChecks: number;
    failedChecks: number;
    successRate: number;
    commonIssues: string[];
  } {
    const totalChecks = this.healthHistory.length;
    const successfulChecks = this.healthHistory.filter(
      check => check.systemHealth.isValid && check.optimizationHealth.isValid
    ).length;
    
    const failedChecks = totalChecks - successfulChecks;
    const successRate = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0;
    
    // Collect common issues
    const allErrors = this.healthHistory.flatMap(check => [
      ...check.systemHealth.errors,
      ...check.optimizationHealth.errors
    ]);
    
    const errorCounts = allErrors.reduce((acc, error) => {
      acc[error] = (acc[error] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const commonIssues = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([error, count]) => `${error} (${count} times)`);
    
    return {
      totalChecks,
      successfulChecks,
      failedChecks,
      successRate,
      commonIssues
    };
  }

  private addHealthCheck(healthCheck: ProductionHealthCheck): void {
    this.healthHistory.push(healthCheck);
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopMonitoring();
    await this.validator.cleanup();
  }
}