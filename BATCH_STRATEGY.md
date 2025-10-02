# Batch Strategy Implementation

## Overview

Printeer now intelligently selects browser strategies based on the operation type:

- **Single operations** → Oneshot strategy (clean, simple)
- **Batch operations** → Pool strategy (performance)

## Strategy Selection Logic

### Batch Operation Detection

The system automatically detects batch operations through:

1. **Explicit batch command**:
   ```bash
   npx printeer batch batch-file.csv
   ```

2. **Multiple URLs**:
   ```bash
   npx printeer convert https://site1.com https://site2.com https://site3.com
   ```

3. **Batch file extensions**:
   ```bash
   npx printeer convert jobs.csv
   npx printeer convert jobs.json
   npx printeer convert jobs.yaml
   ```

4. **Batch-related options**:
   ```bash
   npx printeer convert url.com --concurrency 3
   npx printeer convert url.com --continue-on-error
   npx printeer convert url.com --output-dir ./outputs
   ```

5. **Environment variable**:
   ```bash
   PRINTEER_BATCH_MODE=1 npx printeer convert url.com
   ```

### Strategy Selection Rules

```typescript
// 1. Explicit override (highest priority)
PRINTEER_BROWSER_STRATEGY=oneshot → oneshot
PRINTEER_BROWSER_STRATEGY=pool → pool

// 2. Batch operation detection
if (isBatchOperation()) → pool

// 3. Environment-based defaults
if (CLI_MODE && !batch) → oneshot
if (TEST_ENV && !batch) → oneshot
if (DOCKER && !batch) → oneshot
if (SERVERLESS && !batch) → oneshot

// 4. Default for server/API
else → pool
```

## Performance Benefits

### Single Operations (Oneshot)
- **Startup**: ~1-2 seconds per operation
- **Memory**: Minimal (no persistent browsers)
- **Cleanup**: Immediate and guaranteed
- **Use case**: One-off conversions, CLI tools

### Batch Operations (Pool)
- **First operation**: ~1-2 seconds (browser creation)
- **Subsequent operations**: ~100-500ms (browser reuse)
- **Memory**: Higher (browsers stay alive during batch)
- **Cleanup**: Managed by pool lifecycle
- **Use case**: Multiple conversions, high throughput

## Implementation Details

### Batch Mode Flag

When batch operations are detected, the system sets:
```bash
PRINTEER_BATCH_MODE=1
```

This flag is automatically:
- Set by batch processor
- Set by multi-URL CLI commands
- Cleaned up after batch completion

### Browser Pool Configuration for Batches

```typescript
// Batch-optimized pool settings
{
  minSize: 0,           // Don't pre-warm
  maxSize: 3,           // Allow multiple browsers for concurrency
  idleTimeout: 30000,   // Keep browsers alive during batch
  cleanupInterval: 10000 // Regular cleanup checks
}
```

### Cleanup Behavior

**During Batch Processing**:
- Browsers are reused across operations
- Pool manages browser lifecycle
- Idle browsers cleaned up periodically

**After Batch Completion**:
- Pool is shut down
- All browsers are closed
- Processes are verified terminated

## Testing

### Test Batch Strategy Selection

```bash
# Test batch detection
npm test tests/batch-strategy.test.ts

# Test batch performance
npm test tests/browser-performance.test.ts

# Test CLI batch commands
npm test tests/cli/batch.test.ts
```

### Verify Strategy in Use

```bash
# Enable debug output to see strategy selection
PRINTEER_SILENT=0 npx printeer batch jobs.csv --dry-run
# Should show: "Using browser strategy: pool"

PRINTEER_SILENT=0 npx printeer convert https://example.com output.pdf --dry-run  
# Should show: "Using browser strategy: oneshot"
```

## Examples

### Single Conversion (Oneshot)
```bash
npx printeer convert https://example.com output.pdf
# → Uses oneshot strategy
# → Creates browser, converts, destroys browser
# → No lingering processes
```

### Batch Conversion (Pool)
```bash
npx printeer batch jobs.csv
# → Uses pool strategy  
# → Creates browser pool
# → Reuses browsers across jobs
# → Shuts down pool after completion
```

### Multi-URL Conversion (Pool)
```bash
npx printeer convert https://site1.com https://site2.com https://site3.com
# → Detected as batch operation
# → Uses pool strategy
# → Efficient browser reuse
```

### Concurrent Conversion (Pool)
```bash
npx printeer convert https://example.com --concurrency 3
# → Concurrency option indicates batch processing
# → Uses pool strategy
# → Allows multiple simultaneous operations
```

## Configuration

### Force Strategy Override
```bash
# Force oneshot even for batch operations
PRINTEER_BROWSER_STRATEGY=oneshot npx printeer batch jobs.csv

# Force pool even for single operations  
PRINTEER_BROWSER_STRATEGY=pool npx printeer convert https://example.com output.pdf
```

### Batch-Specific Settings
```bash
# Adjust pool size for large batches
PRINTEER_BROWSER_POOL_MAX=5 npx printeer batch large-jobs.csv

# Adjust concurrency
npx printeer batch jobs.csv --concurrency 4
```

## Monitoring

### Check Active Strategy
```javascript
const { getCurrentBrowserStrategy } = require('./src/api/index');
console.log('Current strategy:', getCurrentBrowserStrategy());
```

### Monitor Browser Processes
```bash
# Monitor processes during batch operations
node scripts/monitor-chrome-processes.js &
npx printeer batch jobs.csv
```

### Check Pool Status
```bash
# Check browser pool status
npx printeer cleanup status --verbose
```

## Benefits

### For Users
- **Automatic optimization**: No manual configuration needed
- **Best performance**: Pool strategy for batch operations
- **Clean operation**: Oneshot strategy for single operations
- **No process leaks**: Guaranteed cleanup in both modes

### For Developers
- **Intelligent defaults**: System chooses optimal strategy
- **Override capability**: Manual control when needed
- **Comprehensive testing**: Both strategies thoroughly tested
- **Clear separation**: Different strategies for different use cases

This implementation ensures that batch operations get the performance benefits of browser pooling while maintaining the clean, leak-free behavior for single operations.