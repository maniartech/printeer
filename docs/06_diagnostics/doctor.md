# The Doctor Command

Run the doctor to perform a full system health check:

```bash
printeer doctor
```

For more detail (including stack traces and sub-step logs):

```bash
printeer doctor --verbose
```

## What The Doctor Checks

The diagnostic engine runs 4 distinct groups of tests.

### 1. System Environment

- Node.js version compatibility (Node 16+ required)
- OS and architecture metadata for debugging
- Container detection (for environment-specific behavior)

### 2. Browser Availability

- Executable path resolution:
  1. `PUPPETEER_EXECUTABLE_PATH`
  2. Bundled Chromium via Puppeteer
- Browser launch test
- Sandbox behavior validation

If sandboxing fails (common in containers), remediation recommends `--no-sandbox`.

### 3. Display Server (Linux)

- X11 or Wayland detection
- Xvfb detection when no display server is present
- Remediation guidance for missing runtime dependencies

### 4. Font Availability

Headless rendering depends on system fonts. The doctor scans standard font directories and warns when fonts are missing.

If your PDF has missing glyphs or squares, run doctor and verify the font checks.
