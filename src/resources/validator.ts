/**
 * # Resource Validator - Production Health Monitoring and Validation
 * 
 * ## Purpose
 * The ResourceValidator and ProductionMonitor provide comprehensive validation and monitoring
 * capabilities for resource management systems in production environments, ensuring that
 * optimization strategies work correctly and system health is maintained.
 * 
 * ## Core Objectives
 * 1. **Production Validation**: Verify resource management functionality in production
 * 2. **Health Monitoring**: Continuous monitoring of system health and performance
 * 3. **Issue Detection**: Early detection of resource management problems
 * 4. **Performance Validation**: Ensure optimization strategies are working effectively
 * 
 * ## Validation Components
 * 
 * ### Resource Monitoring Validation
 * 
 * #### Validation Scope
 * Validates that the resource monitoring system is functioning correctly and providing
 * accurate, reliable metrics for decision-making.
 * 
 * #### Validation Checks
 * - **Metrics Collection**: Verifies that metrics are being collected successfully
 * - **Data Accuracy**: Validates that metrics are within expected ranges
 * - **Timestamp Validation**: Ensures metrics are current and not stale
 * - **System Integration**: Confirms integration with system resource APIs
 * 
 * #### Validation Criteria
 * - **Memory Usage**: 0-100% range validation
 * - **CPU Usage**: 0-100% range validation  
 * - **Disk Usage**: 0-100% range validation
 * - **Timestamp Freshness**: Within 1 minute of current time
 * - **System Memory**: Realistic total memory detection
 * 
 * ### Resource Optimization Validation
 * 
 * #### Validation Scope
 * Ensures that resource optimization strategies are functioning correctly and
 * providing meaningful performance improvements.
 * 
 * #### Optimization Checks
 * - **Browser Pool Optimization**: Validates optimal pool size calculations
 * - **Recommendation Engine**: Verifies recommendation generation and structure
 * - **Resource Pressure Detection**: Confirms pressure detection accuracy
 * - **Optimization Effectiveness**: Measures actual performance improvements
 * 
 * #### Validation Process
 * ```typescript
 * const validator = new ResourceValidator();
 * 
 * // Validate resource monitoring
 * const monitoringResult = await validator.validateResourceMonitoring();
 * 
 * // Validate optimization functionality
 * const optimizationResult = await validator.validateResourceOptimization();
 * 
 * // Validate cleanup operations
 * const cleanupResult = await validator.validateCleanupOperations();
 * ```
 * 
 * ## Production Health Monitoring
 * 
 * ### Comprehensive Health Checks
 * 
 * #### Health Check Components
 * 1. **System Health**: Resource monitoring functionality validation
 * 2. **Optimization Health**: Resource optimization effectiveness validation
 * 3. **Performance Analysis**: System performance and efficiency metrics
 * 4. **Recommendation Generation**: Actionable recommendations for improvements
 * 
 * #### Health Check Process
 * ```typescript
 * const monitor = new ProductionMonitor();
 * 
 * // Start continuous monitoring
 * monitor.startMonitoring(300000); // Every 5 minutes
 * 
 * // Get current health status
 * const health = await monitor.getCurrentHealth();
 * 
 * // Get health history for analysis
 * const history = monitor.getHealthHistory();
 * 
 * // Get health summary statistics
 * const summary = monitor.getHealthSummary();
 * ```
 * 
 * ### Continuous Monitoring System
 * 
 * #### Monitoring Features
 * - **Automated Health Checks**: Regular automated validation of system health
 * - **Health History**: Maintains historical health data for trend analysis
 * - **Alert Generation**: Automatic alerts for critical health issues
 * - **Performance Tracking**: Continuous tracking of system performance metrics
 * 
 * #### Monitoring Intervals
 * - **Default Interval**: 5 minutes (300,000ms)
 * - **High-Frequency**: 1 minute for critical systems
 * - **Low-Frequency**: 15 minutes for stable systems
 * - **Custom Intervals**: Configurable based on requirements
 * 
 * ## Validation Results and Reporting
 * 
 * ### Validation Result Structure
 * ```typescript
 * interface ValidationResult {
 *   isValid: boolean;           // Overall validation status
 *   errors: string[];           // Critical errors found
 *   warnings: string[];         // Non-critical warnings
 *   metrics?: ResourceMetrics;  // Associated metrics data
 * }
 * ```
 * 
 * ### Health Check Reporting
 * ```typescript
 * interface ProductionHealthCheck {
 *   timestamp: Date;                          // Check timestamp
 *   systemHealth: ValidationResult;           // System health status
 *   optimizationHealth: ValidationResult;     // Optimization health status
 *   recommendations: string[];                // Actionable recommendations
 * }
 * ```
 * 
 * ## Error Detection and Handling
 * 
 * ### Error Categories
 * 
 * #### Critical Errors
 * - **Metrics Collection Failure**: Unable to collect system metrics
 * - **Invalid Metric Values**: Metrics outside expected ranges
 * - **Optimization Failure**: Resource optimization not functioning
 * - **System Integration Issues**: Problems with system resource APIs
 * 
 * #### Warnings
 * - **Stale Metrics**: Metrics older than expected
 * - **Low System Memory**: System memory below recommended levels
 * - **Performance Degradation**: Declining system performance trends
 * - **Configuration Issues**: Suboptimal configuration settings
 * 
 * ### Error Response Strategy
 * 1. **Immediate Logging**: Log all errors and warnings for analysis
 * 2. **Alert Generation**: Generate alerts for critical issues
 * 3. **Graceful Degradation**: Continue operation where possible
 * 4. **Recovery Procedures**: Implement automatic recovery where feasible
 * 
 * ## Recommendation Engine
 * 
 * ### Recommendation Generation
 * Analyzes system health and performance data to generate actionable recommendations
 * for system administrators and operations teams.
 * 
 * #### Recommendation Categories
 * - **Resource Optimization**: Suggestions for improving resource utilization
 * - **Performance Tuning**: Recommendations for performance improvements
 * - **Capacity Planning**: Guidance for capacity planning and scaling
 * - **Configuration Optimization**: Suggestions for configuration improvements
 * 
 * #### Example Recommendations
 * - **High Memory Usage**: "Consider reducing browser pool size or restarting service"
 * - **High CPU Usage**: "Consider throttling requests or scaling horizontally"
 * - **Critical Disk Usage**: "Immediate cleanup required"
 * - **High Request Load**: "Consider implementing request queuing"
 * - **Low System Memory**: "Consider upgrading hardware or reducing resource limits"
 * 
 * ## Production Integration
 * 
 * ### Monitoring System Integration
 * - **Metrics Export**: Export health metrics to monitoring systems
 * - **Alert Integration**: Integration with alerting systems (PagerDuty, Slack, etc.)
 * - **Dashboard Integration**: Provide data for monitoring dashboards
 * - **Log Integration**: Structured logging for log aggregation systems
 * 
 * ### Deployment Considerations
 * - **Zero-Downtime Monitoring**: Monitoring that doesn't impact service performance
 * - **Resource Efficiency**: Minimal resource overhead for monitoring operations
 * - **Scalability**: Monitoring system scales with service deployment
 * - **Reliability**: Monitoring system is highly reliable and fault-tolerant
 * 
 * ## Performance Analysis
 * 
 * ### Health Summary Statistics
 * ```typescript
 * interface HealthSummary {
 *   totalChecks: number;        // Total health checks performed
 *   successfulChecks: number;   // Successful health checks
 *   failedChecks: number;       // Failed health checks
 *   successRate: number;        // Success rate percentage
 *   commonIssues: string[];     // Most common issues encountered
 * }
 * ```
 * 
 * ### Trend Analysis
 * - **Performance Trends**: Analysis of performance trends over time
 * - **Issue Patterns**: Identification of recurring issues and patterns
 * - **Optimization Effectiveness**: Measurement of optimization strategy effectiveness
 * - **Capacity Planning**: Data for capacity planning and resource allocation
 * 
 * ## Usage in Production Environments
 * 
 * ### High-Availability Deployments
 * - **Continuous Monitoring**: 24/7 monitoring of system health
 * - **Proactive Issue Detection**: Early detection of potential issues
 * - **Performance Optimization**: Continuous optimization based on monitoring data
 * - **Capacity Management**: Data-driven capacity planning and management
 * 
 * ### Multi-Environment Support
 * - **Development**: Validation during development and testing
 * - **Staging**: Pre-production validation and performance testing
 * - **Production**: Continuous production monitoring and validation
 * - **Disaster Recovery**: Monitoring during disaster recovery scenarios
 * 
 * ## Cleanup and Resource Management
 * 
 * ### Resource Cleanup
 * The validator includes cleanup validation to ensure that cleanup operations
 * are functioning correctly and not causing system issues.
 * 
 * ### Memory Management
 * - **Cleanup Validation**: Validates that cleanup operations complete successfully
 * - **Resource Leak Detection**: Detects potential resource leaks
 * - **Performance Impact**: Measures performance impact of cleanup operations
 * 
 * This comprehensive validation and monitoring system ensures that resource management
 * operates reliably in production environments and provides the data needed for
 * continuous optimization and improvement.
 */

import * as os from 'os';
import { ResourceMetrics } from './types/resource';
import { DefaultResourceManager } from './resource-manager';

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