/**
 * CLI Types
 * Type definitions for enhanced CLI system
 */

import type { EnhancedPrintConfiguration } from '../../config/types/enhanced-config.types';

export interface UrlOutputPair {
  url: string;
  output?: string;
  index: number;
}

export interface ConfigMapping {
  cliOption: string;
  jsonPath: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  parser?: (value: any) => any;
  serializer?: (value: any) => string;
  validator?: (value: any) => boolean;
}

export interface CliOptions {
  // URLs and outputs
  url?: string[];
  output?: string[];
  outputDir?: string;
  outputPattern?: string;
  outputConflict?: 'override' | 'copy' | 'skip' | 'prompt';
  titleFallback?: boolean;
  urlFallback?: boolean;

  // Configuration
  config?: string;
  preset?: string;
  env?: string;

  // Page options
  format?: string;
  orientation?: string;
  margins?: string;
  customSize?: string;

  // Viewport options
  viewport?: string;
  deviceScale?: number;
  mobile?: boolean;
  landscapeViewport?: boolean;

  // Wait conditions
  waitUntil?: string;
  waitTimeout?: number;
  waitSelector?: string;
  waitDelay?: number;
  waitFunction?: string;

  // Media and emulation
  mediaType?: string;
  colorScheme?: string;
  timezone?: string;
  locale?: string;
  userAgent?: string;

  // PDF specific
  scale?: number;
  printBackground?: boolean;
  noPrintBackground?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  headerFooter?: boolean;
  preferCssPageSize?: boolean;
  taggedPdf?: boolean;
  pdfOutline?: boolean;

  // Image specific
  quality?: number;
  imageType?: string;
  fullPage?: boolean;
  clip?: string;
  optimizeSize?: boolean;

  // Authentication
  auth?: string;
  headers?: string;
  cookies?: string;

  // Performance
  blockResources?: string;
  disableJavascript?: boolean;
  cache?: boolean;
  noCache?: boolean;
  loadTimeout?: number;
  retry?: number;

  // Processing options
  concurrency?: number;
  continueOnError?: boolean;
  maxMemory?: string;
  cleanup?: boolean;

  // Output options
  quiet?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
  outputMetadata?: boolean;
}

export interface ConversionResult {
  outputFile: string;
  success: boolean;
  duration: number;
  metadata?: {
    pageCount?: number;
    fileSize?: number;
    dimensions?: { width: number; height: number };
    loadTime?: number;
  };
}

export interface EquivalenceValidationResult {
  isEquivalent: boolean;
  differences: string[];
}

export class SkipFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkipFileError';
  }
}