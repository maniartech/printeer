# Appendix A: Command Reference

## `convert` (alias `c`)
Convert a URL to a PDF or PNG file.

### General Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `-u, --url <url>` | URL to convert (repeatable) | - |
| `-o, --output <file>` | Output filename (repeatable) | - |
| `--output-dir <dir>` | Directory for output files | `./` |
| `-p, --preset <name>` | Use a config preset | - |
| `-e, --env <name>` | Select config environment | - |
| `-q, --quiet` | Suppress standard output | `false` |
| `--dry-run` | Show what would happen | `false` |

### PDF Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--format <type>` | Paper format (A4, Letter, etc.) | `A4` |
| `--orientation <type>` | `portrait` / `landscape` | `portrait` |
| `--scale <n>` | CSS zoom factor | `1` |
| `--margins <val>` | CSS-style margins | - |
| `--print-background` | Print background graphics | `false` |

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
| `--concurrency <n>` | Max parallel browsers | `3` |
| `--continue-on-error` | Verify all jobs attempt to run | `false` |
| `--report <fmt>` | `json` or `csv` report format | `json` |
| `--report-file <path>` | Save report to file | - |
| `--max-memory <mb>` | Max heap before restart | - |
| `--cleanup` | Clean process artifacts | `true` |

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

---

## `template` (alias `tpl`)
Manage PDF templates (Header/Footer).

| Subcommand | Description |
| :--- | :--- |
| `list` | List available templates |
| `show <name>` | Display template source |
| `preview <name>` | Render template to HTML |
