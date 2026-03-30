# Managing the Browser Engine

Printeer delegates browser management to Puppeteer. Printeer itself does not install Chrome directly.

## Upgrading Chromium

### Option 1: Update Printeer (Recommended)

```bash
npm install -g printeer@latest
```

### Option 2: Override Puppeteer in a Library Project

```bash
npm install puppeteer@latest
```

## Using a Custom Browser Installation

In managed environments, you may prefer a system-installed browser.

Set `PUPPETEER_EXECUTABLE_PATH` to your browser binary.

Linux:

```bash
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
printeer convert https://example.com out.pdf
```

Dockerfile:

```dockerfile
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
```

Verify with doctor:

```bash
printeer doctor
```

The report should show the environment-provided executable path as the source.
