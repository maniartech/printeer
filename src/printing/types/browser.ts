// Browser management interfaces and types

import { Browser } from 'puppeteer';

export interface BrowserInstance {
  id: string;
  browser: Browser;
  createdAt: Date;
  lastUsed: Date;
  isHealthy: boolean;
  processId?: number;
}

export interface BrowserPoolMetrics {
  created: number;
  destroyed: number;
  reused: number;
  errors: number;
}

export interface BrowserPoolState {
  available: BrowserInstance[];
  busy: Map<string, BrowserInstance>;
  total: number;
  maxSize: number;
  minSize: number;
  lastCleanup: Date;
  metrics: BrowserPoolMetrics;
}

export interface PoolStatus {
  totalBrowsers: number;
  availableBrowsers: number;
  busyBrowsers: number;
  healthyBrowsers: number;
  unhealthyBrowsers: number;
  uptime: number;
  metrics: BrowserPoolMetrics;
}

export interface BrowserManager {
  initialize(): Promise<void>;
  getBrowser(): Promise<BrowserInstance>;
  releaseBrowser(browser: BrowserInstance): Promise<void>;
  shutdown(): Promise<void>;
  getPoolStatus(): PoolStatus;
  warmUp(): Promise<void>;
}

export interface BrowserFactory {
  createBrowser(): Promise<Browser>;
  validateBrowser(browser: Browser): Promise<boolean>;
  getBrowserVersion(browser: Browser): Promise<string>;
  getOptimalLaunchOptions(): unknown;
}