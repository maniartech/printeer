# WIP

Contains the work in progress for the project and the ideas that I have.

## Options Status

| Option | Description | Status | Current Implementation |
| --- | --- | --- | --- |
| `pagesize` | The page size of the PDF | ✅ Ready | `--format` and `--viewport` |
| `type` | The type of the output | ✅ Ready | Auto-detected from extension |
| `output` | The output file path | ✅ Ready | Positional arg or `--output` |
| `waitfor` | The waitfor option for Puppeteer | ✅ Ready | `--wait-until` |
| `timeout` | The timeout option for Puppeteer | ✅ Ready | `--wait-timeout` |
| `watermark` | The watermark option for Puppeteer | 🚧 TODO | Not implemented |

## Reference Links

* Using Chrome Devtools Protocol with Puppeteer \
  <https://jsoverson.medium.com/using-chrome-devtools-protocol-with-puppeteer-737a1300bac0>

* HTML to PDF Conversion with Headless Chrome using Go \
  <https://medium.com/compass-true-north/go-service-to-convert-web-pages-to-pdf-using-headless-chrome-5fd9ffbae1af>

* Docraptor - HTML to PDF API \
  <https://docraptor.com/>
