# Browser Lifecycle Management

This module provides comprehensive browser lifecycle management for production environments, ensuring no zombie Chromium processes are left behind.

## The Problem

When using Puppeteer in production, especially in server environments or during testing, browser processes can become "zombies" - they continue running even after the parent process has finished. This leads to:

- **Memory leaks**: Each Chrome process can consume 50-200MB of RAM
- **Resource exhaustion**: Hundreds of zombie processes can crash servers
- **Performance degradation**: System becomes unresponsive
- **Security concerns**: Orphaned processes may expose debugging ports

## The Solution

The `BrowserLifecycleManager` provides:

1. **Automatic Registration**: All browser instances are tracked
2. **Process Monitoring**: Continuous health checks and cleanup
3. **Graceful Shutdown**: Proper browser closure with fallback force-kill
4. **Emergency Cleanup**: System-wide process cleanup capabilities
5. **CLI Tools**: Server maintenance commands

## Usage

### Basic Usage

```typescript
import { browserLifecycle } from '../core/browser-lifecycle-manager';
import puppeteer from 'puppeteer';

// Launch browser with lifecycle management
const browser = await puppeteer.launch(options);
const browserId = browserLifecycle.registerBrowser(browser);

try {
  // Use browser normally
  const page = await browser.newPage();
  // ... do work
} finally {
  // Cleanup is automatic and guaranteed
  await browserLifecycle.unregisterBrowser(browserId);
}
```

### Production Server Setup

```typescript
import { browserLifecycle } from '../core/browser-lifecycle-manager';

// Start monitoring on server startup
browserLifecycle.startMonitoring();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await browserLifecycle.emergencyCleanup();
  process.exit(0);
});
```

### CLI Maintenance Commands

```bash
# Check browser process status
npx printeer cleanup status --verbose

# Clean up zombie processes
npx printeer cleanup

# Emergency kill all Chrome processes
npx printeer cleanup kill-all --force

# Start monitoring (for debugging)
npx printeer cleanup monitor --interval 30000
```

## Architecture

### Components

1. **BrowserLifecycleManager**: Core singleton managing browser lifecycle
2. **BrowserCleanupManager**: Test-focused cleanup utilities
3. **CLI Commands**: Server maintenance tools
4. **API Integration**: Automatic integration with main API

### Process Flow

```
Browser Launch
     ↓
Registration (with PID tracking)
     ↓
Usage (with activity tracking)
     ↓
Cleanup Trigger (manual/automatic)
     ↓
Graceful Close (10s timeout)
     ↓
Force Kill (if needed)
     ↓
Process Verification
```

### Monitoring Cycle

```
Every 60 seconds:
1. Check browser health
2. Identify idle/old browsers
3. Cleanup unhealthy browsers
4. Verify process termination
5. Emit status events
```

## Platform Support

### Windows
- Uses PowerShell for process management
- Handles Windows-specific Chrome process patterns
- Supports `taskkill` for force termination

### Unix/Linux
- Uses standard Unix process tools
- Handles Docker/container environments
- Supports `SIGKILL` for force termination

### Detection Patterns

The system identifies Puppeteer Chrome processes by:
- Command line containing `puppeteer`
- User data directory patterns
- Remote debugging port arguments
- Headless mode indicators

## Configuration

### Environment Variables

```bash
# Force cleanup after each operation (testing)
PRINTEER_FORCE_CLEANUP=1

# Use only bundled Chromium
PRINTEER_BUNDLED_ONLY=1

# Browser timeout settings
PRINTEER_BROWSER_TIMEOUT=30000
```

### Lifecycle Settings

```typescript
// Configure monitoring intervals
browserLifecycle.maxBrowserAge = 30 * 60 * 1000; // 30 minutes
browserLifecycle.maxIdleTime = 5 * 60 * 1000;    // 5 minutes
browserLifecycle.cleanupInterval = 60 * 1000;    // 1 minute
```

## Error Handling

The system handles various failure scenarios:

1. **Graceful Close Timeout**: Falls back to force kill
2. **Process Already Dead**: Silently continues
3. **Permission Errors**: Logs warnings and continues
4. **System Command Failures**: Provides detailed error messages

## Monitoring and Observability

### Events

```typescript
browserLifecycle.on('browserRegistered', ({ id, pid }) => {
  console.log(`Browser ${id} registered with PID ${pid}`);
});

browserLifecycle.on('cleanupPerformed', ({ cleaned, remaining }) => {
  console.log(`Cleaned ${cleaned} browsers, ${remaining} remaining`);
});

browserLifecycle.on('error', (error) => {
  console.error('Lifecycle error:', error);
});
```

### Status Monitoring

```typescript
const status = browserLifecycle.getStatus();
console.log(`Active browsers: ${status.activeBrowsers}`);
console.log(`Monitoring: ${status.isMonitoring}`);
```

## Best Practices

### For Development
1. Always use the lifecycle manager in tests
2. Call cleanup in `afterEach` hooks
3. Use `PRINTEER_FORCE_CLEANUP=1` in test environments

### For Production
1. Start monitoring on server startup
2. Set up proper signal handlers for graceful shutdown
3. Monitor browser process counts with your observability stack
4. Set up alerts for high browser process counts

### For CI/CD
1. Run cleanup commands before/after test suites
2. Use the `--dry-run` flag to check for issues
3. Include browser process monitoring in health checks

## Troubleshooting

### High Memory Usage
```bash
# Check current browser status
npx printeer cleanup status --verbose

# Perform cleanup
npx printeer cleanup
```

### Zombie Processes
```bash
# Emergency cleanup (be careful in production)
npx printeer cleanup kill-all --force
```

### Monitoring Issues
```bash
# Start monitoring with verbose output
npx printeer cleanup monitor --interval 10000
```

## Security Considerations

1. **Process Isolation**: Only targets Puppeteer-specific processes
2. **Permission Checks**: Validates process ownership before killing
3. **Audit Logging**: All cleanup operations are logged
4. **Safe Defaults**: Conservative timeouts and retry logic

## Performance Impact

- **Memory**: ~1MB overhead for lifecycle management
- **CPU**: Minimal impact during monitoring cycles
- **Disk**: No persistent storage required
- **Network**: No network operations

The benefits far outweigh the minimal overhead, especially in production environments where zombie processes can consume gigabytes of RAM.