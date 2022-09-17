import puppeteer from 'puppeteer';
import { normalize } from 'path';

// networkidle0 - consider navigation to be finished when there are no more than 0 network connections for at least 500 ms
// networkidle2 - consider navigation to be finished when there are no more than 2 network connections for at least 500 ms.


/**
 * Generate the report.
 * @param {string} reportName The name of the report.
 * @returns The promise of the report file.
 */
export default (url, outputFile, outputType='pdf') => {

  return new Promise(async (resolve, reject) => {
    outputFile        = normalize(outputFile);

    const browser = await puppeteer.launch({ headless: true });
    const page    = await browser.newPage();
    const res     = await page.goto(url, {waitUntil: 'networkidle0'});

    if (!res) {
      return reject(new Error("Could not load the page."));
    }

    if (res.status() !== 200) {
      reject(`Error: ${res.status()}: ${res.statusText()}`);
    } else {
      await page.pdf({ format: 'A4', path: outputFile });
      resolve(outputFile);
    }
    return await browser.close();
  })

}
