# WIP

Contains the work in progress for the project and the ideas that I have.

## Options

| Option | Description | Default | Options |
| --- | --- | --- | --- |
| pagesize | The page size of the PDF | Auto | Auto, A1, A2, A3, A4, width*height (Eg. `800cm*600cm`) |
| type | The type of the output | PDF | PDF, PNG |
| output | The output file path | `none` | Eg. `./output.pdf` |
| waitfor | The waitfor option for Puppeteer | networkidle2 | networkidle0, networkidle2, load |
| timeout | The timeout option for Puppeteer | 30000 | Eg. `30000` |
| watermark | The watermark option for Puppeteer | `none` | Eg. `./watermark.png` |

## Reference Links

* Using Chrome Devtools Protocol with Puppeteer \
  <https://jsoverson.medium.com/using-chrome-devtools-protocol-with-puppeteer-737a1300bac0>

* HTML to PDF Conversion with Headless Chrome using Go \
  <https://medium.com/compass-true-north/go-service-to-convert-web-pages-to-pdf-using-headless-chrome-5fd9ffbae1af>

* Docraptor - HTML to PDF API \
  <https://docraptor.com/>
