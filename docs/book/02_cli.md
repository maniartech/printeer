# Chapter 2: The Command Line Interface

The **Printeer CLI** is the primary interface for many users. It has been significantly re-engineered in version 1.2+ ("Enhanced CLI") to support flexible argument parsing, rich configuration options, and robust error handling.

## The `convert` Command

The workhorse of Printeer is the `convert` command (aliased as `c`). It is designed to be intuitive for simple tasks while exposing deep configurability for power users.

### Basic Syntax & Positional Arguments

```bash
printeer [convert|c] [url] [output] [options]
```

-   **url**: The full URL to convert. Must start with `http://` or `https://`.
-   **output**: The destination path. Supports relative and absolute paths.

**Example:**
```bash
printeer c https://google.com ./downloads/google.pdf
```

### Flexible URL-Output Pairing

A unique feature of the Printeer CLI is its ability to handle multiple conversions in a single command invocation. This is highly efficient as it reuses the browser instance.

**Explicit Flag Pairing:**
Use `-u` (url) and `-o` (output) multiple times:

```bash
printeer convert \
  -u https://google.com -o google.pdf \
  -u https://bing.com   -o bing.png \
  -u https://yahoo.com  -o yahoo.pdf
```

**Implicit Naming:**
If you omit the `-o` flag, Printeer attempts to generate a smart filename based on the page title or URL structure.

```bash
printeer convert -u https://example.com --output-dir ./dist
# Generates ./dist/Example_Domain.pdf
```

### Page & Layout Options

Customize the physical properties of your PDF output.

| Flag | Description | Default |
| :--- | :--- | :--- |
| `-f, --format <format>` | Paper format (A4, Letter, Legal, Tabloid) | A4 |
| `--orientation <type>` | `portrait` or `landscape` | portrait |
| `--margins <val>` | CSS-style margins (e.g., `"1cm"` or `"1cm 2cm"`) | None |
| `--scale <factor>` | Zoom factor (0.1 to 2.0) | 1.0 |
| `--print-background` | Print CSS background colors/images | false |

**Example: Receipt Printing**
```bash
printeer convert https://store.com/order/1 receipt.pdf \
  --format A6 \
  --margins "5mm" \
  --print-background
```

### Viewport & Emulation

Control how the browser "sees" the page before printing.

-   `--viewport <size>`: Sets the window size (e.g., `1920x1080` or `375x667`).
-   `--mobile`: Emulates mobile touch events and user agent.
-   `--device-scale <factor>`: Sets DPI scaling (e.g., `2` for Retina).
-   `--color-scheme <scheme>`: Emulates `prefers-color-scheme` (`light` or `dark`).

**Example: Mobile Screenshot**
```bash
printeer convert https://twitter.com mobile-view.png \
  --viewport 375x812 \
  --mobile \
  --device-scale 3
```

### Wait Conditions

One of the hardest parts of web printing is knowing *when* the page is ready. Printeer offers multiple strategies:

-   `--wait-until <event>`:
    -   `load`: `window.onload` fires.
    -   `networkidle0`: No network connections for 500ms (strict).
    -   `networkidle2`: Max 2 connections (good for polling sites).
-   `--wait-selector <css>`: Wait for a specific element to appear in the DOM.
-   `--wait-timeout <ms>`: Max time to wait (default: 30000ms).

**Example: SPA Rendering**
```bash
printeer convert https://spa-app.com dashboard.pdf \
  --wait-selector "#main-chart-loaded" \
  --wait-until networkidle0
```

### Authentication

Access protected resources using basic auth or custom headers.

-   `--auth username:password`: HTTP Basic Authentication.
-   `--cookies <json_string>`: Inject session cookies.
-   `--headers <json_string>`: Inject custom HTTP headers (e.g., Authorization Bearer).

**Example: Authenticated API**
```bash
printeer convert https://api.admin.com/report report.pdf \
  --headers '{"Authorization": "Bearer xyz123"}'
```

---

## Interactive Mode

If you are exploring the tool or forget a specific flag, simply run:

```bash
printeer
# OR
printeer interactive
```

This launches a wizard utilizing `@clack/prompts` to guide you through:
1.  URL entry.
2.  Output formatting.
3.  Format selection (if ambiguous).
4.  Real-time progress feedback.

---

## Performance Tuning

For power users running heavy workloads:

-   `--block-resources <types>`: Block heavy assets (`image`, `font`, `stylesheet`, `script`) to speed up loading.
-   `--disable-javascript`: Render only static HTML/CSS (extremely fast).
-   `--cache` / `--no-cache`: Control browser caching behavior.

**Example: Fast Text-Only PDF**
```bash
printeer convert https://news.site.com article.pdf \
  --block-resources image,font \
  --disable-javascript
```

In the next chapter, we'll see how to save these complex flag combinations into reusable **Configurations**.
