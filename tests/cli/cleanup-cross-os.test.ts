import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cross-OS cleanup safety tests.
 *
 * Run this suite on each target OS:
 * - npm run test:cleanup:cross-os
 * - bun run test:cleanup:cross-os
 *
 * Recommended CI matrix: ubuntu-latest, macos-latest, windows-latest.
 */

const executedCommands: string[] = [];
const kPromisify = Symbol.for("nodejs.util.promisify.custom");

const execMock = vi.fn(
  (_command: string, _optionsOrCb?: unknown, maybeCb?: unknown) => {
    const cb = typeof _optionsOrCb === "function" ? _optionsOrCb : maybeCb;
    if (typeof cb === "function") {
      (cb as (err: Error | null, stdout: string, stderr: string) => void)(
        null,
        "",
        "",
      );
    }
  },
);

(execMock as unknown as Record<symbol, unknown>)[kPromisify] = vi.fn(
  async (command: string) => {
    executedCommands.push(command);

    // Windows: process discovery JSON responses
    if (
      command.includes("ConvertTo-Json") &&
      command.includes("--printeer-owned=1")
    ) {
      return { stdout: '[{"ProcessId":101}]', stderr: "" };
    }
    if (command.includes("ConvertTo-Json")) {
      return { stdout: "[]", stderr: "" };
    }

    // Unix-like PID lookups
    if (command.includes("awk") && command.includes("--printeer-owned=1")) {
      return { stdout: "101\n", stderr: "" };
    }
    if (
      command.includes("awk") &&
      command.includes("puppeteer|user-data-dir|remote-debugging-port")
    ) {
      return { stdout: "202\n", stderr: "" };
    }

    // Process counters
    if (command.includes("wc -l") || command.includes(").Count")) {
      return { stdout: "0", stderr: "" };
    }

    return { stdout: "", stderr: "" };
  },
);

vi.mock("child_process", () => ({
  exec: execMock,
  spawn: vi.fn(),
}));

describe("cleanup cross-OS command behavior", () => {
  let platformSpy: any;
  let killSpy: any;

  beforeEach(() => {
    executedCommands.length = 0;
    vi.clearAllMocks();
    platformSpy = vi.spyOn(process, "platform", "get");
    killSpy = vi.spyOn(process, "kill").mockImplementation(() => true);
  });

  afterEach(() => {
    platformSpy.mockRestore();
    killSpy.mockRestore();
  });

  it("uses scoped marker-based cleanup on Windows by default", async () => {
    platformSpy.mockReturnValue("win32");

    const { browserCleanup } =
      await import("../../src/test-utils/browser-cleanup");
    const result = await browserCleanup.killAllChromiumProcesses();

    expect(result.errors).toEqual([]);

    const windowsPidQueries = executedCommands.filter((c) =>
      c.includes("ConvertTo-Json"),
    );
    expect(windowsPidQueries.length).toBe(1);
    expect(windowsPidQueries[0]).toContain("--printeer-owned=1");
  });

  it("uses scoped marker-based cleanup on macOS by default", async () => {
    platformSpy.mockReturnValue("darwin");

    const { browserCleanup } =
      await import("../../src/test-utils/browser-cleanup");
    const result = await browserCleanup.killAllChromiumProcesses();

    expect(result.errors).toEqual([]);

    const unixLookupCommands = executedCommands.filter(
      (c) => c.includes("ps aux") && c.includes("awk"),
    );

    expect(unixLookupCommands.length).toBe(1);
    expect(unixLookupCommands[0]).toContain("--printeer-owned=1");
    expect(unixLookupCommands[0]).not.toContain(
      "puppeteer|user-data-dir|remote-debugging-port",
    );
    expect(killSpy).toHaveBeenCalledWith(101, "SIGKILL");
  });

  it("includes broader fallback matching only in force mode on Linux", async () => {
    platformSpy.mockReturnValue("linux");

    const { browserCleanup } =
      await import("../../src/test-utils/browser-cleanup");
    const result = await browserCleanup.killAllChromiumProcesses({
      includeAllChromium: true,
    });

    expect(result.errors).toEqual([]);

    expect(
      executedCommands.some((c) =>
        c.includes("puppeteer|user-data-dir|remote-debugging-port"),
      ),
    ).toBe(true);
    expect(killSpy).toHaveBeenCalledWith(101, "SIGKILL");
    expect(killSpy).toHaveBeenCalledWith(202, "SIGKILL");
  });
});
