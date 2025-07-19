// Conversion-related interfaces and types

export type OutputType = 'pdf' | 'png';
export type WaitUntilOption = 'load' | 'networkidle0' | 'networkidle2';

export interface Viewport {
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  isLandscape?: boolean;
}

export interface Margin {
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  left?: string | number;
}

export interface BrowserOptions {
  headless?: boolean | 'auto';
  executablePath?: string;
  args?: string[];
  timeout?: number;
  viewport?: Viewport;
  userAgent?: string;
}

export interface RenderOptions {
  waitUntil?: WaitUntilOption;
  timeout?: number;
  quality?: number;
  format?: string;
  margin?: Margin;
  fullPage?: boolean;
  omitBackground?: boolean;
}

export interface PrinteerOptions {
  url: string;
  outputFile: string;
  outputType?: OutputType;
  browserOptions?: BrowserOptions;
  renderOptions?: RenderOptions;
}

export interface ConversionResult {
  outputFile: string;
  outputType: OutputType;
  fileSize: number;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: {
    pageTitle?: string;
    pageUrl: string;
    timestamp: Date;
    browserVersion?: string;
  };
}

export interface ConversionMetrics {
  totalConversions: number;
  successfulConversions: number;
  failedConversions: number;
  averageDuration: number;
  totalProcessingTime: number;
  lastConversion?: Date;
}