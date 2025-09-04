// Resource Limit Enforcer Implementation

import * as os from 'os';
import {
  ResourceLimitEnforcer,
  ResourceMetrics,
  ExtendedResourceLimits
} from './types/resource';
import { DefaultDegradationStrategy } from './degradation-strategy';

export class DefaultResourceLimitEnforcer implements ResourceLimitEnforcer {
  private limits: ExtendedResourceLimits;
  private degradationStrategy: DefaultDegradationStrategy;
  private isDegradationEnabled = false;

  constructor(limits?: Partial<ExtendedResourceLimits>) {
    this.limits = {
      maxMemoryMB: 512,
      maxCpuPercent: 50,
      maxDiskMB: 1024,
      maxConcurrentRequests: 5,
      maxBrowserInstances: 2,
      ...limits
    };

    this.degradationStrategy = new DefaultDegradationStrategy();
  }

  setLimits(limits: Partial<ExtendedResourceLimits>): void {
    this.limits = { ...this.limits, ...limits };
  }

  getLimits(): ExtendedResourceLimits {
    return { ...this.limits };
  }

  checkLimitsViolation(metrics: ResourceMetrics): boolean {
    const totalMemoryMB = os.totalmem() / (1024 * 1024);
    const usedMemoryMB = metrics.memoryUsage * totalMemoryMB;

    return (
      usedMemoryMB > this.limits.maxMemoryMB ||
      metrics.cpuUsage * 100 > this.limits.maxCpuPercent ||
      metrics.activeRequests > this.limits.maxConcurrentRequests ||
      metrics.browserInstances > this.limits.maxBrowserInstances
    );
  }

  async enforceLimits(metrics: ResourceMetrics): Promise<void> {
    const totalMemoryMB = os.totalmem() / (1024 * 1024);
    const usedMemoryMB = metrics.memoryUsage * totalMemoryMB;

    if (usedMemoryMB > this.limits.maxMemoryMB) {
      await this.handleMemoryLimitViolation();
    }

    if (metrics.cpuUsage * 100 > this.limits.maxCpuPercent) {
      await this.handleCpuLimitViolation();
    }

    if (metrics.activeRequests > this.limits.maxConcurrentRequests) {
      await this.handleConcurrencyLimitViolation();
    }

    if (metrics.browserInstances > this.limits.maxBrowserInstances) {
      await this.handleBrowserLimitViolation();
    }
  }

  async enableGracefulDegradation(): Promise<void> {
    if (!this.isDegradationEnabled) {
      this.isDegradationEnabled = true;
      await this.degradationStrategy.enableRequestThrottling();
    }
  }

  async disableGracefulDegradation(): Promise<void> {
    if (this.isDegradationEnabled) {
      this.isDegradationEnabled = false;
    }
  }

  private async handleMemoryLimitViolation(): Promise<void> {
    if (global.gc) {
      global.gc();
    }

    if (this.isDegradationEnabled) {
      await this.degradationStrategy.reduceBrowserPoolSize();
    }
  }

  private async handleCpuLimitViolation(): Promise<void> {
    if (this.isDegradationEnabled) {
      await this.degradationStrategy.enableRequestThrottling();
    }
  }

  private async handleConcurrencyLimitViolation(): Promise<void> {
    if (this.isDegradationEnabled) {
      await this.degradationStrategy.enableRequestThrottling();
    }
  }

  private async handleBrowserLimitViolation(): Promise<void> {
    if (this.isDegradationEnabled) {
      await this.degradationStrategy.reduceBrowserPoolSize();
    }
  }
}