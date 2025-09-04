# Resources Domain - Comprehensive Resource Management System

## Overview

The Resources domain provides intelligent resource management for PDF generation services, ensuring optimal performance, stability, and resource utilization in production environments. This system is designed to handle high-throughput PDF generation while maintaining system health and preventing resource exhaustion.

## 🎯 Core Objectives

1. **Resource Monitoring**: Real-time tracking of system resources (CPU, memory, disk)
2. **Intelligent Optimization**: Automatic resource allocation and browser pool management
3. **Graceful Degradation**: Maintain service availability under resource pressure
4. **Cleanup Management**: Automatic cleanup of temporary files and browser resources
5. **Production Monitoring**: Health checks and validation for production deployments

## 🏗️ Architecture

### Component Overview

```
src/resources/
├── index.ts                      # Main entry point with barrel exports
├── types/
│   └── resource.ts              # Type definitions and interfaces
├── resource-manager.ts          # Central resource orchestrator
├── resource-optimizer.ts        # Intelligent optimization engine
├── resource-limit-enforcer.ts   # Resource quota management
├── degradation-strategy.ts      # Graceful service degradation
├── browser-pool-optimizer.ts    # Browser instance management
├── disk-space-manager.ts        # Disk usage optimization
├── cleanup-manager.ts           # Automated resource cleanup
├── network-optimizer.ts         # Network bandwidth optimization
└── validator.ts                 # Production health monitoring
```

### Core Components

#### 🎛️ **ResourceManager** - Central Orchestrator
- Real-time system monitoring (CPU, memory, disk)
- Resource pressure detection and notification
- Coordination of optimization strategies
- Automatic cleanup and limit enforcement

#### 🚀 **ResourceOptimizer** - Optimization Engine
- Multi-layered optimization approach (reactive, predictive, adaptive)
- Browser pool size optimization
- Disk space management coordination
- Network optimization strategies

#### 🔒 **ResourceLimitEnforcer** - Quota Management
- System resource limit enforcement
- Violation detection and response
- Graceful degradation coordination
- Multi-resource constraint handling

#### 📉 **DegradationStrategy** - Service Continuity
- Browser pool size reduction
- Rendering quality adjustment
- Request throttling implementation
- Non-essential feature disabling

## 🚀 Quick Start

### Basic Usage

```typescript
import { DefaultResourceManager } from './resources';

// Initialize resource management
const resourceManager = new DefaultResourceManager({
  memoryWarning: 0.7,    // Alert at 70% memory usage
  cpuWarning: 0.8,       // Alert at 80% CPU usage
  diskWarning: 0.9       // Alert at 90% disk usage
});

// Start monitoring
resourceManager.startMonitoring();

// Handle resource pressure
resourceManager.onResourcePressure((pressure) => {
  console.log('Resource pressure detected:', pressure);
});

// Get current metrics
const metrics = await resourceManager.getLatestMetrics();
console.log('Current system metrics:', metrics);

// Get optimization recommendations
const recommendations = resourceManager.getOptimizationRecommendations();
console.log('Optimization recommendations:', recommendations);

// Cleanup when done
await resourceManager.cleanup();
```

### Advanced Configuration

```typescript
import { 
  DefaultResourceManager,
  DefaultResourceOptimizer,
  DefaultResourceLimitEnforcer 
} from './resources';

// Custom resource limits
const resourceManager = new DefaultResourceManager(
  {
    memoryWarning: 0.6,
    memoryCritical: 0.8,
    cpuWarning: 0.7,
    cpuCritical: 0.9
  },
  {
    maxMemoryMB: 1024,
    maxCpuPercent: 60,
    maxConcurrentRequests: 10,
    maxBrowserInstances: 4
  }
);

// Enable resource limit enforcement with degradation
resourceManager.setResourceLimits({
  maxMemoryMB: 512,
  maxConcurrentRequests: 5
});

// Manual optimization
const optimizer = new DefaultResourceOptimizer();
await optimizer.optimizeBrowserPoolSize(metrics);
await optimizer.cleanupTemporaryFiles();
await optimizer.optimizeNetworkUsage();
```

## 📊 Monitoring and Metrics

### Resource Metrics

