
# Printeer

Printeer is a little utility that converts any webpage to PDF. It employs Puppeteer, which makes it simple to print the website to PDF. It may be used as a command-line utility or a library. It is written in TypeScript. It does not yet support any options. They  will, however, be added in the future. It is a pretty basic utility with no requirements other than Puppeteer.

## Installation

```bash
npm install printeer -g
```

## Usage/Examples

```bash
printeer <url> <output.pdf>
```

## Roadmap

- [x] Initial `printeer` cli command
- [x] Use it as library through `printeer` function
- [ ] Support web to png printing
- [ ] Accept page size option
