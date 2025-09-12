/**
 * Enhanced Configuration Types for Printeer CLI
 * Comprehensive type definitions for professional web-to-print capabilities
 */

export type PageFormat = 'A4' | 'A3' | 'A2' | 'A1' | 'A0' | 'Letter' | 'Legal' | 'Tabloid' | 'Ledger';
export type PageOrientation = 'portrait' | 'landscape';
export type WaitCondition = 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
export type MediaType = 'screen' | 'print';
export type ColorScheme = 'light' | 'dark' | 'no-preference';
export type ReducedMotion = 'reduce' | 'no-preference';
export type ImageType = 'png' | 'jpeg' | 'webp';
export type ImageEncoding = 'base64' | 'binary';
export type ResourceType = 'document' | 'stylesheet' | 'image' | 'media' | 'font' | 'script' | 'texttrack' | 'xhr' | 'fetch' | 'eventsource' | 'websocket' | 'manifest' | 'other';

export interface MarginConfig {
  top: string | number;
  right: string | number;
  bottom: string | number;
  left: string | number;
}

export interface CustomPageSize {
  width: string | number;
  height: string | number;
}

export interface PageConfiguration {
  format?: PageFormat | CustomPageSize;
  orientation?: PageOrientation;
  margins?: MarginConfig | string;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

export interface PDFConfiguration {
  printBackground?: boolean;
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  preferCSSPageSize?: boolean;
  generateTaggedPDF?: boolean;
  scale?: number;
  omitBackground?: boolean;
  outline?: boolean;
  metadata?: PDFMetadata;
}

export interface ClipRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageConfiguration {
  fullPage?: boolean;
  clip?: ClipRegion;
  quality?: number;
  type?: ImageType;
  encoding?: ImageEncoding;
  optimizeForSize?: boolean;
}

export interface ViewportConfiguration {
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  isLandscape?: boolean;
}

export interface StabilityCheck {
  enabled: boolean;
  threshold: number;
  timeout: number;
}

export interface WaitConfiguration {
  until?: WaitCondition;
  timeout?: number;
  selector?: string;
  delay?: number;
  customFunction?: string;
  stabilityCheck?: StabilityCheck;
}

export interface BasicAuth {
  username: string;
  password: string;
}

export interface CookieConfig {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface AuthConfiguration {
  basic?: BasicAuth;
  headers?: Record<string, string>;
  cookies?: CookieConfig[];
  userAgent?: string;
}

export interface GeolocationConfig {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface EmulationConfiguration {
  mediaType?: MediaType;
  colorScheme?: ColorScheme;
  reducedMotion?: ReducedMotion;
  timezone?: string;
  locale?: string;
  geolocation?: GeolocationConfig;
}

export interface NetworkThrottling {
  offline: boolean;
  downloadThroughput: number;
  uploadThroughput: number;
  latency: number;
}

export interface PerformanceConfiguration {
  blockResources?: ResourceType[];
  maxConcurrent?: number;
  retryAttempts?: number;
  cacheEnabled?: boolean;
  javascriptEnabled?: boolean;
  loadTimeout?: number;
  networkThrottling?: NetworkThrottling;
}

export interface EnhancedPrintConfiguration {
  page?: PageConfiguration;
  pdf?: PDFConfiguration;
  image?: ImageConfiguration;
  viewport?: ViewportConfiguration;
  wait?: WaitConfiguration;
  auth?: AuthConfiguration;
  emulation?: EmulationConfiguration;
  performance?: PerformanceConfiguration;
}

export interface ConfigurationPreset {
  name: string;
  description?: string;
  extends?: string;
  config: Partial<EnhancedPrintConfiguration>;
}

export interface EnvironmentConfig {
  [environment: string]: Partial<EnhancedPrintConfiguration>;
}

export interface ConfigurationFile {
  $schema?: string;
  defaults?: Partial<EnhancedPrintConfiguration>;
  environments?: EnvironmentConfig;
  presets?: Record<string, ConfigurationPreset>;
}

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  formattedErrors: string[];
}

export interface ConfigurationSource {
  type: 'file' | 'preset' | 'environment' | 'cli' | 'default';
  path?: string;
  name?: string;
}

export interface ResolvedConfiguration {
  config: EnhancedPrintConfiguration;
  sources: ConfigurationSource[];
  warnings: string[];
}