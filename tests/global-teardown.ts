/**
 * Global test teardown
 * 
 * This runs after all tests are complete to ensure no browser processes are left
 */

export default async function globalTeardown() {
  console.log('🧹 Running global test teardown...');

  try {
    // Import and run comprehensive cleanup
    const { performTestCleanup } = await import('../src/test-utils/test-cleanup');
    await performTestCleanup();

    console.log('✅ Global test teardown completed');
  } catch (error) {
    console.error('❌ Global test teardown failed:', error);
    
    // As a last resort, try to kill processes directly
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      if (process.platform === 'win32') {
        await execAsync('taskkill /F /IM chrome.exe /T 2>nul || echo "No chrome processes"');
        await execAsync('taskkill /F /IM chromium.exe /T 2>nul || echo "No chromium processes"');
      } else {
        await execAsync('pkill -f "chrome|chromium" || true');
      }

      console.log('🔥 Emergency process cleanup completed');
    } catch (emergencyError) {
      console.error('❌ Emergency cleanup also failed:', emergencyError);
    }
  }
}