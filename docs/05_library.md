# Chapter 5: Printeer as a Library

While the CLI is powerful, the true potential of Printeer is unlocked when used as a Node.js library. It provides a type-safe, promise-based API for integrating PDF generation into your web servers, lambda functions, or build tools.

## Basic Integration

### Importing

```typescript
import printeer from 'printeer';
// OR commonjs
const printeer = require('printeer').default;
```

### The `printeer` Function

The main export is a function with the signature:
`printeer(url, output, type?, options?)`

```typescript
try {
  const resultPath = await printeer(
    'https://example.com',
    './output.pdf',
    null, // null = auto-detect from filename
    {
      format: 'A4',
      printBackground: true
    }
  );
  console.log('Generated:', resultPath);
} catch (error) {
  console.error('Print failed:', error);
}
```

## Advanced Library Features

### Custom Browser Management

By default, the library uses the **One-Shot Strategy** (opens/closes browser per call) for simple calls, and **Pool Strategy** for detected high-load scenarios. You can control this explicitly via the environment variable `PRINTEER_BROWSER_STRATEGY=pool`.

For advanced use you can also drive the pooled `DefaultBrowserManager` directly — e.g. to reuse browsers across many conversions and tear everything down cleanly:

```typescript
import { DefaultBrowserManager } from 'printeer';

const manager = new DefaultBrowserManager(undefined, { minSize: 1, maxSize: 4 });
await manager.initialize();

try {
  const instance = await manager.getBrowser();   // reuses or creates, never exceeds maxSize
  const page = await instance.browser.newPage();
  await page.goto('https://example.com', { waitUntil: 'networkidle0' });
  await page.pdf({ path: '/tmp/example.pdf', format: 'A4' });
  await page.close();
  await manager.releaseBrowser(instance);         // returns it to the pool
} finally {
  await manager.cleanup();                         // graceful shutdown (alias for shutdown())
}
```

Acquisition is bounded by `maxSize` even under concurrency, and callers that arrive while the pool is saturated wait for a browser to be released rather than spawning new ones.

### Integrating with Express.js

Here is a pattern for an on-demand PDF generation endpoint:

```typescript
import express from 'express';
import printeer from 'printeer';

const app = express();

app.get('/pdf', async (req, res) => {
  const targetUrl = req.query.url as string;
  const filename = `report-${Date.now()}.pdf`;
  const filePath = `/tmp/${filename}`;

  try {
    await printeer(targetUrl, filePath, 'pdf', {
      format: 'A4',
      waitTimeout: 5000
    });

    res.download(filePath); // Send file to user
  } catch (err) {
    res.status(500).send('Conversion failed');
  }
});
```

### The `EnhancedConfigurationManager`

For complex apps, you shouldn't hardcode options. Use Printeer's config manager to load settings from the host environment:

```typescript
import { EnhancedConfigurationManager } from 'printeer';

async function setup() {
  const cm = new EnhancedConfigurationManager();

  // Load from .printeerrc / printeer.config.*, environment overrides, and defaults
  const { config } = await cm.loadConfiguration();

  // Access resolved settings (all sections are optional; see EnhancedPrintConfiguration)
  console.log('Wait timeout:', config.wait?.timeout);
  console.log('Viewport width:', config.viewport?.width);
  console.log('PDF format:', config.pdf?.format);
}
```

## Type Definitions

Printeer exports comprehensive TypeScript interfaces. Key types include:

-   `EnhancedPrintConfiguration`: The full config schema.
-   `BatchJob`: Shape of a batch job object.
-   `DiagnosticResult`: Output from the doctor module.

```typescript
import type { EnhancedPrintConfiguration } from 'printeer';

const myConfig: EnhancedPrintConfiguration = {
  pdf: {
    format: 'A4', // Type-checked! 'A5' | 'Legal' ...
    scale: 1.5
  }
};
```

## Internal Architecture & Extension

For advanced users, Printeer re-exports its internal classes from the main entry point (`'printeer'`) — there are no separate subpath packages:

```typescript
import {
  DefaultBrowserManager,   // pooled browser management
  BatchProcessor,          // batch job processing
  DefaultDoctorModule,     // diagnostics
} from 'printeer';
```

You can subclass `BatchProcessor` to create custom reporting logic or extended retry mechanisms specific to your business rules.
