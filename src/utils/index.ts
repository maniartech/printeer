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
 * Get the default browser options returns an object with the default options for the browser.
 */
export const getDefaultBrowserOptions = function():any {
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

  return launchOptions;
}