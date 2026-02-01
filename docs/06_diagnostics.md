# Chapter 6: Diagnostics & Troubleshooting

Printeer includes a sophisticated diagnostic tool—**The Doctor**—to simplify the notoriously difficult task of debugging headless browser environments.

## The `doctor` Command

Run the doctor to perform a full system health check:

```bash
printeer doctor
```

For more detail (including stack traces and sub-step logs):
```bash
printeer doctor --verbose
```

## What Does The Doctor Check?

The diagnostic engine runs 4 distinct groups of tests:

### 1. System Environment
-   **Node.js Version**: Verifies compatibility (Node 16+ required).
-   **OS/Arch**: Logs platform (e.g., `win32 x64`, `linux arm64`) for debugging.
-   **Docker Detection**: Checks for `.dockerenv` or cgroups to enable container-specific optimizations.

### 2. Browser Availability
-   **Executable Path**: Locates the Chrome/Chromium binary. It checks:
    1.  `PUPPETEER_EXECUTABLE_PATH` (High priority).
    2.  Puppeteer's bundled Chromium (Default).
-   **Launch Test**: Attempts to spawn the process.
-   **Sandbox Check**: Verifies if the browser can run with sandboxing enabled. If this fails (common in Docker), it recommends `--no-sandbox`.

### 3. Display Server (Linux)
-   **X11/Wayland**: Checks if a display server is present.
-   **Xvfb**: If no display is found, it checks for `Xvfb` (X Virtual Framebuffer) availability.
-   **Remediation**: If headless mode fails on Linux, the Doctor will explicitly suggest installing `xvfb` or critical missing shared libraries (e.g., `libnss3`, `libatk1.0-0`).

### 4. Font Availability
Headless browsers rely on system fonts. If your PDFs have missing text or squares (□□□), you are likely missing fonts.
-   The Doctor scans standard font directories (`/usr/share/fonts`, `C:\Windows\Fonts`).
-   If 0 fonts are found, it issues a **Critical Warning**.

## Managing the Browser Engine

Printeer delegates the browser management to **Puppeteer**. This means Printeer does not "install" Chrome itself, but relies on the version bundled with the Puppeteer dependency.

### How to Upgrade the Browser

To get a newer version of the Chromium engine (e.g., to fix rendering bugs or support new CSS features), you have two options:

**Option 1: Update Printeer (Recommended)**
We regularly update Printeer's dependencies. Running an update will pull the latest tested version of Puppeteer + Chromium.
```bash
npm install -g printeer@latest
```

**Option 2: Manual Puppeteer Override**
If you are using Printeer as a library, you can install a newer version of Puppeteer in your project. Printeer will try to use the version found in your `node_modules`.
```bash
npm install puppeteer@latest
```

### Using a Custom Browser Installation

In some environments (Corporate IT managed laptops, specific Linux distros), you may want to use a pre-installed Chrome or Edge instead of the bundled Chromium.

**1. Set the Environment Variable**
Point `PUPPETEER_EXECUTABLE_PATH` to your binary.

**Linux/Direct:**
```bash
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
printeer convert ...
```

**Docker:**
```dockerfile
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
```

**2. Verify with Doctor**
Run `printeer doctor`. It should now report:
> `Browser found at: /usr/bin/google-chrome-stable (Source: env)`

## Common Issues & Solutions

### "Protocol Error: Target Closed"
**Cause:** The browser crashed immediately upon launch.
**Fix:**
-   Check memory (OOM killer).
-   In Docker, ensure you run with `--shm-size=1gb` (shared memory is often too small).
-   Try `printeer doctor --verbose` to see the exact crash dump.

### "Navigation Timeout"
**Cause:** The page took too long to reach the idle state.
**Fix:**
-   Increase timeout: `--wait-timeout 60000`.
-   Use a looser wait condition: `--wait-until load` (instead of `networkidle0`).
-   Ensure the target URL is reachable from the server (firewall/DNS).

### Blank PDF / Missing Text
**Cause:** Web fonts failed to load or system fonts are missing.
**Fix:**
-   Run `printeer doctor` to check font counts.
-   Use `--wait-until networkidle0` to ensure remote web fonts finish downloading before print.

### "EACCES: permission denied"
**Cause:** Printeer cannot write to the output directory.
**Fix:**
-   Ensure the user running the process has write permissions.
-   In Docker, check volume mount permissions.

## Getting Help

If the Doctor passes but you still have issues:
1.  Run with `--verbose` to capture debug logs.
2.  Enable dumpio (`PRINTEER_DUMPIO=1`) to see Chrome's internal stdout/stderr.
3.  File an issue on the GitHub repository with the JSON report:`printeer doctor --json > report.json`.