```typescript
interface ResourceMetrics {
  memoryUsage: number;      // 0-1 (percentage)
  cpuUsage: number;         // 0-1 (percentage)
  diskUsage: number;        // 0-1 (percentage)
  browserInstances: number; // Current browser count
  activeRequests: number;   // Active request count
  timestamp: Date;          // Metric timestamp
}
```

### Health Monitoring

```typescript
import { ProductionMonitor } from './resources';

const monitor = new ProductionMonitor();

// Start continuous monitoring (every 5 minutes)
monitor.startMonitoring(300000);

// Get current health status
const health = await monitor.getCurrentHealth();
console.log('System health:', health.systemHealth.isValid);
console.log('Optimization health:', health.optimizationHealth.isValid);
console.log('Recommendations:', health.recommendations);

// Get health summary
const summary = monitor.getHealthSummary();
console.log(`Success rate: ${summary.successRate}%`);
console.log('Common issues:', summary.commonIssues);
```

## 🔧 Optimization Strategies

### Browser Pool Optimization

The system automatically optimizes browser instance counts based on:

- **Current Load**: Active request count and utilization
- **Resource Constraints**: Memory, CPU, and disk pressure
- **Performance Targets**: Response time and throughput goals

```typescript
// Get optimal browser pool size
const optimalSize = await resourceManager.getOptimalBrowserPoolSize();

// Manual browser pool optimization
const browserOptimizer = new DefaultBrowserPoolOptimizer();
const shouldExpand = browserOptimizer.shouldExpandPool(metrics);
const shouldShrink = browserOptimizer.shouldShrinkPool(metrics);
```

### Cleanup Strategies

Automated cleanup of temporary resources:

- **Temporary Files**: Application and browser temporary files
- **Browser Resources**: Browser profiles, cache, and session data
- **Memory Management**: Garbage collection and memory optimization

```typescript
import { DefaultCleanupManager } from './resources';

const cleanup = new DefaultCleanupManager();

// Immediate cleanup
await cleanup.cleanupTempFiles();
await cleanup.cleanupBrowserResources();
await cleanup.cleanupMemory();

// Scheduled cleanup (every 5 minutes)
cleanup.scheduleCleanup(5 * 60 * 1000);
```

### Network Optimization

Bandwidth and resource loading optimization:

- **Bandwidth Management**: Request throttling and connection pooling
- **Compression**: Resource compression and caching strategies
- **Resource Loading**: Selective loading of essential resources

```typescript
import { DefaultNetworkOptimizer } from './resources';

const networkOptimizer = new DefaultNetworkOptimizer();

await networkOptimizer.optimizeBandwidthUsage();
await networkOptimizer.enableCompressionStrategies();
await networkOptimizer.optimizeResourceLoading();

// Check optimization status
const status = networkOptimizer.getNetworkOptimizationStatus();
```

## 🚨 Resource Pressure Handling

### Automatic Response

The system automatically responds to resource pressure:

1. **Detection**: Continuous monitoring against configurable thresholds
2. **Notification**: Alert callbacks for custom handling
3. **Optimization**: Automatic optimization strategy activation
4. **Degradation**: Graceful service degradation when necessary

### Manual Intervention

```typescript
// Check current resource pressure
const pressure = resourceManager.checkResourcePressure();
if (pressure.overall) {
  console.log('Resource pressure detected:');
  console.log('Memory pressure:', pressure.memory);
  console.log('CPU pressure:', pressure.cpu);
  console.log('Disk pressure:', pressure.disk);
}

// Manual optimization trigger
await resourceManager.optimizeResources();

// Manual limit enforcement
await resourceManager.enforceResourceLimits();
```

## 📈 Production Deployment

### Environment Configuration

#### Development Environment
```typescript
const devConfig = {
  memoryWarning: 0.8,
  cpuWarning: 0.8,
  maxMemoryMB: 1024,
  maxConcurrentRequests: 10
};
```

#### Production Environment
```typescript
const prodConfig = {
  memoryWarning: 0.6,
  cpuWarning: 0.7,
  maxMemoryMB: 512,
  maxConcurrentRequests: 5
};
```

#### Shared Hosting Environment
```typescript
const sharedConfig = {
  memoryWarning: 0.5,
  cpuWarning: 0.5,
  maxMemoryMB: 256,
  maxConcurrentRequests: 3
};
```

