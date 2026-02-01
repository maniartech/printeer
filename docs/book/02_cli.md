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

### Image (Screenshot) Options

When generating PNG/JPEG output, these options control the screenshot behavior:

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--full-page` | Capture entire scrollable page | false |
| `--image-type <type>` | Output format (`png`, `jpeg`, `webp`) | png |
| `--quality <n>` | Image quality (1-100, JPEG/WebP only) | 90 |
| `--clip <region>` | Clip to region (`x,y,width,height`) | - |
| `--omit-background` | Transparent background (PNG only) | false |
| `--optimize-size` | Optimize file size | false |

**Example: Full Page Screenshot**
```bash
printeer convert https://docs.example.com page.png --full-page
```

**Example: High Quality Mobile Screenshot**
```bash
printeer convert https://app.com screenshot.jpeg \
  --viewport 375x812 \
  --mobile \
  --quality 95
```

### Viewport & Emulation

Control how the browser "sees" the page before printing.

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--viewport <size>` | Viewport size (e.g., `1920x1080`) | 1920x1080 |
| `--mobile` | Emulate mobile device (375×812, touch, 2x scale) | false |
| `--tablet` | Emulate tablet device (768×1024, touch, 2x scale) | false |
| `--device-scale <n>` | Device scale factor (e.g., `2` for Retina) | 1 |
| `--landscape-viewport` | Use landscape orientation | false |
| `--color-scheme <val>` | Emulate `prefers-color-scheme` (`light`/`dark`) | - |
| `--media-type <type>` | Emulate media type (`screen`/`print`) | screen |
| `--timezone <tz>` | Timezone (e.g., `America/New_York`) | - |
| `--locale <locale>` | Locale (e.g., `en-US`) | - |
| `--user-agent <ua>` | Custom user agent string | - |

**Example: Mobile Screenshot**
```bash
printeer convert https://twitter.com mobile.png --mobile --full-page
```

**Example: Tablet Screenshot**
```bash
printeer convert https://app.com tablet.png --tablet --full-page
```

### Wait Conditions

One of the hardest parts of web printing is knowing *when* the page is ready. Printeer offers multiple strategies:

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--wait-until <event>` | Wait event (`load`, `domcontentloaded`, `networkidle0`, `networkidle2`) | networkidle0 |
| `--wait-selector <css>` | Wait for a CSS selector to appear in the DOM | - |
| `--wait-timeout <ms>` | Maximum wait time in milliseconds | 30000 |
| `--wait-delay <ms>` | Additional delay after page load | - |
| `--wait-function <js>` | Custom JavaScript function to wait for | - |

**Example: SPA Rendering**
```bash
printeer convert https://spa-app.com dashboard.pdf \
  --wait-selector "#main-chart-loaded" \
  --wait-until networkidle0
```

**Example: Wait for Animation**
```bash
printeer convert https://animated-site.com page.png \
  --wait-delay 2000 \
  --full-page
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

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--block-resources <types>` | Block resource types (`image`, `font`, `stylesheet`, `script`) | - |
| `--disable-javascript` | Render only static HTML/CSS (very fast) | false |
| `--cache` / `--no-cache` | Control browser caching behavior | true |
| `--load-timeout <ms>` | Page load timeout in milliseconds | 30000 |
| `--retry <n>` | Retry attempts on failure | 2 |

**Example: Fast Text-Only PDF**
```bash
printeer convert https://news.site.com article.pdf \
  --block-resources image,font \
  --disable-javascript
```

**Example: Reliable Conversion with Retries**
```bash
printeer convert https://slow-site.com page.pdf \
  --load-timeout 60000 \
  --retry 3
```

In the next chapter, we'll see how to save these complex flag combinations into reusable **Configurations**.
