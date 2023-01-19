import puppeteer from 'puppeteer';
import { normalize } from 'path';


// networkidle0 - consider navigation to be finished when there are no more than 0 network connections for at least 500 ms
// networkidle2 - consider navigation to be finished when there are no more than 2 network connections for at least 500 ms.


/**
 * Generate the report.
 * @param {string} reportName The name of the report.
 * @returns The promise of the report file.
 */
export default async (url:string, outputFile:string, outputType:string|null=null) => {

  getPackageJson();

  return new Promise(async (resolve, reject) => {
    outputFile        = normalize(outputFile);
    if (!url.startsWith('http')) {
      reject('URL must start with http or https');
    }

    const launchOptions:any = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // <- Handle this better, only for root users!
    }

    // PUPPETEER_EXECUTABLE_PATH
    // Read the environment variable PUPPETEER_EXECUTABLE_PATH and use it as the path to the executable.
    // If the environment variable is not set, the default executable path is used.
    const exePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (exePath) {
      launchOptions.executablePath = exePath;
    }

    console.log("Launch Options:", launchOptions)

    let res:any = null
    let page:any = null
    let browser:any = null

    try {
      browser = await puppeteer.launch(launchOptions);
      page    = await browser.newPage();
      res     = await page.goto(url, {waitUntil: 'networkidle0'});
    } catch (err) {
      console.error("Browser Launch Error:", err)
      console.error("Browser Launch Options:", launchOptions)

      return reject(err);
    }

    if (!res) {
      return reject(new Error("Could not load the page."));
    }

    // Detect outputType

    outputType = detectOutputType(outputFile, outputType);

    if (res.status() !== 200) {
      reject(`Error: ${res.status()}: ${res.statusText()}`);
    } else {
      if (outputType === 'png') {
        await page.screenshot({ path: outputFile });
      } else {
        await page.pdf({ format: 'A4', path: outputFile });
      }

      // convert outputFile to absolute path
      outputFile = normalize(outputFile);

      resolve(outputFile);
    }

    return await browser.close();
  })
}

function getPackageJson() {
  // Print process exec path
  console.log("Process exec path", process.execPath)

}


function detectOutputType(fname:string, outputType:string|null) {
  const validOutputTypes:string[] = ['pdf', 'png']

  if (!outputType) {
    const ext = fname.split('.').pop()
    if (!ext) { return 'pdf' }
    if (validOutputTypes.includes(ext)) { return ext }
    return 'pdf'
  }

  if (!validOutputTypes.includes(outputType)) { return 'pdf' }
  return outputType
}