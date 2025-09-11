# Printeer CLI Package

A unified command-line interface for the Printeer web-to-PDF/PNG conversion utility, featuring adaptive modes, interactive capabilities, and comprehensive system diagnostics.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Adaptive Design](#adaptive-design)
- [Command Reference](#command-reference)
- [Interactive Features](#interactive-features)
- [Configuration](#configuration)
- [Environment Variables](#environment-variables)
- [Exit Codes](#exit-codes)
- [Development Guidelines](#development-guidelines)
- [API Reference](#api-reference)
- [Error Handling](#error-handling)
- [Performance Considerations](#performance-considerations)

## Overview

The CLI package provides a unified, intelligent command-line interface for Printeer that automatically adapts to different usage contexts:

### Key Features

- **Unified Implementation**: Single CLI that works in all environments
- **Adaptive Mode Detection**: Automatically chooses interactive vs stdio mode
- **Lazy Loading**: Interactive dependencies loaded only when needed
- **Context Awareness**: TTY/CI detection for optimal user experience
- **Progressive Enhancement**: Rich features when available, fallback when not
- **Cross-Platform**: Full Windows, macOS, and Linux support

## Architecture

### Unified Design Philosophy

The CLI uses a single implementation (`unified-cli.ts`) that intelligently adapts based on:

1. **Environment Detection**: TTY vs non-TTY, CI vs local development
2. **Dependency Availability**: Interactive UI components loaded on-demand
3. **User Intent**: Explicit flags override automatic detection
4. **Graceful Degradation**: Rich features fall back to basic functionality

### Component Structure

```text
src/cli/
├── index.ts          # Unified, adaptive CLI implementation
├── options.ts        # Output type detection and validation
├── usage.ts         # Fallback usage information
└── README.md        # This documentation
```

## Adaptive Design

### Automatic Mode Detection

The CLI automatically selects the appropriate interaction mode:

**Interactive Mode** (when available):

- TTY environment detected
- `@clack/prompts` available
- Not running in CI
- `--quiet` not specified

**Stdio Mode** (fallback):

- Non-TTY environment
- CI environment detected
- Interactive dependencies unavailable
- `--quiet` flag specified

### Dependency Management

Interactive features use lazy loading:

```typescript
// Only loads @clack/prompts when actually needed
async function loadInteractiveUI() {
  try {
    const ui = await import('@clack/prompts');
    return ui;
  } catch (error) {
    // Gracefully falls back to stdio mode
    throw new Error('Interactive UI not available');
}
```

## Command Reference

### Primary Commands

#### Convert (Default Command)

Convert a web page to PDF or PNG format with automatic mode detection.

```bash
# Basic usage (interactive mode if TTY available)
printeer https://example.com output.pdf

# Explicit arguments (stdio mode)
printeer https://example.com output.pdf

# With format specification
printeer --format pdf https://example.com output.pdf
printeer -f png https://example.com output.png

# Quiet mode (stdio only, no output)
printeer --quiet https://example.com output.pdf
```

**Adaptive Behavior:**

- **Interactive Mode**: Shows conversion wizard if no arguments provided
- **Stdio Mode**: Requires URL and output arguments
- **Progress Display**: Shows spinner in interactive mode, simple text otherwise

**Options:**

- `-f, --format <type>`: Output format (pdf|png) - defaults to file extension detection
- `-q, --quiet`: Suppress all output (useful for scripts)

#### Doctor Command

Comprehensive system diagnostics with adaptive output formatting.

```bash
# Adaptive mode (interactive if TTY available)
printeer doctor

# Verbose diagnostics
printeer doctor --verbose
printeer doctor -v

# JSON output (for automation)
printeer doctor --json

# Markdown report (legacy compatibility)
printeer doctor --markdown

# Quiet mode (exit code only)
printeer --quiet doctor
```

**Adaptive Behavior:**

- **Interactive Mode**: Live progress with grouped results and emojis
- **Stdio Mode**: Text summary with systematic output
- **JSON Mode**: Structured data for automation
- **Quiet Mode**: Exit codes only, no output

**Doctor Features:**

- System environment validation
- Browser availability and version checking
- Headless browser launch testing
- Display server compatibility
- Font availability assessment
- Network connectivity verification
- Resource availability monitoring
- PDF/PNG output generation testing

#### Interactive Mode (Explicit)

Force interactive mode regardless of environment.

```bash
printeer interactive
printeer i
```

#### Help Commands

```bash
printeer help
printeer --help
printeer -h

# Command-specific help
printeer doctor --help
```

#### Version Commands

```bash
printeer version
printeer --version
printeer -v
```## Doctor Module

The doctor module provides comprehensive system diagnostics organized into logical groups:

### Diagnostic Categories

#### 1. System Environment

- **system-info**: OS, architecture, and Node.js version
- **platform-compatibility**: Platform-specific compatibility checks
- **permissions**: File system and execution permissions
- **resource-availability**: RAM, CPU cores, and disk space

#### 2. Browser & Runtime

- **browser-availability**: Chrome/Chromium detection and version
- **browser-version**: Version compatibility verification
- **browser-launch**: Headless browser launch testing
- **browser-sandbox**: Sandbox configuration validation

#### 3. Display & Resources

- **display-server**: X11/Wayland display server availability (Linux)
- **font-availability**: System font detection and counting
- **network-connectivity**: Internet connectivity verification

#### 4. Output Generation

- **print-pdf**: End-to-end PDF generation testing
- **print-png**: End-to-end PNG generation testing

### Output Formats

#### Summary Format (Default)

```text
Doctor summary (run with --verbose for more details):
[✓] System — Linux, x64, Node v18.17.0
[✓] Chrome/Chromium — v120 (bundled)
[✓] Headless launch — OK
[✓] Sandbox — OK
[✓] Display server — available
[✓] Fonts — 147 found
[✓] Permissions — OK
[✓] Resources — 8GB RAM, 4 cores
[✓] Network — OK

• No issues found!
```

#### JSON Format

```json
[
  {
    "status": "pass",
    "component": "system-info",
    "message": "System information collected",
    "details": {
      "os": "Linux 5.15.0",
      "arch": "x64",
      "nodeVersion": "v18.17.0"
    }
  }
]
```

#### Verbose Format

Detailed output with remediation suggestions, troubleshooting tips, and context information.

### Environment Variables for Doctor

- `PRINTEER_DOCTOR_VERBOSE=1`: Enable verbose diagnostic output
- `NO_COLOR=1`: Disable colored output
- `PUPPETEER_EXECUTABLE_PATH`: Custom browser executable path
- `PRINTEER_BUNDLED_ONLY=1`: Force bundled Chromium usage only

## Interactive Features

### Interactive Conversion (Modern CLI)

The interactive mode provides a guided conversion experience:

```bash
🎯 Printeer - Web to PDF/PNG Converter

? What URL would you like to convert? › https://example.com
? Where should we save the output? › output.pdf
⠋ Converting webpage...
✓ Conversion complete!
📄 Saved to: /path/to/output.pdf
```

### Interactive Diagnostics (Modern CLI)

Real-time diagnostic feedback with grouped results:

```bash
🔍 Printeer Doctor - System Diagnostics

⠋ Checking system environment...
✓ 🖥️  System Environment: All 4 checks passed
  ✓ system-info — Linux, x64, Node v18.17.0
  ✓ platform-compatibility — OK
  ✓ permissions — OK
  ✓ resource-availability — 8GB RAM, 4 cores

⠋ Checking browser & runtime...
✓ 🌐  Browser & Runtime: All 4 checks passed
  ✓ browser-availability — v120 (bundled)
  ✓ browser-version — OK
  ✓ browser-launch — OK
  ✓ browser-sandbox — OK

✓ All checks passed. Your system is ready!
```

## Configuration

### CLI Configuration Sources

The CLI loads configuration from multiple sources in priority order:

1. **Command-line arguments** (highest priority)
2. **Environment variables** (prefixed with `PRINTEER_`)
3. **Configuration files** (`.printeerrc.json`, `printeer.config.json`)
4. **Default values** (lowest priority)

### Output Type Detection

The `Options` class automatically detects output format:

```typescript
// From file extension
printeer https://example.com output.pdf  // → PDF
printeer https://example.com output.png  // → PNG

// Explicit format override
printeer --format png https://example.com output.file  // → PNG
```

## Environment Variables

### Core Configuration

- `PRINTEER_SILENT=1`: Suppress all library output
- `PRINTEER_MODE`: Operation mode (`single-shot` | `long-running`)
- `PRINTEER_ENVIRONMENT`: Environment (`development` | `production` | `test`)

### Browser Configuration

- `PUPPETEER_EXECUTABLE_PATH`: Custom browser executable path
- `PRINTEER_BUNDLED_ONLY=1`: Force bundled Chromium only
- `PRINTEER_BROWSER_TIMEOUT`: Browser timeout in milliseconds
- `PRINTEER_BROWSER_ARGS`: Comma-separated browser arguments

### UI and Output

- `NO_COLOR=1`: Disable colored output
- `CI=1`: Detected automatically, forces non-interactive mode
- `PRINTEER_DOCTOR_VERBOSE=1`: Enable verbose doctor output

## Exit Codes

### Standard Exit Codes

- `0`: Success, no issues found
- `1`: Error occurred or failures detected

### Doctor-Specific Exit Codes

- `0`: All diagnostics passed or warnings only
- `1`: One or more diagnostic failures detected

### Quiet Mode Behavior

When `--quiet` is specified:

- No output is produced
- Only exit codes indicate success/failure
- Useful for scripting and automation

## Development Guidelines

### Unified CLI Philosophy

The unified CLI follows these principles:

1. **Adaptive by Default**: Automatically choose the best UX for the environment
2. **Graceful Degradation**: Rich features fall back to basic functionality
3. **Lazy Loading**: Only load dependencies when actually needed
4. **Single Source of Truth**: One implementation handles all scenarios

### Adding New Commands

Use `commander.js` command registration with adaptive behavior:

```typescript
program
  .command('new-command')
  .description('Command description')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    const { quiet } = program.opts();

    // Adaptive behavior based on environment
    if (isInteractive && !quiet) {
      // Try interactive mode first
      try {
        await runInteractiveNewCommand(options);
      } catch {
        // Fall back to stdio mode
        await runStdioNewCommand(options);
      }
    } else {
      // Direct stdio mode
      await runStdioNewCommand(options);
    }
  });
```

### Interactive Feature Guidelines

1. **Conditional Loading**: Use lazy imports for UI dependencies
2. **Fallback Strategy**: Always provide a stdio alternative
3. **Environment Detection**: Check `isInteractive` before showing prompts
4. **Error Handling**: Gracefully handle cancellation and failures

```typescript
async function runInteractiveFeature() {
  if (!isInteractive || isQuiet) {
    return runStdioFallback();
  }

  try {
    const ui = await loadInteractiveUI();
    // Use interactive UI
  } catch (error) {
    // Fall back to stdio
    return runStdioFallback();
  }
}
```

### Doctor Module Extensions

To add new diagnostic checks, extend the diagnostic groups:

```typescript
const diagnosticGroups = [
  // Existing groups...
  {
    name: 'New Category',
    emoji: '🔧',
    method: () => doctor.checkNewCategory(),
    components: ['new-check-1', 'new-check-2']
  }
];
```

### Maintenance Benefits

The unified approach provides:

1. **Reduced Code Duplication**: Single implementation for all scenarios
2. **Consistent Behavior**: Same logic across all environments
3. **Easier Testing**: One CLI to test, not two
4. **Simplified Dependencies**: Optional interactive dependencies
5. **Better UX**: Automatic adaptation to user's environment

## API Reference

### Core Functions

```typescript
// Main CLI entry point
export async function runCLI(): Promise<void>;

// Interactive UI loader (lazy)
async function loadInteractiveUI(): Promise<UIComponents>;

// Adaptive mode runners
async function runInteractiveConvert(): Promise<void>;
async function runInteractiveDoctor(verbose?: boolean): Promise<void>;
async function runStandardDoctor(verbose?: boolean, json?: boolean, quiet?: boolean): Promise<void>;
```

### Environment Detection

```typescript
// Runtime environment checks
const isInteractive: boolean; // TTY + not CI + not quiet
const isQuiet: boolean;       // --quiet flag detected

// Version detection
function getVersion(): string;
```

### Options Class

```typescript
class Options {
  waitUntil: string;           // Navigation wait condition
  format: string;              // Page format (A4, Letter, etc.)
  outputType: ValidOutputType | null;  // pdf | png | null (auto-detect)
  outputFile: string | null;   // Output file path

  detectOutputType(filename: string, type?: ValidOutputType): ValidOutputType;
}
```

### Adaptive Behavior Utilities

```typescript
// Color output helpers (respects NO_COLOR)
const color = {
  bold: (s: string) => string;
  red: (s: string) => string;
  yellow: (s: string) => string;
  green: (s: string) => string;
  cyan: (s: string) => string;
  dim: (s: string) => string;
};

// Diagnostic formatting
function formatDoctorStyleSummary(results: DiagnosticResult[]): string;
function printRemediationGuide(results: DiagnosticResult[]): void;
```

## Error Handling

### Error Categories

1. **Validation Errors**: Invalid URLs, missing files, unsupported formats
2. **Browser Errors**: Browser launch failures, page load timeouts
3. **System Errors**: Permission issues, resource exhaustion
4. **Network Errors**: Connectivity issues, DNS resolution failures

### Error Output Strategies

#### Interactive Mode

```bash
❌ Error: Invalid URL format
   URL must start with http:// or https://

   Try: printeer https://example.com output.pdf
```

#### Programmatic Mode

```bash
Error: Invalid URL format
```

#### Quiet Mode

```bash
# No output, exit code 1 only
```

### Recovery Strategies

1. **Automatic Retries**: Browser launch failures with fallback configurations
2. **Alternative Paths**: System browser detection when bundled Chromium fails
3. **Graceful Degradation**: Reduced functionality when optimal setup unavailable

## Performance Considerations

### Startup Time Optimization

1. **Lazy Loading**: Heavy dependencies loaded only when needed
2. **Conditional Imports**: Interactive UI components imported only in TTY mode
3. **Minimal Validation**: Early validation to fail fast

### Memory Management

1. **Browser Lifecycle**: Proper cleanup of browser instances
2. **Resource Monitoring**: Built-in resource usage tracking
3. **Pool Management**: Efficient browser instance reuse (future enhancement)

### Network Optimization

1. **Connection Reuse**: Persistent connections where possible
2. **Timeout Configuration**: Appropriate timeouts for different environments
3. **Retry Logic**: Exponential backoff for transient failures

---

*For more information about the overall Printeer architecture, see the main project documentation and individual package READMEs.*
