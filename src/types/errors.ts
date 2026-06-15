// Error handling interfaces and types

export enum ErrorType {
  CONFIGURATION = 'configuration',
  BROWSER_LAUNCH = 'browser_launch',
  PAGE_LOAD = 'page_load',
  RENDERING = 'rendering',
  RESOURCE_EXHAUSTION = 'resource_exhaustion',
  NETWORK = 'network',
  SECURITY = 'security',
  SYSTEM = 'system'
}

export interface PrinteerError extends Error {
  type: ErrorType;
  code: string;
  details: Record<string, unknown>;
  remediation?: string;
  retryable: boolean;
}

export interface ErrorHandler {
  handleError(error: PrinteerError): Promise<void>;
  classifyError(error: Error): ErrorType;
  createError(type: ErrorType, message: string, details?: Record<string, unknown>): PrinteerError;
  shouldRetry(error: PrinteerError): boolean;
}

export interface FallbackStrategy {
  canHandle(error: PrinteerError): boolean;
  execute(originalOptions: unknown): Promise<unknown>;
  getPriority(): number;
}