# Configuration System

The printeer configuration system provides flexible, environment-aware configuration management with support for multiple configuration sources and hot-reloading in long-running mode.

## Environment Detection

The system automatically detects the current environment based on various indicators:

### Environment Types
- **Development**: Default environment for local development
- **Production**: Detected from production indicators (PM2, Kubernetes, Docker, cloud platforms)
- **Test**: Detected from testing frameworks (CI, Vitest, Jest)

### Detection Logic
1. `NODE_ENV` environment variable (highest priority)
2. Test framework indicators (`CI`, `VITEST`, `JEST_WORKER_ID`)
3. Production platform indicators (`PM2_HOME`, `KUBERNETES_SERVICE_HOST`, `DOCKER_CONTAINER`, etc.)
4. Defaults to `development`

## Configuration Sources

Configuration is loaded from multiple sources in order of priority (highest to lowest):

1. **CLI Arguments** - Passed directly to the configuration loader
2. **Environment Variables** - Prefixed with `PRINTEER_`
3. **Project Configuration Files** - `.printeerrc.json`, `printeer.config.json`, `config.json`
4. **User Configuration File** - `~/.printeer/config.json`
5. **Default Configuration** - Environment-specific defaults

## Environment Variables

All configuration options can be set via environment variables with the `PRINTEER_` prefix:

### Operation Mode
- `PRINTEER_MODE`: `single-shot` or `long-running`
- `PRINTEER_ENVIRONMENT`: `development`, `production`, or `test`

### Browser Configuration
- `PRINTEER_BROWSER_EXECUTABLE_PATH`: Path to browser executable
- `PRINTEER_BROWSER_HEADLESS`: `true`, `false`, or `auto`
- `PRINTEER_BROWSER_TIMEOUT`: Timeout in milliseconds
- `PRINTEER_BROWSER_ARGS`: Comma-separated browser arguments
- `PRINTEER_BROWSER_POOL_MIN`: Minimum browser pool size
- `PRINTEER_BROWSER_POOL_MAX`: Maximum browser pool size
- `PRINTEER_BROWSER_POOL_IDLE_TIMEOUT`: Pool idle timeout in milliseconds

### Resource Limits
- `PRINTEER_MAX_MEMORY_MB`: Maximum memory usage in MB
- `PRINTEER_MAX_CPU_PERCENT`: Maximum CPU usage percentage
- `PRINTEER_MAX_DISK_MB`: Maximum disk usage in MB
- `PRINTEER_MAX_CONCURRENT_REQUESTS`: Maximum concurrent requests

### Long-Running Mode
- `PRINTEER_COOLING_PERIOD_MS`: Cooling period before shutdown in milliseconds
- `PRINTEER_HEALTH_CHECK_INTERVAL`: Health check interval in milliseconds
- `PRINTEER_MAX_UPTIME`: Maximum uptime in milliseconds

### Logging
- `PRINTEER_LOG_LEVEL`: `error`, `warn`, `info`, or `debug`
- `PRINTEER_LOG_FORMAT`: `json` or `text`
- `PRINTEER_LOG_DESTINATION`: `console`, `file`, or `both`

### Security
- `PRINTEER_ALLOWED_DOMAINS`: Comma-separated list of allowed domains
- `PRINTEER_BLOCKED_DOMAINS`: Comma-separated list of blocked domains
- `PRINTEER_MAX_FILE_SIZE`: Maximum file size in bytes
- `PRINTEER_SANITIZE_INPUT`: `true` or `false`

## Configuration Files

### Project Configuration
Create a configuration file in your project root:

```json
{
  "mode": "long-running",
  "environment": "production",
  "browser": {
    "headless": true,
    "timeout": 30000,
    "args": ["--no-sandbox", "--disable-dev-shm-usage"],
    "pool": {
      "min": 2,
      "max": 8,
      "idleTimeout": 300000
    }
  },
  "resources": {
    "maxMemoryMB": 2048,
    "maxCpuPercent": 80,
    "maxDiskMB": 1000,
    "maxConcurrentRequests": 20
  },
  "logging": {
    "level": "info",
    "format": "json",
    "destination": "console"
  }
}
```

### User Configuration
Create a global configuration file at `~/.printeer/config.json` for user-specific defaults.

## Hot-Reloading

In long-running mode, the configuration system supports hot-reloading:

```typescript
import { configManager } from './config';

// Load initial configuration
await configManager.load();

// Enable hot-reloading for long-running mode
await configManager.enableHotReload();

// Listen for configuration changes
configManager.onConfigChange(() => {
  console.log('Configuration reloaded');
});

// Cleanup when shutting down
await configManager.cleanup();
```

### Hot-Reload Features
- Watches project and user configuration files for changes
- Debounced reloading (500ms) to prevent excessive reloads
- Automatic cleanup of file watchers
- Error handling for file system issues

## Usage Examples

### Basic Usage
```typescript
import { ConfigurationLoader, PrinteerConfigurationManager } from './config';

// Load configuration from all sources
const config = await ConfigurationLoader.loadConfiguration();

// Use configuration manager
const manager = new PrinteerConfigurationManager();
await manager.load();

const browserTimeout = manager.get<number>('browser.timeout');
const logLevel = manager.get<string>('logging.level');
```

### Environment Detection
```typescript
import { EnvironmentDetector } from './config';

const environment = EnvironmentDetector.detectEnvironment();
const isContainer = EnvironmentDetector.isContainerEnvironment();
const isHeadless = EnvironmentDetector.isHeadlessEnvironment();
const isCloud = EnvironmentDetector.isCloudEnvironment();
```

### Configuration Validation
```typescript
const manager = new PrinteerConfigurationManager();
await manager.load();

const validation = manager.validate();
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
  console.warn('Configuration warnings:', validation.warnings);
}
```

## Default Configurations

### Development Environment
- Headless mode: `auto` (windowed if display available)
- Browser pool: 0-2 instances
- Memory limit: 512MB
- Log level: `debug`
- Log format: `text`

### Production Environment
- Headless mode: `true`
- Browser pool: 1-5 instances
- Memory limit: 1024MB
- Log level: `info`
- Log format: `json`
- Additional browser security arguments

### Test Environment
- Headless mode: `true`
- Browser timeout: 10 seconds
- Memory limit: 512MB
- Log level: `error`
- Reduced resource limits for faster testing