import * as os from 'os';

// Checks if the current user is root.
export const isCurrentUserRoot = function():Boolean {
  if (process && process.getuid) {
    return process.getuid() === 0; // UID 0 is always root
  }

  if (os.userInfo().username == 'root') {
    return true;
  }

  return false;
}

/**
 * Resolve a custom browser executable path from the environment.
 *
 * Honours the documented `PRINTEER_BROWSER_EXECUTABLE_PATH` first, then the
 * Puppeteer-native `PUPPETEER_EXECUTABLE_PATH` as a fallback. (BUG-010)
 */
export const getBrowserExecutablePath = function(): string | undefined {
  return process.env.PRINTEER_BROWSER_EXECUTABLE_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
};

/**
 * Resolve headless mode from the environment. `PRINTEER_BROWSER_HEADLESS=false`
 * (or `0`) launches a headed browser; anything else keeps the default new
 * headless mode. (BUG-010)
 */
export const getHeadlessFromEnv = function(): boolean {
  const raw = process.env.PRINTEER_BROWSER_HEADLESS;
  if (raw !== undefined && /^(false|0|no)$/i.test(raw.trim())) {
    return false;
  }
  // puppeteer 22+ : `true` is the new headless mode (formerly "new")
  return true;
};

/**
 * Get the default browser options returns an object with the default options for the browser.
 */
export const getDefaultBrowserOptions = function():any {
  const launchOptions:any = {
    headless: getHeadlessFromEnv(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // <- Handle this better, only for root users!
  }

  // Honour the documented executable-path env vars (PRINTEER_BROWSER_EXECUTABLE_PATH
  // preferred, PUPPETEER_EXECUTABLE_PATH as fallback). (BUG-010)
  const exePath = getBrowserExecutablePath();
  if (exePath) {
    launchOptions.executablePath = exePath;
  }

  return launchOptions;
}