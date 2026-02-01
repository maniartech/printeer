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

By default, the library uses the **One-Shot Strategy** (opens/closes browser per call) for simple calls, and **Pool Strategy** for detected high-load scenarios. You can control this explicitly via environment variables (`PRINTEER_BROWSER_STRATEGY=pool`) or by using the internal managers.

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
import { EnhancedConfigurationManager } from 'printeer/config';

async function setup() {
  const cm = new EnhancedConfigurationManager();

  // Load from .printeerrc, ENV, and defaults
  const { config } = await cm.loadConfiguration();

  // Access resolved settings
  console.log('Using timeout:', config.wait.timeout);
  console.log('Headless mode:', config.browser.headless);
}
```

## Type Definitions

Printeer exports comprehensive TypeScript interfaces. Key types include:

-   `EnhancedPrintConfiguration`: The full config schema.
-   `BatchJob`: Shape of a batch job object.
-   `DiagnosticResult`: Output from the doctor module.

```typescript
import type { EnhancedPrintConfiguration } from 'printeer/config/types/enhanced-config.types';

const myConfig: EnhancedPrintConfiguration = {
  pdf: {
    format: 'A4', // Type-checked! 'A5' | 'Legal' ...
    scale: 1.5
  }
};
```

## Internal Architecture & Extension

For advanced users, Printeer exports its internal modules:

-   **`printeer/printing`**: Browser management classes (`DefaultBrowserManager`).
-   **`printeer/batch`**: The `BatchProcessor` class.
-   **`printeer/diagnostics`**: The `DoctorModule`.

You can subclass `BatchProcessor` to create custom reporting logic or extended retry mechanisms specific to your business rules.
