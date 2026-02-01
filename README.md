
# Printeer

> ⚠️ The master branch is not stable. Use the latest release instead.

Printeer is a litttle yet robust **print to PDF/PNG** utility. It employs Puppeteer, which makes it simple to print the website to PDF. It may be used as a command-line utility or a library. It does not yet support any print options yet. They will, however, be added in the future.

It automatically detects the output format from the file extension. If the extension is `.pdf`, it will print to PDF. If the extension is `.png`, it will print to PNG. If the extension is anything else, it will print to PDF.

## Run `printeer` as a command-line utility

Printeer has a comprehensive and easy-to-use command-line interface. It can be used as a library as well.


### Install printeer globally

```bash
npm install printeer -g
```

### Print a webpage to PDF or PNG

Printeer automatically detects the output format from the file extension. If the extension is `.pdf`, it will print to PDF. If the extension is `.png`, it will print to PNG. If the extension is anything else, it will print to PDF.

```bash
# Print a webpage to PDF
printeer <url> <output.pdf>

# Print a webpage to PNG
printeer <url> <output.png>
```

## Use printeer as a library

To use it as a library, install it locally and import it.

**Install printeer locally:**

```bash
npm install printeer
```

```js
// Import printeer
import printeer from 'printeer'

async function print() {
  // Print a webpage to PDF
  const resPDF = await printeer('https://google.com', 'google.pdf');
  console.log("PDF saved to", resPDF);

  // Print a webpage to PNG
  const resPNG = await printeer('https://google.com', 'google.png');
  console.log("PNG saved to", resPNG);
}

function main() {
  print().
  catch((e) => {
    console.log("An error occurred while printing the webpage.")
    console.error(e);
  });
}

// Run main function
main();
```

## Roadmap

- [x] Initial `printeer` cli command
- [x] Use it as library through `printeer` function
- [x] Support web to png printing
- [ ] Accept page size and other print options
- [ ] Run printeer as a service (with a web interface) with CDP (Chrome DevTools Protocol) to print webpages to PDF and PNG
- [ ] Support for Watermarking (Text/Image)

##
> **Note:** Master branch is not stable. Use the latest release instead.
