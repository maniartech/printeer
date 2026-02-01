# Appendix A: Command Reference

## `convert` (alias `c`)
Convert a URL to a PDF or PNG file.

| Flag | Description | Default |
| :--- | :--- | :--- |
| `-u, --url <url>` | URL to convert (repeatable) | - |
| `-o, --output <file>` | Output filename (repeatable) | - |
| `--output-dir <dir>` | Directory for output files | `./` |
| `--format <type>` | Paper format (A4, Letter, etc.) | `A4` |
| `--orientation <type>` | `portrait` / `landscape` | `portrait` |
| `--viewport <size>` | Viewport dimensions (WxH) | `1920x1080` |
| `--scale <n>` | CSS zoom factor | `1` |
| `--print-background` | Print background graphics | `false` |
| `--wait-until <event>` | `load`, `domcontentloaded`, `networkidle0`, `networkidle2` | `load` |
| `--wait-timeout <ms>` | Max wait time | `30000` |
| `--wait-selector <css>` | Wait for element to verify render | - |
| `--mobile` | Emulate mobile device | `false` |
| `--auth <u:p>` | Basic Auth credentials | - |
| `--cookies <json>` | JSON string of cookies | - |
| `--headers <json>` | JSON string of custom headers | - |
| `--disable-javascript`| Block JS execution | `false` |
| `-p, --preset <name>` | Use a config preset | - |
| `-e, --env <name>` | Select config environment | - |
| `-q, --quiet` | Suppress standard output | `false` |
| `--dry-run` | Show what would happen | `false` |

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
