// Configuration interfaces and types

export type OperationMode = 'single-shot' | 'long-running';
export type Environment = 'development' | 'production' | 'test';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export type LogFormat = 'json' | 'text';
export type LogDestination = 'console' | 'file' | 'both';

export interface BrowserPoolConfig {
  min: number;
  max: number;
  idleTimeout: number;
}

export interface BrowserConfig {
  executablePath?: string;
  headless: boolean | 'auto' | 'new';
  args: string[];
  timeout: number;
  pool: BrowserPoolConfig;
}

export interface ResourceLimits {
  maxMemoryMB: number;
  maxCpuPercent: number;
  maxDiskMB: number;
  maxConcurrentRequests: number;
}

export interface LongRunningConfig {
  coolingPeriodMs: number;
  healthCheckInterval: number;
  maxUptime: number;
}

export interface LoggingConfig {
  level: LogLevel;
  format: LogFormat;
  destination: LogDestination;
}

export interface SecurityConfig {
  allowedDomains?: string[];
  blockedDomains?: string[];
  maxFileSize: number;
  sanitizeInput: boolean;
}

export interface Configuration {
  mode: OperationMode;
  environment: Environment;
  browser: BrowserConfig;
  resources: ResourceLimits;
  longRunning: LongRunningConfig;
  logging: LoggingConfig;
  security: SecurityConfig;
}

export interface ConfigurationManager {
  load(): Promise<Configuration>;
  get<T>(key: string): T;
  set(key: string, value: any): void;
  validate(): ValidationResult;
  reload(): Promise<void>;
  getEnvironment(): Environment;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}