### Monitoring Integration

```typescript
// Integration with monitoring systems
resourceManager.onResourcePressure((pressure) => {
  // Send alerts to monitoring system
  monitoringSystem.alert('resource-pressure', pressure);
});

// Export metrics for dashboards
const metrics = resourceManager.getMetricsHistory();
metricsExporter.export(metrics);
```

## 🔍 Troubleshooting

### Common Issues

#### High Memory Usage
```typescript
// Check memory metrics
const metrics = await resourceManager.getLatestMetrics();
if (metrics.memoryUsage > 0.8) {
  // Get recommendations
  const recommendations = resourceManager.getOptimizationRecommendations();
  console.log('Memory optimization recommendations:', recommendations);
  
  // Manual cleanup
  await resourceManager.optimizeResources();
}
```

#### Browser Pool Issues
```typescript
// Check browser pool status
const browserOptimizer = new DefaultBrowserPoolOptimizer();
const optimalSize = browserOptimizer.calculateOptimalPoolSize(metrics);
console.log(`Current: ${metrics.browserInstances}, Optimal: ${optimalSize}`);

// Manual pool adjustment
if (metrics.browserInstances > optimalSize) {
  // Pool size will be adjusted automatically by resource manager
  await resourceManager.enforceResourceLimits();
}
```

#### Disk Space Issues
```typescript
import { DefaultDiskSpaceManager } from './resources';

const diskManager = new DefaultDiskSpaceManager();

// Check disk usage
const diskUsage = await diskManager.getTotalDiskUsage();
console.log(`Disk usage: ${(diskUsage * 100).toFixed(1)}%`);

// Get cleanup recommendations
const actions = await diskManager.getRecommendedCleanupActions();
console.log('Recommended cleanup actions:', actions);

// Perform cleanup
await diskManager.cleanupOldTempFiles(24 * 60 * 60 * 1000); // 24 hours
await diskManager.cleanupLargeTempFiles(50); // Files > 50MB
```

### Debug Mode

```typescript
// Enable detailed logging
process.env.NODE_ENV = 'development';

// Monitor resource changes
resourceManager.onResourcePressure((pressure) => {
  console.log('Resource pressure details:', {
    timestamp: new Date(),
    pressure,
    metrics: resourceManager.getCurrentMetrics(),
    recommendations: resourceManager.getOptimizationRecommendations()
  });
});
```

## 📋 Requirements Implementation

This system implements the following requirements:

- **Requirement 8.5**: Immediate cleanup of temporary files when disk space is limited
- **Requirement 8.6**: Network resource optimization and compression strategies  
- **Requirement 8.7**: System resource limit enforcement in shared environments

## 🧪 Testing

```bash
# Run all resource tests
npm test -- --run tests/resources

# Run specific test suites
npm test -- --run tests/resources/resource.test.ts
npm test -- --run tests/resources/resource.integration.test.ts
npm test -- --run tests/resources/resource.types.test.ts
```

## 📚 API Reference

For detailed API documentation, see the individual component files:

- [ResourceManager](./resource-manager.ts) - Central resource orchestrator
- [ResourceOptimizer](./resource-optimizer.ts) - Optimization engine
- [ResourceLimitEnforcer](./resource-limit-enforcer.ts) - Quota management
- [DegradationStrategy](./degradation-strategy.ts) - Service degradation
- [BrowserPoolOptimizer](./browser-pool-optimizer.ts) - Browser management
- [DiskSpaceManager](./disk-space-manager.ts) - Disk optimization
- [CleanupManager](./cleanup-manager.ts) - Resource cleanup
- [NetworkOptimizer](./network-optimizer.ts) - Network optimization
- [ResourceValidator](./validator.ts) - Health monitoring

## 🤝 Contributing

When contributing to the resources domain:

1. **Follow Single Responsibility**: Each class should have one clear purpose
2. **Maintain Test Coverage**: All new functionality must include tests
3. **Document Thoroughly**: Include comprehensive JSDoc documentation
4. **Consider Performance**: Optimize for production environments
5. **Handle Errors Gracefully**: Implement proper error handling and recovery

## 📄 License

This resource management system is part of the Printeer PDF generation service.