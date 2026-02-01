<div align="center">

# 🖨️ Printeer

**Web-to-PDF/PNG conversion done right**

[![npm version](https://img.shields.io/npm/v/printeer.svg?style=flat-square)](https://www.npmjs.com/package/printeer)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=flat-square)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/node/v/printeer.svg?style=flat-square)](https://nodejs.org)

*Convert any web page to pixel-perfect PDFs or high-quality screenshots with a single command.*

[Quick Start](#quick-start) • [CLI Usage](#cli-usage) • [Library API](#library-api) • [Configuration](#configuration) • [Contributing](#contributing)

</div>

---

## ✨ Features

- 🚀 **Zero Config** — Works out of the box with sensible defaults
- 📄 **PDF & PNG** — Auto-detects format from file extension
- 📱 **Device Emulation** — Mobile, tablet, and custom viewports
- 🔄 **Full Page Capture** — Scroll and capture entire pages with lazy-loaded content
- ⚡ **Batch Processing** — Convert hundreds of URLs with concurrency control
- 🔐 **Authentication** — Basic auth, cookies, and custom headers
- 🩺 **Built-in Diagnostics** — `printeer doctor` checks your environment
- 📦 **Dual Use** — CLI tool and Node.js library

## Quick Start

### Install

```bash
npm install -g printeer
```

### Use

```bash
# Convert webpage to PDF
printeer convert https://example.com page.pdf

# Screenshot in mobile view
printeer convert https://example.com mobile.png --mobile --full-page

# Check your environment
printeer doctor
```

## CLI Usage

### Basic Conversion

```bash
# URL → PDF (auto-detected from extension)
printeer convert https://example.com output.pdf

# URL → PNG screenshot
printeer convert https://example.com screenshot.png

# Full page screenshot with mobile emulation
printeer convert https://example.com mobile.png --mobile --full-page
```

### Device Emulation

```bash
# Mobile (iPhone-like: 375×812, 2x scale, touch enabled)
printeer convert https://example.com mobile.png --mobile --full-page

# Tablet (iPad-like: 768×1024, 2x scale, touch enabled)
printeer convert https://example.com tablet.png --tablet --full-page

# Custom viewport
printeer convert https://example.com custom.png --viewport 1440x900
```

### PDF Options

```bash
# A4 landscape with background graphics
printeer convert https://example.com report.pdf \
  --format A4 \
  --orientation landscape \
  --print-background

# Custom margins
printeer convert https://example.com document.pdf --margins "1in"
```

### Wait Strategies

```bash
# Wait for specific element
printeer convert https://spa-app.com dashboard.pdf \
  --wait-selector "#chart-loaded"

# Wait for network idle
printeer convert https://example.com page.pdf --wait-until networkidle0
```

### Batch Processing

```bash
# Process multiple URLs from a file
printeer batch jobs.json --concurrency 5 --continue-on-error
```

**jobs.json:**
```json
[
  { "url": "https://example.com", "output": "example.pdf" },
  { "url": "https://google.com", "output": "google.pdf" }
]
```

### System Diagnostics

```bash
# Check browser, fonts, and environment
printeer doctor

# Verbose output
printeer doctor --verbose
```

## Library API

### Installation

```bash
npm install printeer
```

### Basic Usage

```typescript
import printeer from 'printeer';

// Simple conversion
await printeer('https://example.com', 'output.pdf');

// With options
await printeer('https://example.com', 'screenshot.png', null, {
  viewport: { width: 1920, height: 1080 },
  fullPage: true
});
```

### Advanced Configuration

```typescript
import printeer from 'printeer';

await printeer('https://example.com', 'report.pdf', null, {
  format: 'A4',
  printBackground: true,
  margin: { top: '1in', bottom: '1in' },
  waitUntil: 'networkidle0'
});
```

### Custom Browser Management

```typescript
import { DefaultBrowserManager } from 'printeer';

const browserManager = new DefaultBrowserManager({
  headless: true,
  args: ['--no-sandbox']
});

await browserManager.initialize();
const browser = await browserManager.getBrowser();
// Use browser...
await browserManager.cleanup();
```

## Configuration

Printeer supports configuration files for complex setups:

**.printeerrc.json:**
```json
{
  "page": {
    "format": "A4",
    "orientation": "portrait"
  },
  "viewport": {
    "width": 1920,
    "height": 1080
  },
  "wait": {
    "until": "networkidle0",
    "timeout": 30000
  }
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `PRINTEER_BROWSER_EXECUTABLE_PATH` | Custom Chrome/Chromium path |
| `PRINTEER_BROWSER_HEADLESS` | `true` / `false` |
| `PRINTEER_LOG_LEVEL` | `error`, `warn`, `info`, `debug` |

## Requirements

- **Node.js** 16.8 or higher
- **Chromium** (auto-installed with Puppeteer)

## Troubleshooting

Run the built-in diagnostic tool:

```bash
printeer doctor --verbose
```

This checks:
- ✅ Node.js version
- ✅ Chromium installation
- ✅ Display server (for headless environments)
- ✅ Font availability
- ✅ Sandbox configuration

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

```bash
# Clone the repository
git clone https://github.com/maniartech/printeer.git
cd printeer

# Install dependencies
npm install

# Build
node scripts/build.js

# Run tests
npm test

# Run the CLI in development
node scripts/run-cli.js convert https://example.com test.pdf
```

## License

[ISC](LICENSE) © [ManiarTech](https://maniartech.com)

---

<div align="center">

**[Documentation](./docs)** • **[Changelog](./CHANGELOG.md)** • **[Issues](https://github.com/maniartech/printeer/issues)**

Made with ❤️ by [ManiarTech](https://maniartech.com)

</div>
