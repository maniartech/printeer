import { readFile, writeFile, access } from 'fs/promises';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { CliConfigLoader } from './cli-config-loader.js';
import type {
  Configuration,
  Environment,
  ValidationResult,
  ConfigurationManager as IConfigurationManager,
  BrowserConfig,
  ResourceLimits,
  LoggingConfig,
  SecurityConfig,
  LongRunningConfig
} from './types/configuration.js';

/**
 * Helper function to merge browser config safely
 */
function mergeBrowserConfig(existing: Partial<BrowserConfig> | undefined, updates: Partial<BrowserConfig>): BrowserConfig {
  return {
    executablePath: updates.executablePath ?? existing?.executablePath,
    headless: updates.headless ?? existing?.headless ?? 'auto',
    args: updates.args ?? existing?.args ?? [],
    timeout: updates.timeout ?? existing?.timeout ?? 30000,
    pool: updates.pool ?? existing?.pool ?? { min: 0, max: 2, idleTimeout: 60000 }
  };
}

/**
 * Helper function to merge resource limits safely
 */
function mergeResourceLimits(existing: Partial<ResourceLimits> | undefined, updates: Partial<ResourceLimits>): ResourceLimits {
  return {
    maxMemoryMB: updates.maxMemoryMB ?? existing?.maxMemoryMB ?? 512,
    maxCpuPercent: updates.maxCpuPercent ?? existing?.maxCpuPercent ?? 90,
    maxDiskMB: updates.maxDiskMB ?? existing?.maxDiskMB ?? 100,
    maxConcurrentRequests: updates.maxConcurrentRequests ?? existing?.maxConcurrentRequests ?? 3
  };
}

/**
 * Helper function to merge logging config safely
 */
function mergeLoggingConfig(existing: Partial<LoggingConfig> | undefined, updates: Partial<LoggingConfig>): LoggingConfig {
  return {
    level: updates.level ?? existing?.level ?? 'debug',
    format: updates.format ?? existing?.format ?? 'text',
    destination: updates.destination ?? existing?.destination ?? 'console'
  };
}

/**
 * Helper function to merge security config safely
 */
function mergeSecurityConfig(existing: Partial<SecurityConfig> | undefined, updates: Partial<SecurityConfig>): SecurityConfig {
  return {
    allowedDomains: updates.allowedDomains ?? existing?.allowedDomains,
    blockedDomains: updates.blockedDomains ?? existing?.blockedDomains,
    maxFileSize: updates.maxFileSize ?? existing?.maxFileSize ?? 10485760,
    sanitizeInput: updates.sanitizeInput ?? existing?.sanitizeInput ?? true
  };
}

/**
 * Configuration Manager - Handles loading, validation, and management of configuration
 * Supports multiple configuration sources with proper precedence
 */
export class ConfigurationManager implements IConfigurationManager {
  private config: Configuration | null = null;
  private configPaths: string[] = [];
  private watchers: Map<string, any> = new Map();

  constructor(private baseDir: string = process.cwd()) {
    this.initializeConfigPaths();
  }

  /**
   * Initialize configuration file paths in order of precedence
   */
  private initializeConfigPaths(): void {
    this.configPaths = [
      // Local project config (highest precedence)
      join(this.baseDir, 'printeer.config.json'),
      join(this.baseDir, '.printeer.json'),

      // User home config
      join(homedir(), '.printeer', 'config.json'),
      join(homedir(), '.printeer.json'),

      // System config (lowest precedence)
      '/etc/printeer/config.json'
    ];
  }

  /**
   * Load configuration from multiple sources with proper precedence
   * Order: defaults < config files < environment variables < CLI arguments
   */
  async load(cliArgs?: string[]): Promise<Configuration> {
    const baseConfig = this.getDefaultConfiguration();
    let mergedConfig = { ...baseConfig };

    // Load from config files (reverse order for proper precedence)
    for (const configPath of [...this.configPaths].reverse()) {
      try {
        await access(configPath);
        const fileConfig = await this.loadConfigFile(configPath);
        mergedConfig = this.mergeConfigurations(mergedConfig, fileConfig);
      } catch (error) {
        // Config file doesn't exist or can't be read - continue
        // But re-throw JSON parsing errors
        if (error instanceof Error && error.message.includes('JSON')) {
          throw error;
        }
      }
    }

    // Override with environment variables
    const envConfig = this.loadEnvironmentConfig();
    mergedConfig = this.mergeConfigurations(mergedConfig, envConfig);

    // Override with CLI arguments (highest precedence)
    const cliConfig = CliConfigLoader.parseCliArgs(cliArgs);
    mergedConfig = this.mergeConfigurations(mergedConfig, cliConfig);

    // Validate the final configuration
    const validation = this.validateConfiguration(mergedConfig);
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }

