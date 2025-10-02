# Testing Browser Strategies

This document explains how to test both the oneshot and pool browser strategies in Printeer.

## Overview

Printeer uses two browser strategies:

1. **Oneshot Strategy**: Creates browser → uses it → destroys it immediately
2. **Pool Strategy**: Maintains a pool of browsers for reuse

## Test Structure

### Strategy-Specific Tests

#### 1. Oneshot Strategy Tests (`tests/browser-strategy.test.ts`)
- Tests strategy selection logic
- Verifies oneshot behavior in test environment
- Ensures no persistent browser managers

#### 2. Pool Strategy Tests (`tests/browser-pool.test.ts`)
- Tests browser pool creation and management
- Verifies browser reuse and lifecycle
- Tests concurrent browser handling
- Tests pool size limits and cleanup

#### 3. Integration Tests (`tests/browser-integration.test.ts`)
- Tests both strategies in realistic scenarios
- Tests strategy auto-selection
- Tests fallback behavior
- Tests sequential and concurrent operations

#### 4. Performance Tests (`tests/browser-performance.test.ts`)
- Compares performance of both strategies
- Measures timing and resource usage
- Tests concurrent load handling
- Demonstrates efficiency differences

## Running Tests

### Run All Browser Strategy Tests
```bash
npm run test:browser-strategies
# or
node scripts/test-both-strategies.js
```

### Run Individual Test Suites
```bash
# Test strategy selection
npm test tests/browser-strategy.test.ts

# Test browser pool functionality
npm test tests/browser-pool.test.ts

# Test integration scenarios
npm test tests/browser-integration.test.ts

# Test performance characteristics
npm test tests/browser-performance.test.ts
```

### Run CLI Tests (Uses Oneshot)
```bash
npm run test:cli
```

## Environment Variables for Testing

### Force Specific Strategy
```bash
# Force oneshot strategy
PRINTEER_BROWSER_STRATEGY=oneshot npm test

# Force pool strategy  
PRINTEER_BROWSER_STRATEGY=pool npm test
```

### Test Environment Setup
```bash
# Standard test environment (uses oneshot)
NODE_ENV=test npm test

# Production-like environment (uses pool)
NODE_ENV=production PRINTEER_BROWSER_STRATEGY=pool npm test
```

## Test Scenarios

### Oneshot Strategy Tests

1. **Single Conversion**
   - Create browser → convert → destroy
   - Verify no lingering processes

2. **Sequential Conversions**
   - Multiple conversions in sequence
   - Each should be independent

3. **Error Handling**
   - Browser failures should not leak processes
   - Clean error recovery

### Pool Strategy Tests

1. **Browser Reuse**
   - First conversion creates browser
   - Subsequent conversions reuse browser
   - Verify metrics show reuse

2. **Concurrent Operations**
   - Multiple simultaneous conversions
   - Pool should handle concurrency
   - Respect max pool size

3. **Lifecycle Management**
   - Idle browsers should be cleaned up
   - Pool should maintain min/max sizes
   - Shutdown should clean all browsers

4. **Error Recovery**
   - Failed browsers should be removed from pool
   - Pool should recover and create new browsers
   - Metrics should track errors

### Integration Tests

1. **Strategy Selection**
   - CLI commands → oneshot
   - Test environment → oneshot
   - Production API → pool
   - Docker/containers → oneshot

2. **Fallback Behavior**
   - Pool strategy failure → fallback to oneshot
   - Graceful degradation

3. **Real-world Scenarios**
   - Batch processing
   - Server API usage
   - CLI tool usage

## Performance Expectations

### Oneshot Strategy
- **First Request**: ~1-2 seconds (browser startup)
- **Subsequent Requests**: ~1-2 seconds each (new browser each time)
- **Memory**: Low (no persistent browsers)
- **Cleanup**: Immediate and guaranteed

### Pool Strategy
- **First Request**: ~1-2 seconds (browser startup)
- **Subsequent Requests**: ~100-500ms (browser reuse)
- **Memory**: Higher (browsers stay alive)
- **Cleanup**: Managed by pool lifecycle

## Debugging Tests

### Enable Debug Logging
```bash
PRINTEER_SILENT=0 npm test
```

### Monitor Browser Processes
```bash
# In another terminal
node scripts/monitor-chrome-processes.js
```

### Check Strategy Selection
```javascript
const { getCurrentBrowserStrategy } = require('./src/api/index');
console.log('Current strategy:', getCurrentBrowserStrategy());
```

## Common Issues and Solutions

### Issue: Tests Leave Browser Processes
**Solution**: Ensure tests use oneshot strategy
```bash
PRINTEER_BROWSER_STRATEGY=oneshot npm test
```

### Issue: Pool Tests Fail
**Solution**: Check that pool tests explicitly set pool strategy
```javascript
process.env.PRINTEER_BROWSER_STRATEGY = 'pool';
process.env.NODE_ENV = 'production';
```

### Issue: Cleanup Not Working
**Solution**: Check global teardown is configured
```javascript
// vitest.config.ts
export default defineConfig({
  test: {
    globalTeardown: './tests/global-teardown.ts'
  }
});
```

## Test Coverage Goals

### Oneshot Strategy
- ✅ No process leaks
- ✅ Independent operations
- ✅ Error recovery
- ✅ CLI integration

### Pool Strategy  
- ✅ Browser reuse
- ✅ Concurrent handling
- ✅ Pool size management
- ✅ Lifecycle management
- ✅ Metrics tracking
- ✅ Error recovery

### Integration
- ✅ Strategy auto-selection
- ✅ Fallback behavior
- ✅ Real-world scenarios
- ✅ Performance characteristics

## Continuous Integration

### Test Matrix
```yaml
# Example CI configuration
strategy:
  matrix:
    browser-strategy: [oneshot, pool]
    node-env: [test, production]
    
env:
  PRINTEER_BROWSER_STRATEGY: ${{ matrix.browser-strategy }}
  NODE_ENV: ${{ matrix.node-env }}
```

This comprehensive testing approach ensures both browser strategies work correctly in their intended use cases while preventing memory leaks and process zombies.