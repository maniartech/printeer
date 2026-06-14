/**
 * Unit coverage that the documented browser env vars are honoured. (BUG-010)
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  getBrowserExecutablePath,
  getHeadlessFromEnv,
  getDefaultBrowserOptions,
} from '../../src/utils/index';

afterEach(() => {
  delete process.env.PRINTEER_BROWSER_EXECUTABLE_PATH;
  delete process.env.PUPPETEER_EXECUTABLE_PATH;
  delete process.env.PRINTEER_BROWSER_HEADLESS;
});

describe('browser env options (BUG-010)', () => {
  it('prefers PRINTEER_BROWSER_EXECUTABLE_PATH over PUPPETEER_EXECUTABLE_PATH', () => {
    process.env.PRINTEER_BROWSER_EXECUTABLE_PATH = '/custom/chrome';
    process.env.PUPPETEER_EXECUTABLE_PATH = '/puppeteer/chrome';
    expect(getBrowserExecutablePath()).toBe('/custom/chrome');
  });

  it('falls back to PUPPETEER_EXECUTABLE_PATH', () => {
    process.env.PUPPETEER_EXECUTABLE_PATH = '/puppeteer/chrome';
    expect(getBrowserExecutablePath()).toBe('/puppeteer/chrome');
  });

  it('returns undefined when no path env var is set', () => {
    expect(getBrowserExecutablePath()).toBeUndefined();
  });

  it('PRINTEER_BROWSER_HEADLESS=false launches headed', () => {
    process.env.PRINTEER_BROWSER_HEADLESS = 'false';
    expect(getHeadlessFromEnv()).toBe(false);
  });

  it('PRINTEER_BROWSER_HEADLESS unset/true keeps new headless (true)', () => {
    expect(getHeadlessFromEnv()).toBe(true);
    process.env.PRINTEER_BROWSER_HEADLESS = 'true';
    expect(getHeadlessFromEnv()).toBe(true);
  });

  it('getDefaultBrowserOptions reflects the env vars', () => {
    process.env.PRINTEER_BROWSER_EXECUTABLE_PATH = '/x/chrome';
    process.env.PRINTEER_BROWSER_HEADLESS = 'false';
    const o = getDefaultBrowserOptions();
    expect(o.executablePath).toBe('/x/chrome');
    expect(o.headless).toBe(false);
  });
});