    this.config = mergedConfig;
    return mergedConfig;
  }

  /**
   * Get a configuration value by key path (e.g., 'browser.timeout')
   */
  get<T>(key: string): T {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    const keys = key.split('.');
    let value: any = this.config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        throw new Error(`Configuration key '${key}' not found`);
      }
    }

    return value as T;
  }

  /**
   * Set a configuration value by key path
   */
  set(key: string, value: any): void {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    const keys = key.split('.');
    const lastKey = keys.pop()!;
    let target: any = this.config;

    for (const k of keys) {
      if (!target[k] || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }

    target[lastKey] = value;
  }

  /**
   * Validate the current configuration
   */
  validate(): ValidationResult {
    if (!this.config) {
      return {
        valid: false,
        errors: ['Configuration not loaded'],
        warnings: []
      };
    }

    return this.validateConfiguration(this.config);
  }

  /**
   * Reload configuration from all sources
   */
  async reload(cliArgs?: string[]): Promise<void> {
    await this.load(cliArgs);
  }

  /**
   * Get the current environment
   */
  getEnvironment(): Environment {
    // Check PRINTEER_ENV first (highest priority), then NODE_ENV
    const envVar = process.env.PRINTEER_ENV || process.env.NODE_ENV;
    if (envVar === 'development' || envVar === 'production' || envVar === 'test') {
      return envVar;
    }

    // Check if we're in a known development environment
    if (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development') {
      return 'development';
    }

    // Check if we're in a known production environment
    if (process.env.NODE_ENV === 'prod' || process.env.NODE_ENV === 'production') {
      return 'production';
    }

    // Default based on other indicators
    if (process.env.CI || process.env.DOCKER || process.env.KUBERNETES_SERVICE_HOST) {
      return 'production';
    }

    return 'development';
  }

  /**
   * Get default configuration with environment-specific overrides
   */
  private getDefaultConfiguration(): Configuration {
    const environment = this.getEnvironment();
    const isProduction = environment === 'production';
    const isDevelopment = environment === 'development';

    return {
      mode: 'single-shot',
      environment,
      browser: {
        headless: isProduction ? "new" : 'auto',
        args: this.getDefaultBrowserArgs(environment),
        timeout: 30000,
        pool: {
          min: isProduction ? 1 : 0,
          max: isProduction ? 5 : 2,
          idleTimeout: 300000 // 5 minutes
        }
      },
      resources: {
        maxMemoryMB: isProduction ? 1024 : 512,
        maxCpuPercent: isProduction ? 80 : 50,
        maxDiskMB: 100,
        maxConcurrentRequests: isProduction ? 10 : 3
      },
      longRunning: {
        coolingPeriodMs: 300000, // 5 minutes
        healthCheckInterval: 30000, // 30 seconds
        maxUptime: 86400000 // 24 hours
      },
      logging: {
        level: isDevelopment ? 'debug' : 'info',
        format: isProduction ? 'json' : 'text',
        destination: 'console'
      },
      security: {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        sanitizeInput: true
      }
    };
  }

  /**
   * Get default browser arguments based on environment
   */
  private getDefaultBrowserArgs(environment: Environment): string[] {
    const baseArgs = [
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ];

    if (environment === 'production') {
      return [
        ...baseArgs,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        '--disable-javascript'
      ];
    }

    return baseArgs;
  }

  /**
   * Load configuration from a JSON file
   */
  private async loadConfigFile(filePath: string): Promise<Partial<Configuration>> {
    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load config file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadEnvironmentConfig(): Partial<Configuration> {
    const config: Partial<Configuration> = {};

    // Mode
    if (process.env.PRINTEER_MODE) {
      config.mode = process.env.PRINTEER_MODE as any;
    }

    // Browser configuration
    if (process.env.PRINTEER_BROWSER_EXECUTABLE) {
      config.browser = mergeBrowserConfig(config.browser, {
        executablePath: process.env.PRINTEER_BROWSER_EXECUTABLE
      });
    }

    if (process.env.PRINTEER_BROWSER_HEADLESS) {
      const headless = process.env.PRINTEER_BROWSER_HEADLESS.toLowerCase();
      config.browser = mergeBrowserConfig(config.browser, {
        headless: headless === 'auto' ? 'auto' : headless === 'new' ? 'new' : headless === 'true'
      });
    }

    if (process.env.PRINTEER_BROWSER_TIMEOUT) {
      config.browser = mergeBrowserConfig(config.browser, {
        timeout: parseInt(process.env.PRINTEER_BROWSER_TIMEOUT, 10)
      });
    }

    // Resource limits
    if (process.env.PRINTEER_MAX_MEMORY_MB) {
      config.resources = mergeResourceLimits(config.resources, {
        maxMemoryMB: parseInt(process.env.PRINTEER_MAX_MEMORY_MB, 10)
      });
    }

    if (process.env.PRINTEER_MAX_CPU_PERCENT) {
      config.resources = mergeResourceLimits(config.resources, {
        maxCpuPercent: parseInt(process.env.PRINTEER_MAX_CPU_PERCENT, 10)
      });
    }

    if (process.env.PRINTEER_MAX_CONCURRENT_REQUESTS) {
      config.resources = mergeResourceLimits(config.resources, {
        maxConcurrentRequests: parseInt(process.env.PRINTEER_MAX_CONCURRENT_REQUESTS, 10)
      });
    }

    // Logging
    if (process.env.PRINTEER_LOG_LEVEL) {
      config.logging = mergeLoggingConfig(config.logging, {
        level: process.env.PRINTEER_LOG_LEVEL as any
      });
    }

    if (process.env.PRINTEER_LOG_FORMAT) {
      config.logging = mergeLoggingConfig(config.logging, {
        format: process.env.PRINTEER_LOG_FORMAT as any
      });
    }

    // Security
    if (process.env.PRINTEER_ALLOWED_DOMAINS) {
      config.security = mergeSecurityConfig(config.security, {
        allowedDomains: process.env.PRINTEER_ALLOWED_DOMAINS.split(',').map(d => d.trim())
      });
    }

    if (process.env.PRINTEER_BLOCKED_DOMAINS) {
      config.security = mergeSecurityConfig(config.security, {
        blockedDomains: process.env.PRINTEER_BLOCKED_DOMAINS.split(',').map(d => d.trim())
      });
    }

    return config;
  }

  /**
   * Deep merge two configuration objects
   */
  private mergeConfigurations(base: Configuration, override: Partial<Configuration>): Configuration {
    const result = { ...base };

    for (const [key, value] of Object.entries(override)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && !Array.isArray(value) &&
          key in result && typeof (result as any)[key] === 'object' &&
          !Array.isArray((result as any)[key])) {
          // Deep merge nested objects
          (result as any)[key] = this.deepMerge((result as any)[key], value);
        } else {
          (result as any)[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * Recursively merge two objects
   */
  private deepMerge(target: any, source: any): unknown {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && !Array.isArray(value) &&
          key in result && typeof result[key] === 'object' &&
          !Array.isArray(result[key])) {
          result[key] = this.deepMerge(result[key], value);
        } else {
          result[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * Comprehensive configuration validation
   */
  private validateConfiguration(config: Configuration): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate mode
    if (!['single-shot', 'long-running'].includes(config.mode)) {
      errors.push(`Invalid mode: ${config.mode}. Must be 'single-shot' or 'long-running'`);
    }

    // Validate environment
    if (!['development', 'production', 'test'].includes(config.environment)) {
      errors.push(`Invalid environment: ${config.environment}. Must be 'development', 'production', or 'test'`);
    }

    // Validate browser configuration
    if (config.browser) {
      if (typeof config.browser.headless !== 'boolean' && config.browser.headless !== 'auto' && config.browser.headless !== 'new') {
        errors.push('browser.headless must be boolean, "auto", or "new"');
      }

      if (config.browser.timeout <= 0) {
        errors.push('browser.timeout must be positive');
      }

      if (config.browser.pool) {
        if (config.browser.pool.min < 0) {
          errors.push('browser.pool.min must be non-negative');
        }
        if (config.browser.pool.max <= 0) {
          errors.push('browser.pool.max must be positive');
        }
        if (config.browser.pool.min > config.browser.pool.max) {
          errors.push('browser.pool.min cannot be greater than browser.pool.max');
        }
        if (config.browser.pool.idleTimeout <= 0) {
          errors.push('browser.pool.idleTimeout must be positive');
        }
      }
    }

    // Validate resource limits
    if (config.resources) {
      if (config.resources.maxMemoryMB <= 0) {
        errors.push('resources.maxMemoryMB must be positive');
      }
      if (config.resources.maxCpuPercent <= 0 || config.resources.maxCpuPercent > 100) {
        errors.push('resources.maxCpuPercent must be between 1 and 100');
      }
      if (config.resources.maxDiskMB <= 0) {
        errors.push('resources.maxDiskMB must be positive');
      }
      if (config.resources.maxConcurrentRequests <= 0) {
        errors.push('resources.maxConcurrentRequests must be positive');
      }

      // Warnings for resource limits
      if (config.resources.maxMemoryMB < 256) {
        warnings.push('resources.maxMemoryMB is very low (< 256MB), may cause performance issues');
      }
      if (config.resources.maxConcurrentRequests > 20) {
        warnings.push('resources.maxConcurrentRequests is very high (> 20), may cause resource exhaustion');
      }
    }

    // Validate long-running configuration
    if (config.longRunning) {
      if (config.longRunning.coolingPeriodMs <= 0) {
        errors.push('longRunning.coolingPeriodMs must be positive');
      }
      if (config.longRunning.healthCheckInterval <= 0) {
        errors.push('longRunning.healthCheckInterval must be positive');
      }
      if (config.longRunning.maxUptime <= 0) {
        errors.push('longRunning.maxUptime must be positive');
      }
    }

    // Validate logging configuration
    if (config.logging) {
      if (!['error', 'warn', 'info', 'debug'].includes(config.logging.level)) {
        errors.push(`Invalid logging.level: ${config.logging.level}`);
      }
      if (!['json', 'text'].includes(config.logging.format)) {
        errors.push(`Invalid logging.format: ${config.logging.format}`);
      }
      if (!['console', 'file', 'both'].includes(config.logging.destination)) {
        errors.push(`Invalid logging.destination: ${config.logging.destination}`);
      }
    }

    // Validate security configuration
    if (config.security) {
      if (config.security.maxFileSize <= 0) {
        errors.push('security.maxFileSize must be positive');
      }

      // Validate domain lists
      if (config.security.allowedDomains) {
        for (const domain of config.security.allowedDomains) {
          if (!this.isValidDomain(domain)) {
            errors.push(`Invalid domain in allowedDomains: ${domain}`);
          }
        }
      }

      if (config.security.blockedDomains) {
        for (const domain of config.security.blockedDomains) {
          if (!this.isValidDomain(domain)) {
            errors.push(`Invalid domain in blockedDomains: ${domain}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate domain format
   */
  private isValidDomain(domain: string): boolean {
    // Basic domain validation - can be enhanced
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain) || domain === '*' || domain.startsWith('*.');
  }

  /**
   * Enable hot-reloading for long-running mode
   */
  enableHotReload(): void {
    if (this.watchers.size > 0) {
      return; // Already enabled
    }

    // Note: In a real implementation, you'd use fs.watch or chokidar
    // For now, we'll implement a simple polling mechanism
    const pollInterval = 5000; // 5 seconds

    for (const configPath of this.configPaths) {
      const intervalId = setInterval(async () => {
        try {
          await access(configPath);
          const stats = await import('fs').then(fs => fs.promises.stat(configPath));
          const lastModified = stats.mtime.getTime();

          if (!this.watchers.has(`${configPath}_lastModified`) ||
            this.watchers.get(`${configPath}_lastModified`) < lastModified) {
            this.watchers.set(`${configPath}_lastModified`, lastModified);
            await this.reload();
          }
        } catch (error) {
          // File doesn't exist or can't be accessed
        }
      }, pollInterval);

      this.watchers.set(configPath, intervalId);
    }
  }

  /**
   * Disable hot-reloading
   */
  disableHotReload(): void {
    for (const [path, intervalId] of this.watchers) {
      if (typeof intervalId === 'number') {
        clearInterval(intervalId);
      }
    }
    this.watchers.clear();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.disableHotReload();
    this.config = null;
  }
}