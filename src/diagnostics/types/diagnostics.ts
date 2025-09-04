// Diagnostic and health check interfaces

export type DiagnosticStatus = 'pass' | 'warn' | 'fail';

export interface DiagnosticResult {
  status: DiagnosticStatus;
  component: string;
  message: string;
  remediation?: string;
  // Using any here for flexible diagnostic payloads across many checks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: Record<string, any>;
}

export interface SystemEnvironment {
  os: string;
  arch: string;
  nodeVersion: string;
  isDocker: boolean;
  isHeadless: boolean;
}

export interface BrowserInfo {
  available: boolean;
  path: string;
  version: string;
  launchable: boolean;
  source?: 'env' | 'system' | 'bundled' | 'unknown';
}

export interface ResourceInfo {
  totalMemory: number;
  availableMemory: number;
  cpuCores: number;
  diskSpace: number;
}

export interface DependencyInfo {
  fonts: string[];
  displayServer: boolean;
  permissions: string[];
}

export interface SystemDiagnostics {
  timestamp: Date;
  environment: SystemEnvironment;
  browser: BrowserInfo;
  resources: ResourceInfo;
  dependencies: DependencyInfo;
}

export interface DoctorModule {
  runFullDiagnostics(): Promise<DiagnosticResult[]>;
  checkSystemDependencies(): Promise<DiagnosticResult[]>;
  validateBrowserInstallation(): Promise<DiagnosticResult[]>;
  testBrowserLaunch(): Promise<DiagnosticResult>;
  checkEnvironmentCompatibility(): Promise<DiagnosticResult[]>;
  generateReport(): Promise<string>;
}
</content>
</invoke>