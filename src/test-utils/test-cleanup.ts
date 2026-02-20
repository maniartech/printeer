/**
 * Test-specific cleanup utilities
 *
 * This module provides cleanup specifically for test environments.
 * IMPORTANT: These functions are expensive (spawn shell processes, etc.)
 * and should only be called from global-teardown.ts — NOT from per-test
 * afterEach hooks. Running them after every test adds ~2s overhead each.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Force kill all Chrome/Chromium processes (test environment only).
 * WARNING: This is expensive — spawns shell processes and waits for them.
 * Only call from global teardown, not per-test hooks.
 */
export async function forceKillAllChromiumProcesses(): Promise<{ killed: number; errors: string[] }> {
  const result = { killed: 0, errors: [] as string[] };

  // Only run in test environment
  if (process.env.NODE_ENV !== 'test') {
    result.errors.push('Force kill only allowed in test environment');
    return result;
  }

  try {
    if (process.platform === 'win32') {
      // Windows - Kill all Chrome processes
      const commands = [
        'taskkill /F /IM chrome.exe /T 2>nul || echo "No chrome.exe processes"',
        'taskkill /F /IM chromium.exe /T 2>nul || echo "No chromium.exe processes"'
      ];

      for (const cmd of commands) {
        try {
          await execAsync(cmd, { timeout: 10000 });
          result.killed++;
        } catch (error) {
          // Ignore errors - processes might not exist
        }
      }
    } else {
      // Unix-like systems
      try {
        await execAsync('pkill -f "chrome|chromium" || true', { timeout: 10000 });
        result.killed++;
      } catch (error) {
        // Ignore errors - processes might not exist
      }
    }

    // Brief wait only if we actually killed something
    if (result.killed > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

  } catch (error) {
    result.errors.push(`Force kill failed: ${(error as Error).message}`);
  }

  return result;
}

/**
 * Comprehensive test cleanup
 */
export async function performTestCleanup(): Promise<void> {
  try {
    // 1. Cleanup managed browsers
    const { DefaultBrowserManager } = await import('../printing/browser');
    const globalManager = DefaultBrowserManager.getGlobalInstance();

    if (globalManager) {
      await globalManager.emergencyCleanup();
      await globalManager.shutdown();
      DefaultBrowserManager.setGlobalInstance(null);
    }

    // 2. Force kill any remaining processes
    await forceKillAllChromiumProcesses();

    // 3. Clear any global state
    if (typeof global !== 'undefined') {
      delete (global as any).__printeerBrowserManager;
    }

    // 4. Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

  } catch (error) {
    console.warn('Test cleanup failed:', error);
  }
}

/**
 * Setup test cleanup hooks (for global teardown only)
 */
export function setupTestCleanup(): void {
  // Only in test environment
  if (process.env.NODE_ENV !== 'test') {
    return;
  }

  const cleanup = () => {
    performTestCleanup().catch(error => {
      console.error('Emergency test cleanup failed:', error);
    });
  };

  // Register cleanup handlers for unexpected exits only
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}