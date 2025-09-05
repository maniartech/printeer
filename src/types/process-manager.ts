// Process lifecycle management interfaces

export type ProcessMode = 'single-shot' | 'long-running';
export type ShutdownReason = 'ttl-expired' | 'signal' | 'error' | 'manual';

export interface ProcessState {
  mode: ProcessMode;
  startTime: Date;
  lastActivity: Date;
  isShuttingDown: boolean;
  activeRequests: number;
  totalRequests: number;
}

export interface ShutdownOptions {
  reason: ShutdownReason;
  timeout: number;
  force: boolean;
}

export interface ProcessManager {
  start(mode: ProcessMode): Promise<void>;
  stop(options?: Partial<ShutdownOptions>): Promise<void>;
  getState(): ProcessState;
  isHealthy(): boolean;
  resetCoolingPeriod(): void;
}

export interface GracefulShutdown {
  onShutdownSignal(signal: string): Promise<void>;
  drainRequests(timeoutMs: number): Promise<void>;
  cleanupResources(): Promise<void>;
  forceShutdown(): Promise<void>;
}