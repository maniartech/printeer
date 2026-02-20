# Appendix A: Command Reference

## `convert` (alias `c`)
Convert a URL to a PDF or PNG file.

### General Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `-u, --url <url>` | URL to convert (repeatable) | - |
| `-o, --output <file>` | Output filename (repeatable) | - |
| `--output-dir <dir>` | Directory for output files | `./` |
| `--output-pattern <pat>` | Filename pattern | - |
| `--output-conflict <str>` | Conflict resolution (`override`, `copy`, `skip`, `prompt`) | `copy` |
| `--title-fallback` | Use webpage title for filename | `true` |
| `--url-fallback` | Use URL-based algorithm when title unavailable | `false` |
| `-c, --config <path>` | Configuration file path | - |
| `-p, --preset <name>` | Use a config preset | - |
| `-e, --env <name>` | Select config environment | - |
| `-q, --quiet` | Suppress standard output | `false` |
| `--verbose` | Verbose output | `false` |
| `--dry-run` | Show what would happen | `false` |
| `--output-metadata` | Include metadata in output | `false` |

### PDF Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `-f, --format <type>` | Paper format (A4, Letter, etc.) | `A4` |
| `--custom-size <size>` | Custom page size (e.g., `210mm,297mm`) | - |
| `--orientation <type>` | `portrait` / `landscape` | `portrait` |
| `--scale <n>` | CSS zoom factor | `1` |
| `--margins <val>` | CSS-style margins | - |
| `--print-background` | Print background graphics | `false` |
| `--no-print-background` | Don't print background graphics | - |
| `--header-template <tpl>` | Header template name or file path | - |
| `--footer-template <tpl>` | Footer template name or file path | - |
| `--header-footer` | Display header and footer | `false` |
| `--prefer-css-page-size` | Prefer CSS page size | `false` |
| `--tagged-pdf` | Generate tagged PDF (accessibility) | `false` |
| `--pdf-outline` | Generate PDF outline/bookmarks | `false` |

### Image Options (PNG/JPEG)

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--full-page` | Capture entire scrollable page | `false` |
| `--image-type <type>` | Output format (`png`, `jpeg`, `webp`) | `png` |
| `--quality <n>` | Image quality (1-100) | `90` |
| `--clip <region>` | Clip region (`x,y,width,height`) | - |
| `--omit-background` | Transparent background (PNG) | `false` |
| `--optimize-size` | Optimize file size | `false` |

### Viewport & Emulation

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--viewport <size>` | Viewport dimensions (WxH) | `1920x1080` |
| `--mobile` | Emulate mobile device (375×812, touch) | `false` |
| `--tablet` | Emulate tablet device (768×1024, touch) | `false` |
| `--device-scale <n>` | Device scale factor | `1` |
| `--landscape-viewport` | Use landscape orientation | `false` |
| `--color-scheme <val>` | `light` / `dark` | - |
| `--media-type <type>` | `screen` / `print` | `screen` |
| `--timezone <tz>` | Timezone emulation | - |
| `--locale <locale>` | Locale emulation | - |
| `--user-agent <ua>` | Custom user agent | - |

### Wait Conditions

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--wait-until <event>` | `load`, `domcontentloaded`, `networkidle0`, `networkidle2` | `networkidle0` |
| `--wait-timeout <ms>` | Max wait time | `30000` |
| `--wait-selector <css>` | Wait for element to appear | - |
| `--wait-delay <ms>` | Additional delay after load | - |
| `--wait-function <js>` | Custom wait function | - |

### Authentication

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--auth <u:p>` | Basic Auth credentials | - |
| `--cookies <json>` | JSON string of cookies | - |
| `--headers <json>` | JSON string of custom headers | - |

### Performance

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--disable-javascript`| Block JS execution | `false` |
| `--block-resources <types>` | Block resource types | - |
| `--cache` / `--no-cache` | Browser caching | `true` |
| `--load-timeout <ms>` | Page load timeout | `30000` |
| `--retry <n>` | Retry attempts on failure | `2` |

---

## `batch` (alias `b`)
Process a list of jobs from a file.

| Flag | Description | Default |
| :--- | :--- | :--- |
| `-o, --output-dir <dir>` | Output directory | `./output` |
| `-c, --concurrency <n>` | Max parallel browsers | `3` |
| `--continue-on-error` | Verify all jobs attempt to run | `false` |
| `--report <fmt>` | `json`, `csv`, or `html` report format | `json` |
| `--report-file <path>` | Save report to file | - |
| `--retry <n>` | Retry attempts for failed jobs | `2` |
| `--progress` | Show progress bar | `false` |
| `--dry-run` | Validate batch file without processing | `false` |
| `--max-memory <mb>` | Max heap before restart | - |
| `--cleanup` | Clean process artifacts | `true` |
| `-q, --quiet` | Suppress output except errors | `false` |
| `--verbose` | Verbose output | `false` |

---

## `doctor`
Run system diagnostics.

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--verbose` | Show detailed logs | `false` |
| `--json` | Output JSON result | `false` |

---

## `config`
Manage configuration files.

| Subcommand | Description |
| :--- | :--- |
| `init` | Create a new `printeer.config.json` |
| `validate` | Check config file syntax |
| `show` | Display currently resolved config |
| `presets` | List available presets |
| `export-from-cli` | Export CLI command as JSON/YAML configuration |
| `generate-cli` | Generate CLI command from JSON/YAML configuration |

---

## `template` (alias `tpl`)
Manage PDF templates (Header/Footer).

| Subcommand | Description |
| :--- | :--- |
| `list` | List available templates |
| `show <name>` | Display template source |
| `preview <name>` | Render template to HTML |

---

## `cleanup`
Clean up zombie browser processes and manage browser lifecycle.

| Subcommand | Description |
| :--- | :--- |
| `status` | Show current browser process status |
| `kill-all` | Emergency kill all Chrome/Chromium processes |
| `monitor` | Start monitoring browser processes |

| Flag | Description | Default |
| :--- | :--- | :--- |
| `-f, --force` | Force kill all Chrome/Chromium processes | `false` |
| `-v, --verbose` | Show detailed output | `false` |
| `--dry-run` | Show what would be cleaned up without actually doing it | `false` |
| `--timeout <ms>` | Timeout for cleanup operations in milliseconds | `30000` |
