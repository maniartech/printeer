/**
 * Test-specific cleanup utilities
 *
 * This module provides aggressive cleanup specifically for test environments
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Force kill all Chrome/Chromium processes (test environment only)
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

    // Wait for processes to die
    await new Promise(resolve => setTimeout(resolve, 2000));

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
 * Setup test cleanup hooks
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

  // Register cleanup handlers
  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception in test:', error);
    cleanup();
  });
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection in test:', reason);
    cleanup();
  });
}

// Auto-setup in test environment
if (process.env.NODE_ENV === 'test') {
  setupTestCleanup();
}