# Chapter 3: Configuration & Environments

As your usage of Printeer grows complex (cookies, wait selectors, precise margins), passing CLI flags becomes unwieldy. Printeer provides a hierarchical configuration system inspired by tools like ESLint and Prettier.

## Configuration Resolution Strategy

Printeer resolves settings in a specific priority order (Cascading Configuration). A setting found at a higher level overrides all lower levels.

1.  **CLI Arguments**: Explicit flags (e.g., `--format A4`) always win.
2.  **Environment Variables**: `PRINTEER_` prefixed variables (e.g., `PRINTEER_BROWSER_TIMEOUT`).
3.  **Project Configuration**: A file in the current directory (`.printeerrc.json` or `printeer.config.json`).
4.  **User Configuration**: A global file at `~/.printeer/config.json`.
5.  **Built-in Defaults**: Printeer's safe fallbacks (A4, Portrait, etc.).

## The Configuration File

To create a starter configuration, run:

```bash
printeer config init
```

This generates a `printeer.config.json` file. Here is a comprehensive example of the schema:

```json
{
  "$schema": "./node_modules/printeer/schemas/config.schema.json",
  "defaults": {
    "page": {
      "format": "Letter",
      "orientation": "portrait",
      "margins": {
        "top": "0.5in",
        "right": "0.5in",
        "bottom": "0.5in",
        "left": "0.5in"
      }
    },
    "pdf": {
      "printBackground": true,
      "scale": 0.95,
      "displayHeaderFooter": false
    },
    "wait": {
      "until": "networkidle0",
      "timeout": 60000
    },
    "viewport": {
      "width": 1280,
      "height": 800,
      "deviceScaleFactor": 2
    }
  },
  "environments": {
    "development": {
      "browser": {
        "headless": false,
        "devtools": true
      }
    },
    "production": {
      "browser": {
        "headless": true,
        "pool": {
          "min": 2,
          "max": 10,
          "idleTimeout": 30000
        }
      }
    }
  }
}
```

### Environment Awareness

The `environments` key is powerful. Printeer creates a unified config by merging `defaults` with the specific environment section active at runtime.

You activate an environment via the `-e` CLI flag or `NODE_ENV`:

```bash
# Uses production settings (headless: true, pool: 2-10)
printeer convert ... --env production

# Uses development settings (headless: visible window)
printeer convert ... --env development
```

This allows you to debug locally with a visible browser window while keeping your CI/CD pipeline strictly headless and optimized.

## Using Presets

**Presets** are named configuration fragments that you can mix and match. They are defined in your config file under the `presets` key.

**Definition:**
```json
"presets": {
  "mobile-screenshot": {
    "viewport": { "width": 375, "height": 812, "isMobile": true },
    "image": { "fullPage": true }
  },
  "legal-doc": {
    "page": { "format": "Legal", "margins": "1in" },
    "pdf": { "displayHeaderFooter": true }
  }
}
```

**Usage:**
Invoke a preset with the `-p` or `--preset` flag:

```bash
printeer convert url output.png -p mobile-screenshot
```

## Environment Variables

For 12-factor apps and containerized deployments, every configuration option can be set via environment variables.

| Variable | Config Path | Description |
| :--- | :--- | :--- |
| `PRINTEER_BROWSER_EXECUTABLE_PATH` | `browser.executablePath` | Path to Chrome binary |
| `PRINTEER_BROWSER_TIMEOUT` | `wait.timeout` | Default wait timeout |
| `PRINTEER_BROWSER_STRATEGY` | - | `pool` or `oneshot` (Force specific strategy) |
| `PRINTEER_LOG_LEVEL` | `logging.level` | `debug`, `info`, `warn`, `error` |

## Hot Reloading

When running Printeer in **Long-Running Mode** (e.g., as part of a service using the library API), the configuration manager monitors the loaded config files.

If you edit `.printeerrc.json`, Printeer detects the change, re-validates the schema, and seamlessly updates the active configuration without needing a process restart. This is particularly useful for tweaking PDF margins or timeouts in a live development environment.
