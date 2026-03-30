/**
 * CLI Cleanup Command
 *
 * Provides server maintenance commands for cleaning up zombie browser processes
 */

import { Command } from "commander";
import { DefaultBrowserManager } from "../printing/browser";
import { browserCleanup } from "../test-utils/browser-cleanup";

interface CleanupOptions {
  force?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
  timeout?: number;
}

/**
 * Create cleanup command
 */
export function createCleanupCommand(): Command {
  const command = new Command("cleanup");

  command
    .description(
      "Clean up zombie browser processes and manage browser lifecycle",
    )
    .option(
      "-f, --force",
      "Force kill all Chrome/Chromium processes (may impact other applications)",
    )
    .option("-v, --verbose", "Show detailed output")
    .option(
      "--dry-run",
      "Show what would be cleaned up without actually doing it",
    )
    .option(
      "--timeout <ms>",
      "Timeout for cleanup operations in milliseconds",
      "30000",
    )
    .action(async (options: CleanupOptions) => {
      await runCleanupCommand(options);
    });

  // Add subcommands
  command
    .command("status")
    .description("Show current browser process status")
    .option("-v, --verbose", "Show detailed information")
    .action(async (options) => {
      await showBrowserStatus(options);
    });

  command
    .command("kill-all")
    .description("Emergency kill all Chrome/Chromium processes")
    .option("-f, --force", "Skip confirmation prompt")
    .action(async (options) => {
      await killAllBrowsers(options);
    });

  command
    .command("monitor")
    .description("Start monitoring browser processes")
    .option(
      "-i, --interval <ms>",
      "Monitoring interval in milliseconds",
      "60000",
    )
    .action(async (options) => {
      await startMonitoring(options);
    });

  return command;
}

/**
 * Main cleanup command handler
 */
async function runCleanupCommand(options: CleanupOptions): Promise<void> {
  // Cross-OS safety note:
  // Keep scoped vs force cleanup behavior validated by tests/cli/cleanup-cross-os.test.ts
  // on Linux, macOS, and Windows.
  console.log("🧹 Starting browser cleanup...\n");

  try {
    // Show current status first
    await showBrowserStatus({ verbose: options.verbose });

    if (options.dryRun) {
      console.log("\n📋 DRY RUN - No actual cleanup will be performed\n");
      return;
    }

    // Perform managed browser cleanup
    console.log("🔧 Cleaning up managed browsers...");
    const globalManager = DefaultBrowserManager.getGlobalInstance();
    let managedResult = { killed: 0, errors: [] as string[] };

    if (globalManager) {
      managedResult = await globalManager.emergencyCleanup();
      console.log(
        `✅ Managed cleanup: ${managedResult.killed} browsers closed`,
      );
    } else {
      console.log("ℹ️  No active browser manager found");
    }

    if (managedResult.errors.length > 0) {
      console.log("⚠️  Managed cleanup errors:");
      managedResult.errors.forEach((error) => console.log(`   - ${error}`));
    }

    // Perform system-wide cleanup
    console.log("\n🔍 Scanning for orphaned browser processes...");
    if (options.force) {
      console.log(
        "⚠️  Force mode enabled: this may kill browser processes from other applications.",
      );
    }

    const systemResult = await browserCleanup.killAllChromiumProcesses({
      includeAllChromium: Boolean(options.force),
    });

    console.log(`✅ System cleanup: ${systemResult.killed} processes killed`);

    if (systemResult.errors.length > 0) {
      console.log("⚠️  System cleanup errors:");
      systemResult.errors.forEach((error) => console.log(`   - ${error}`));
    }

    // Final status check
    console.log("\n📊 Final status:");
    await showBrowserStatus({ verbose: false });

    console.log("\n✨ Cleanup completed successfully!");
  } catch (error) {
    console.error("❌ Cleanup failed:", (error as Error).message);
    process.exit(1);
  }
}

/**
 * Show browser status
 */
