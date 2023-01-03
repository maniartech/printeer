
# Printeer

Printeer is a little utility that converts any webpage to PDF. It employs Puppeteer, which makes it simple to print the website to PDF. It may be used as a command-line utility or a library. It does not yet support any print options yet. They will, however, be added in the future.

It automatically detects the output format from the file extension. If the extension is `.pdf`, it will print to PDF. If the extension is `.png`, it will print to PNG. If the extension is anything else, it will print to PDF.

## Installation

```bash
npm install printeer -g
```

## Usage/Examples

```bash
printeer <url> <output.pdf|png>
```

## Roadmap

- [x] Initial `printeer` cli command
- [x] Use it as library through `printeer` function
- [x] Support web to png printing
- [ ] Accept page size and other print options
- [ ] Run printeer as a service (with a web interface) with CDP (Chrome DevTools Protocol) to print webpages to PDF and PNG

##
> **Note:** Master branch is not stable. Use the latest release instead.
