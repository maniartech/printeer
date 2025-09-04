// Core configuration management exports - now moved to config module
// Re-export from new location for compatibility
export { ConfigurationManager as DefaultConfigurationManagerImpl } from '../config/manager.js';
export { CliConfigLoader } from '../config/cli-config-loader.js';

// Doctor module exports
export { DefaultDoctorModule } from './doctor.js';

// Placeholder exports for other core modules (to be implemented in future tasks)
// These are placeholder classes that throw "Not implemented yet" errors
export class DefaultConfigurationManager {
  async load(): Promise<void> {
    throw new Error('Not implemented yet');
  }
  
  get(key: string): any {
    throw new Error('Not implemented yet');
  }
  
  set(key: string, value: any): void {
    throw new Error('Not implemented yet');
  }
  
  validate(): boolean {
    throw new Error('Not implemented yet');
  }
  
  async reload(): Promise<void> {
    throw new Error('Not implemented yet');
  }
  
  getEnvironment(): string {
    throw new Error('Not implemented yet');
  }
}

export class DefaultBrowserManager {
  async initialize(): Promise<void> {
    throw new Error('Not implemented yet');
  }
  
  async getBrowser(): Promise<any> {
    throw new Error('Not implemented yet');
  }
  
  async releaseBrowser(browser: any): Promise<void> {
    throw new Error('Not implemented yet');
  }
  
  async shutdown(): Promise<void> {
    throw new Error('Not implemented yet');
  }
  
  getPoolStatus(): any {
    throw new Error('Not implemented yet');
  }
  
  async warmUp(): Promise<void> {
    throw new Error('Not implemented yet');
  }
}

export class DefaultBrowserFactory {
  async createBrowser(): Promise<any> {
    throw new Error('Not implemented yet');
  }
  
  async validateBrowser(browser: any): Promise<boolean> {
    throw new Error('Not implemented yet');
  }
  
  async getBrowserVersion(browser: any): Promise<string> {
    throw new Error('Not implemented yet');
  }
  
  getOptimalLaunchOptions(): any {
    throw new Error('Not implemented yet');
  }
}

export class DefaultResourceManager {
  startMonitoring(): void {
    throw new Error('Not implemented yet');
  }
  
  stopMonitoring(): void {
    throw new Error('Not implemented yet');
  }
  
  getCurrentMetrics(): any {
    throw new Error('Not implemented yet');
  }
  
  checkResourcePressure(): boolean {
    throw new Error('Not implemented yet');
  }
  
  async enforceResourceLimits(): Promise<void> {
    throw new Error('Not implemented yet');
  }
  
  async cleanup(): Promise<void> {
    throw new Error('Not implemented yet');
  }
}

export class DefaultConverter {
  async convert(options: any): Promise<any> {
    throw new Error('Not implemented yet');
  }
  
  async validateOptions(options: any): Promise<boolean> {
    throw new Error('Not implemented yet');
  }
}