async function showBrowserStatus(options: {
  verbose?: boolean;
}): Promise<void> {
  const globalManager = DefaultBrowserManager.getGlobalInstance();

  console.log("📊 Browser Process Status:");

  if (globalManager) {
    const status = globalManager.getPoolStatus();
    console.log(`   Active browsers: ${status.totalBrowsers}`);
    console.log(`   Available: ${status.availableBrowsers}`);
    console.log(`   Busy: ${status.busyBrowsers}`);
    console.log(`   Healthy: ${status.healthyBrowsers}`);
    console.log(`   Unhealthy: ${status.unhealthyBrowsers}`);

    if (options.verbose) {
      console.log("\n📋 Browser pool metrics:");
      console.log(`   Created: ${status.metrics.created}`);
      console.log(`   Destroyed: ${status.metrics.destroyed}`);
      console.log(`   Reused: ${status.metrics.reused}`);
      console.log(`   Errors: ${status.metrics.errors}`);
    }
  } else {
    console.log("   No active browser manager found");
  }

  // Show Printeer-owned Chrome process count
  try {
    const printeerCount = await getPrinteerChromeProcessCount();
    console.log(`   Printeer-owned Chrome processes: ${printeerCount}`);

    if (options.verbose) {
      const systemCount = await getSystemChromeProcessCount();
      console.log(`   System Chrome processes: ${systemCount}`);
    }
  } catch (error) {
    console.log("   Printeer-owned Chrome processes: Unable to determine");
  }
}

/**
 * Kill all browsers with confirmation
 */
async function killAllBrowsers(options: { force?: boolean }): Promise<void> {
  if (!options.force) {
    console.log(
      "⚠️  This will forcefully kill ALL Chrome/Chromium processes on the system.",
    );
    console.log("   This may affect other applications using Chrome.");
    console.log("   Use --force to skip this confirmation.");

    // In a real CLI, you'd use a prompt library here
    console.log("   Aborting for safety. Use --force if you're sure.");
    return;
  }

  console.log("💀 Force killing all Chrome/Chromium processes...");

  try {
    const result = await browserCleanup.killAllChromiumProcesses({
      includeAllChromium: true,
    });
    console.log(`✅ Killed ${result.killed} processes`);

    if (result.errors.length > 0) {
      console.log("⚠️  Errors during force kill:");
      result.errors.forEach((error) => console.log(`   - ${error}`));
    }
  } catch (error) {
    console.error("❌ Force kill failed:", (error as Error).message);
    process.exit(1);
  }
}

/**
 * Start monitoring
 */
async function startMonitoring(options: { interval?: string }): Promise<void> {
  const interval = parseInt(options.interval || "60000");

  console.log(
    `🔍 Starting browser process monitoring (interval: ${interval}ms)...`,
  );
  console.log("   Press Ctrl+C to stop monitoring\n");

  // Keep process alive and show periodic status
  const monitoringInterval = setInterval(async () => {
    await showBrowserStatus({ verbose: false });
    console.log("---");
  }, interval);

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Stopping monitoring...");
    clearInterval(monitoringInterval);
    process.exit(0);
  });

  // Show initial status
  await showBrowserStatus({ verbose: true });
}

/**
 * Get Printeer-owned Chrome process count
 */
async function getPrinteerChromeProcessCount(): Promise<number> {
  // NOTE: This command path is intentionally OS-specific and should remain covered by
  // tests/cli/cleanup-cross-os.test.ts when running CI matrix builds.
  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const execAsync = promisify(exec);

  try {
    if (process.platform === "win32") {
      const { stdout } = await execAsync(
        `
        (Get-WmiObject Win32_Process |
         Where-Object {
           ($_.Name -eq "chrome.exe" -or $_.Name -eq "chromium.exe") -and
           $_.CommandLine -like "*--printeer-owned=1*"
         }).Count
      `,
        { shell: "powershell", timeout: 10000 },
      );
      return parseInt(stdout.trim()) || 0;
    } else {
      const { stdout } = await execAsync(
        `
        ps aux | grep -Ei "(chrome|chromium)" | grep -F -- "--printeer-owned=1" | grep -v grep | wc -l
      `,
        { timeout: 10000 },
      );
      return parseInt(stdout.trim()) || 0;
    }
  } catch (error) {
    throw new Error(
      `Failed to count Printeer Chrome processes: ${(error as Error).message}`,
    );
  }
}

/**
 * Get system Chrome process count
 */
async function getSystemChromeProcessCount(): Promise<number> {
  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const execAsync = promisify(exec);

  try {
    if (process.platform === "win32") {
      const { stdout } = await execAsync(
        `
        (Get-WmiObject Win32_Process |
         Where-Object { $_.Name -eq "chrome.exe" -or $_.Name -eq "chromium.exe" }).Count
      `,
        { shell: "powershell", timeout: 10000 },
      );
      return parseInt(stdout.trim()) || 0;
    } else {
      const { stdout } = await execAsync(
        `ps aux | grep -Ei "(chrome|chromium)" | grep -v grep | wc -l`,
        { timeout: 10000 },
      );
      return parseInt(stdout.trim()) || 0;
    }
  } catch (error) {
    throw new Error(
      `Failed to count Chrome processes: ${(error as Error).message}`,
    );
  }
}

export default createCleanupCommand;
