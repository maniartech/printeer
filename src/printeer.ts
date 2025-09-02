import puppeteer from 'puppeteer';
import { normalize } from 'path';
import { getDefaultBrowserOptions } from './utils';


// networkidle0 - consider navigation to be finished when there are no more than 0 network connections for at least 500 ms
// networkidle2 - consider navigation to be finished when there are no more than 2 network connections for at least 500 ms.


/**
 * Generate the report.
 * @param {string} reportName The name of the report.
 * @returns The promise of the report file.
 */
export default async (url:string, outputFile:string, outputType:string|null=null, browserOptions:any) => {
  const silent = process.env.PRINTEER_SILENT === '1';
  if (!silent) {
    getPackageJson();
  }

  outputFile = normalize(outputFile);
  if (!url.startsWith('http')) {
    throw new Error('URL must start with http or https');
  }

  let launchOptions:any = getDefaultBrowserOptions()

  if (browserOptions) {
    launchOptions  = { ...launchOptions, ...browserOptions}
  }

  // PUPPETEER_EXECUTABLE_PATH
  // Read the environment variable PUPPETEER_EXECUTABLE_PATH and use it as the path to the executable.
  // If the environment variable is not set, the default executable path is used.
  const exePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (exePath) {
    launchOptions.executablePath = exePath;
  }

  // Ensure fully headless behavior even if upstream toggles default
  launchOptions.headless = true;
  const baseArgs: string[] = Array.isArray(launchOptions.args) ? launchOptions.args : [];
  const extraArgs = [
    baseArgs.some((a:string)=>a.startsWith('--headless')) ? null : '--headless=new',
    process.platform === 'win32' ? '--no-startup-window' : null
  ].filter(Boolean) as string[];
  launchOptions.args = Array.from(new Set([...baseArgs, ...extraArgs]));

  let res:any = null
  let page:any = null
  let browser: any = null

  // Prefer not to wait for the initial blank target to avoid policy-related hangs
  (launchOptions as any).waitForInitialPage = false;

  try {
    browser = await puppeteer.launch(launchOptions);
    page    = await browser.newPage();
    res     = await page.goto(url, {waitUntil: 'networkidle0'});
  } catch (err) {
    // Fallback: if pipe was requested, retry with websocket + random devtools port
    const needFallback = (launchOptions as any).pipe === true;
    if (needFallback) {
      const fallback:any = { ...launchOptions, pipe: false };
      const args: string[] = Array.isArray(fallback.args) ? fallback.args.slice() : [];
      // ensure a random port; remove any fixed port duplicates
      const filtered = args.filter((a) => !/^--remote-debugging-port(=|$)/.test(a));
      filtered.push('--remote-debugging-port=0');
      fallback.args = Array.from(new Set(filtered));
      try {
        browser = await puppeteer.launch(fallback);
        page    = await browser.newPage();
        res     = await page.goto(url, {waitUntil: 'networkidle0'});
      } catch (err2) {
        if (!silent) {
          console.error("Browser Launch Error:", err2)
          console.error("Browser Launch Options:", fallback)
        }
        throw err2;
      }
    } else {
      if (!silent) {
        console.error("Browser Launch Error:", err)
        console.error("Browser Launch Options:", launchOptions)
      }
      throw err;
    }
  }

  if (!res) {
    throw new Error("Could not load the page.");
  }

  // Detect outputType
  outputType = detectOutputType(outputFile, outputType);

  if (res.status() !== 200) {
    throw new Error(`Error: ${res.status()}: ${res.statusText()}`);
  }

  try {
    if (outputType === 'png') {
      await page.screenshot({ path: outputFile });
    } else {
      await page.pdf({ format: 'A4', path: outputFile });
    }

    // convert outputFile to absolute path
    outputFile = normalize(outputFile);

    return outputFile;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
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