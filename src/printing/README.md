# Printing Package

The **Printing** package is the core component of Printeer responsible for browser management and HTML-to-PDF/PNG conversion. It provides a robust, production-ready infrastructure for high-throughput document generation with intelligent browser pool management, environment detection, and comprehensive error handling.

## Table of Contents

- [Overview](#overview)
- [Core Components](#core-components)
- [Browser Management](#browser-management)
- [Conversion System](#conversion-system)
- [Type Definitions](#type-definitions)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [Environment Support](#environment-support)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)
- [API Reference](#api-reference)

## Overview

The printing package consists of three main domains:

1. **Browser Management** - Efficient browser pool management with health monitoring
2. **Conversion Pipeline** - HTML-to-PDF/PNG conversion with customizable options
3. **Service Layer** - High-level service interfaces for application integration

## Core Components

### Browser Management Classes

#### `DefaultBrowserManager`

A sophisticated browser pool manager that handles the lifecycle of Puppeteer browser instances.

**Key Features:**

- Dynamic browser pool with configurable min/max sizes
- Health monitoring and automatic recovery
- Intelligent browser reuse based on usage patterns
- Graceful shutdown with proper resource cleanup
- Comprehensive metrics tracking

#### `DefaultBrowserFactory`

Factory class responsible for creating and configuring browser instances with environment-specific optimizations.

**Key Features:**

- Automatic system browser detection (Chrome/Chromium)
- Environment-aware configuration (Docker, headless servers, root users)
- Multiple fallback configurations for reliability
- Browser validation and version detection

### Conversion System

#### `DefaultConverter`

The main conversion engine that transforms HTML content to PDF or PNG format.

**Key Features:**

- Support for PDF and PNG output formats
- Customizable render options (quality, margins, viewport)
- Input validation and error handling
- Conversion metrics and performance tracking

## Browser Management

### Browser Pool Architecture

The browser pool maintains a collection of browser instances in different states:

- **Available Pool**: Ready-to-use browser instances
- **Busy Pool**: Currently processing conversion requests
- **Health Monitoring**: Regular checks for browser responsiveness

### Pool Configuration

```typescript
const poolConfig = {
  minSize: 1,        // Minimum browsers in pool
  maxSize: 5,        // Maximum browsers in pool
  idleTimeout: 30000, // Browser idle timeout (ms)
  cleanupInterval: 60000 // Cleanup interval (ms)
};

const manager = new DefaultBrowserManager(factory, poolConfig);
```

### Environment Detection

The factory automatically detects and optimizes for various environments:

- **Docker Containers**: Applies container-specific optimizations
- **Root Users**: Automatically disables sandbox mode
- **Headless Servers**: Optimizes for server environments
- **CI/CD Systems**: Uses test-friendly configurations

## HTML-to-Document Conversion

### Supported Output Formats

- **PDF**: High-quality PDF generation with custom margins, formats
- **PNG**: Screenshot generation with customizable quality and dimensions

### Render Options

```typescript
interface RenderOptions {
  waitUntil?: 'load' | 'networkidle0' | 'networkidle2';
  timeout?: number;
  quality?: number;        // For PNG: 0-100
  format?: string;         // PDF format (A4, Letter, etc.)
  margin?: Margin;         // PDF margins
  fullPage?: boolean;      // Full page capture
  omitBackground?: boolean; // Transparent background
}
```

## Type Definitions

### Browser Types

```typescript
interface BrowserInstance {
  id: string;
  browser: Browser;
  createdAt: Date;
  lastUsed: Date;
  isHealthy: boolean;
  processId?: number;
}

interface PoolStatus {
  totalBrowsers: number;
  availableBrowsers: number;
  busyBrowsers: number;
  healthyBrowsers: number;
  unhealthyBrowsers: number;
  uptime: number;
  metrics: BrowserPoolMetrics;
}
```

### Conversion Types

```typescript
interface PrinteerOptions {
  url: string;
  outputFile: string;
  outputType?: 'pdf' | 'png';
  browserOptions?: BrowserOptions;
  renderOptions?: RenderOptions;
}

interface ConversionResult {
  outputFile: string;
  outputType: 'pdf' | 'png';
  fileSize: number;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: ConversionMetadata;
}
```

### Service Types

```typescript
interface PrinteerService {
  start(): Promise<void>;
  convert(options: PrinteerOptions): Promise<ConversionResult>;
  doctor(): Promise<DiagnosticResult[]>;
  stop(): Promise<void>;
  getStatus(): ServiceStatus;
  isHealthy(): boolean;
}
```

## Usage Examples

### Basic Browser Manager Usage

```typescript
import { DefaultBrowserManager, DefaultBrowserFactory } from '@/printing';

// Initialize browser manager
const factory = new DefaultBrowserFactory();
const manager = new DefaultBrowserManager(factory, {
  minSize: 2,
  maxSize: 10,
  idleTimeout: 60000
});

await manager.initialize();

// Get a browser for conversion
const browserInstance = await manager.getBrowser();

try {
  // Use browser for conversion
  const page = await browserInstance.browser.newPage();
  await page.goto('https://example.com');
  const pdf = await page.pdf({ format: 'A4' });
  await page.close();
} finally {
  // Always release browser back to pool
  await manager.releaseBrowser(browserInstance);
}

// Shutdown when done
await manager.shutdown();
```

### Conversion with Custom Options

```typescript
import { DefaultConverter } from '@/printing';

const converter = new DefaultConverter();

const options = {
  url: 'https://example.com',
  outputFile: './output.pdf',
  outputType: 'pdf' as const,
  browserOptions: {
    viewport: { width: 1920, height: 1080 },
    timeout: 30000
  },
  renderOptions: {
    format: 'A4',
    margin: { top: '1in', bottom: '1in' },
    waitUntil: 'networkidle2' as const
  }
};

const result = await converter.convert(options);
console.log(`Generated ${result.outputType} (${result.fileSize} bytes) in ${result.duration}ms`);
```

### Service Integration

```typescript
import { PrinteerService } from '@/printing/types';

// Service implementation would be provided by the main Printeer class
const service: PrinteerService = createPrinteerService(config);

await service.start();

// Check service health
if (service.isHealthy()) {
  const result = await service.convert({
    url: 'https://example.com',
    outputFile: './document.pdf'
  });
  
  console.log('Conversion successful:', result.success);
}

// Run diagnostics
const diagnostics = await service.doctor();
diagnostics.forEach(diag => {
  console.log(`${diag.component}: ${diag.status} - ${diag.message}`);
});

await service.stop();
```

## Configuration

### Browser Factory Configuration

```typescript
const factoryConfig = {
  headless: true,
  timeout: 30000,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
  executablePath: '/path/to/chrome' // Optional custom path
};

const factory = new DefaultBrowserFactory(factoryConfig);
```

### Environment Variables

- `PRINTEER_BUNDLED_ONLY=1`: Force use of bundled Chromium only
- `PUPPETEER_EXECUTABLE_PATH`: Custom browser executable path
- `NODE_ENV=test`: Enables test-specific optimizations

## Environment Support

### Supported Platforms

- **Windows**: Full support with automatic Chrome detection
- **macOS**: Native support with system browser detection
- **Linux**: Comprehensive support including headless servers
- **Docker**: Container-optimized configurations

### Container Optimizations

When running in Docker containers, the system automatically applies:

- Sandbox disabling for security restrictions
- Memory usage optimizations (`--disable-dev-shm-usage`)
- GPU acceleration disabling
- Process isolation configurations

## Error Handling

### Browser Creation Fallbacks

The factory implements multiple fallback strategies:

1. **Standard Configuration**: Basic Chrome/Chromium launch
2. **Minimal Configuration**: Reduced feature set for compatibility
3. **Container-Optimized**: Docker/container specific optimizations
4. **Headless Server**: Server environment optimizations

### Health Monitoring

Browsers are continuously monitored for:

- Process health and responsiveness
- Connection status
- Functional validation (page navigation and evaluation)
- Memory usage and performance

### Recovery Mechanisms

- Automatic browser replacement when health checks fail
- Emergency browser creation when pool is empty
- Graceful degradation during resource constraints

## Performance Optimization

### Pool Management

- **Intelligent Reuse**: Most recently used browsers are prioritized
- **Lazy Cleanup**: Idle browsers are removed during maintenance cycles
- **Warm-up Strategy**: Pre-creates minimum browsers for immediate availability

### Resource Management

- **Process Tracking**: Monitors browser process IDs for cleanup
- **Memory Optimization**: Container-specific memory usage reductions
- **Network Optimization**: Configurable network idle detection

### Metrics Tracking

The system tracks comprehensive metrics:

```typescript
interface BrowserPoolMetrics {
  created: number;      // Total browsers created
  destroyed: number;    // Total browsers destroyed
  reused: number;       // Browser reuse count
  errors: number;       // Error occurrences
}

interface ConversionMetrics {
  totalConversions: number;
  successfulConversions: number;
  failedConversions: number;
  averageDuration: number;
  totalProcessingTime: number;
  lastConversion?: Date;
}
```

## API Reference

### BrowserManager Interface

```typescript
interface BrowserManager {
  initialize(): Promise<void>;
  getBrowser(): Promise<BrowserInstance>;
  releaseBrowser(browser: BrowserInstance): Promise<void>;
  shutdown(): Promise<void>;
  getPoolStatus(): PoolStatus;
  warmUp(): Promise<void>;
}
```

### BrowserFactory Interface

```typescript
interface BrowserFactory {
  createBrowser(): Promise<Browser>;
  validateBrowser(browser: Browser): Promise<boolean>;
  getBrowserVersion(browser: Browser): Promise<string>;
  getOptimalLaunchOptions(): PuppeteerLaunchOptions;
}
```

### Converter Interface

```typescript
interface Converter {
  convert(options: PrinteerOptions): Promise<ConversionResult>;
  validateOptions(options: PrinteerOptions): Promise<boolean>;
}
```

## Best Practices

### Resource Management Guidelines

1. **Always release browsers**: Use try/finally blocks to ensure browser release
2. **Monitor pool status**: Check pool health regularly in production
3. **Configure appropriate limits**: Set reasonable min/max pool sizes
4. **Handle shutdown gracefully**: Always call shutdown() during application termination

### Error Handling Best Practices

1. **Validate inputs**: Use validateOptions() before conversion
2. **Handle timeouts**: Set appropriate timeout values for your use case
3. **Monitor metrics**: Track error rates and performance metrics
4. **Implement retries**: Consider retry logic for transient failures

### Performance

1. **Warm up pools**: Pre-initialize browsers for better response times
2. **Reuse browsers**: Leverage the pool for multiple conversions
3. **Optimize render options**: Use appropriate waitUntil strategies
4. **Monitor resource usage**: Track memory and CPU usage in production

## Dependencies

- **Puppeteer**: Browser automation and control
- **Node.js**: File system and OS utilities
- **Internal Types**: Configuration and diagnostic interfaces

## Testing Support

The package includes comprehensive test support with:

- Mock implementations for all interfaces
- Test-specific browser configurations
- Bundled Chromium usage for CI/CD environments
- Configurable timeouts for test reliability

---

*This package is part of the Printeer document generation system. For complete documentation and examples, visit the main Printeer repository.*
