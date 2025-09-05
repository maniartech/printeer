import { readFile, access, watch } from 'fs/promises';
import { resolve, join } from 'path';
import { homedir } from 'os';
import { FSWatcher } from 'fs';
import type {
  Configuration,
  ConfigurationManager,
  ValidationResult,
  Environment,
  OperationMode,
  LogLevel,
  LogFormat,
  LogDestination
} from './types/configuration';

/**
 * Environment detection utilities
 */
export class EnvironmentDetector {
  /**
   * Detect the current environment based on NODE_ENV and other indicators
   */
  static detectEnvironment(): Environment {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();

    // Check NODE_ENV first
    if (nodeEnv === 'production') return 'production';
    if (nodeEnv === 'test') return 'test';
    if (nodeEnv === 'development') return 'development';

    // Check for test indicators
    if (process.env.CI || process.env.VITEST || process.env.JEST_WORKER_ID) {
      return 'test';
    }

    // Check for production indicators
    if (process.env.NODE_ENV === undefined && (
      process.env.PM2_HOME ||
      process.env.KUBERNETES_SERVICE_HOST ||
      process.env.DOCKER_CONTAINER ||
      process.env.AWS_EXECUTION_ENV ||
      process.env.HEROKU_APP_NAME
    )) {
      return 'production';
    }

    // Default to development
    return 'development';
  }

  /**
   * Check if running in a container environment
   */
  static isContainerEnvironment(): boolean {
    return !!(
      process.env.DOCKER_CONTAINER ||
      process.env.KUBERNETES_SERVICE_HOST ||
      process.env.container ||
      process.env.PODMAN_VERSION
    );
  }

  /**
   * Check if running in a headless environment
   */
  static isHeadlessEnvironment(): boolean {
    return !!(
      process.env.CI ||
      process.env.HEADLESS ||
      !process.env.DISPLAY ||
      this.isContainerEnvironment()
    );
  }

  /**
   * Check if running in a cloud environment
   */
  static isCloudEnvironment(): boolean {
    return !!(
      process.env.AWS_EXECUTION_ENV ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.AZURE_FUNCTIONS_ENVIRONMENT ||
      process.env.HEROKU_APP_NAME ||
      process.env.VERCEL ||
      process.env.NETLIFY
    );
  }
}

/**
 * Configuration source priorities (highest to lowest):
 * 1. CLI arguments
 * 2. Environment variables
 * 3. Project config file (.printeerrc.json, printeer.config.json)
 * 4. User config file (~/.printeer/config.json)
 * 5. Default configuration
 */
export class ConfigurationLoader {
  private static readonly CONFIG_FILE_NAMES = [
    '.printeerrc.json',
    'printeer.config.json',
    'config.json'
  ];

  private static readonly USER_CONFIG_PATH = join(homedir(), '.printeer', 'config.json');

  /**
   * Load configuration from a JSON file
   */
  private static async loadConfigFile(filePath: string): Promise<Partial<Configuration> | null> {
    try {
      await access(filePath);
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Find and load project configuration file
   */
  private static async loadProjectConfig(cwd: string = process.cwd()): Promise<Partial<Configuration> | null> {
    for (const fileName of this.CONFIG_FILE_NAMES) {
      const filePath = resolve(cwd, fileName);
      const config = await this.loadConfigFile(filePath);
      if (config) {
        return config;
      }
    }
    return null;
  }

  /**
   * Load user configuration file
   */
  private static async loadUserConfig(): Promise<Partial<Configuration> | null> {
    return this.loadConfigFile(this.USER_CONFIG_PATH);
  }

  /**
   * Extract configuration from environment variables
   */
  private static loadEnvironmentConfig(): Partial<Configuration> {
    const config: Partial<Configuration> = {};

    // Operation mode
    if (process.env.PRINTEER_MODE) {
      config.mode = process.env.PRINTEER_MODE as OperationMode;
    }

    // Environment
    if (process.env.PRINTEER_ENVIRONMENT) {
      config.environment = process.env.PRINTEER_ENVIRONMENT as Environment;
    }

    // Browser configuration
    const browserConfig: Partial<Configuration['browser']> = {};
    if (process.env.PRINTEER_BROWSER_EXECUTABLE_PATH) {
      browserConfig.executablePath = process.env.PRINTEER_BROWSER_EXECUTABLE_PATH;
    }
    if (process.env.PRINTEER_BROWSER_HEADLESS) {
      const headless = process.env.PRINTEER_BROWSER_HEADLESS.toLowerCase();
      browserConfig.headless = headless === 'auto' ? 'auto' : headless === 'true';
    }
    if (process.env.PRINTEER_BROWSER_TIMEOUT) {
      browserConfig.timeout = parseInt(process.env.PRINTEER_BROWSER_TIMEOUT, 10);
    }
    if (process.env.PRINTEER_BROWSER_ARGS) {
      browserConfig.args = process.env.PRINTEER_BROWSER_ARGS.split(',').map(arg => arg.trim());
    }

    // Browser pool configuration
    const poolConfig: Partial<Configuration['browser']['pool']> = {};
    if (process.env.PRINTEER_BROWSER_POOL_MIN) {
      poolConfig.min = parseInt(process.env.PRINTEER_BROWSER_POOL_MIN, 10);
    }
    if (process.env.PRINTEER_BROWSER_POOL_MAX) {
      poolConfig.max = parseInt(process.env.PRINTEER_BROWSER_POOL_MAX, 10);
    }
    if (process.env.PRINTEER_BROWSER_POOL_IDLE_TIMEOUT) {
      poolConfig.idleTimeout = parseInt(process.env.PRINTEER_BROWSER_POOL_IDLE_TIMEOUT, 10);
    }

    if (Object.keys(poolConfig).length > 0) {
      browserConfig.pool = poolConfig as Configuration['browser']['pool'];
    }

    if (Object.keys(browserConfig).length > 0) {
      config.browser = browserConfig as Configuration['browser'];
    }

    // Resource limits
    const resourceConfig: Partial<Configuration['resources']> = {};
    if (process.env.PRINTEER_MAX_MEMORY_MB) {
      resourceConfig.maxMemoryMB = parseInt(process.env.PRINTEER_MAX_MEMORY_MB, 10);
    }
    if (process.env.PRINTEER_MAX_CPU_PERCENT) {
      resourceConfig.maxCpuPercent = parseInt(process.env.PRINTEER_MAX_CPU_PERCENT, 10);
    }
    if (process.env.PRINTEER_MAX_DISK_MB) {
      resourceConfig.maxDiskMB = parseInt(process.env.PRINTEER_MAX_DISK_MB, 10);
    }
    if (process.env.PRINTEER_MAX_CONCURRENT_REQUESTS) {
      resourceConfig.maxConcurrentRequests = parseInt(process.env.PRINTEER_MAX_CONCURRENT_REQUESTS, 10);
    }

    if (Object.keys(resourceConfig).length > 0) {
      config.resources = resourceConfig as Configuration['resources'];
    }

    // Long-running configuration
    const longRunningConfig: Partial<Configuration['longRunning']> = {};
    if (process.env.PRINTEER_COOLING_PERIOD_MS) {
      longRunningConfig.coolingPeriodMs = parseInt(process.env.PRINTEER_COOLING_PERIOD_MS, 10);
    }
    if (process.env.PRINTEER_HEALTH_CHECK_INTERVAL) {
      longRunningConfig.healthCheckInterval = parseInt(process.env.PRINTEER_HEALTH_CHECK_INTERVAL, 10);
    }
    if (process.env.PRINTEER_MAX_UPTIME) {
      longRunningConfig.maxUptime = parseInt(process.env.PRINTEER_MAX_UPTIME, 10);
    }

    if (Object.keys(longRunningConfig).length > 0) {
      config.longRunning = longRunningConfig as Configuration['longRunning'];
    }

    // Logging configuration
    const loggingConfig: Partial<Configuration['logging']> = {};
    if (process.env.PRINTEER_LOG_LEVEL) {
      loggingConfig.level = process.env.PRINTEER_LOG_LEVEL as LogLevel;
    }
    if (process.env.PRINTEER_LOG_FORMAT) {
      loggingConfig.format = process.env.PRINTEER_LOG_FORMAT as LogFormat;
    }
    if (process.env.PRINTEER_LOG_DESTINATION) {
      loggingConfig.destination = process.env.PRINTEER_LOG_DESTINATION as LogDestination;
    }

    if (Object.keys(loggingConfig).length > 0) {
      config.logging = loggingConfig as Configuration['logging'];
    }

    // Security configuration
    const securityConfig: Partial<Configuration['security']> = {};
    if (process.env.PRINTEER_ALLOWED_DOMAINS) {
      securityConfig.allowedDomains = process.env.PRINTEER_ALLOWED_DOMAINS.split(',').map(d => d.trim());
    }
    if (process.env.PRINTEER_BLOCKED_DOMAINS) {
      securityConfig.blockedDomains = process.env.PRINTEER_BLOCKED_DOMAINS.split(',').map(d => d.trim());
    }
    if (process.env.PRINTEER_MAX_FILE_SIZE) {
      securityConfig.maxFileSize = parseInt(process.env.PRINTEER_MAX_FILE_SIZE, 10);
    }
    if (process.env.PRINTEER_SANITIZE_INPUT) {
      securityConfig.sanitizeInput = process.env.PRINTEER_SANITIZE_INPUT.toLowerCase() === 'true';
    }

    if (Object.keys(securityConfig).length > 0) {
      config.security = securityConfig as Configuration['security'];
    }

    return config;
  }

  /**
   * Get default configuration based on environment
   */
  private static getDefaultConfiguration(environment: Environment): Configuration {
    const isProduction = environment === 'production';
    const isTest = environment === 'test';
    const isHeadless = EnvironmentDetector.isHeadlessEnvironment();

    return {
      mode: 'single-shot',
      environment,
      browser: {
        headless: isTest || isHeadless,
        args: isProduction ? [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-default-apps'
        ] : [],
        timeout: isTest ? 10000 : 30000,
        pool: {
          min: isProduction ? 1 : 0,
          max: isProduction ? 5 : 2,
          idleTimeout: isProduction ? 300000 : 60000
        }
      },
      resources: {
        maxMemoryMB: isProduction ? 1024 : 512,
        maxCpuPercent: isProduction ? 80 : 90,
        maxDiskMB: isProduction ? 500 : 100,
        maxConcurrentRequests: isProduction ? 10 : 3
      },
      longRunning: {
        coolingPeriodMs: isProduction ? 300000 : 60000,
        healthCheckInterval: isProduction ? 30000 : 10000,
        maxUptime: isProduction ? 86400000 : 3600000
      },
      logging: {
        level: isTest ? 'error' : (isProduction ? 'info' : 'debug'),
        format: isProduction ? 'json' : 'text',
        destination: 'console'
      },
      security: {
        maxFileSize: 10485760, // 10MB
        sanitizeInput: true
      }
    };
  }

  /**
   * Deep merge configuration objects
   */
  private static mergeConfigurations(...configs: Array<Partial<Configuration> | null>): Configuration {
    const environment = EnvironmentDetector.detectEnvironment();
    let merged = this.getDefaultConfiguration(environment);

    for (const config of configs) {
      if (!config) continue;

      merged = {
        ...merged,
        ...config,
        browser: {
          ...merged.browser,
          ...config.browser,
          pool: {
            ...merged.browser.pool,
            ...config.browser?.pool
          }
        },
        resources: {
          ...merged.resources,
          ...config.resources
        },
        longRunning: {
          ...merged.longRunning,
          ...config.longRunning
        },
        logging: {
          ...merged.logging,
          ...config.logging
        },
        security: {
          ...merged.security,
          ...config.security
        }
      };
    }

    return merged;
  }

  /**
   * Load complete configuration from all sources
   */
  static async loadConfiguration(cliArgs?: Partial<Configuration>): Promise<Configuration> {
    const userConfig = await this.loadUserConfig();
    const projectConfig = await this.loadProjectConfig();
    const envConfig = this.loadEnvironmentConfig();

    return this.mergeConfigurations(
      userConfig,
      projectConfig,
      envConfig,
      cliArgs || null
    );
  }
}

/**
 * Configuration manager implementation with hot-reloading support
 */
export class PrinteerConfigurationManager implements ConfigurationManager {
  private config: Configuration | null = null;
  private watchers: Array<() => void> = [];
  private fileWatchers: any[] = [];
  private hotReloadEnabled = false;
  private reloadDebounceTimer: NodeJS.Timeout | null = null;
  private readonly RELOAD_DEBOUNCE_MS = 500;

  async load(): Promise<Configuration> {
    this.config = await ConfigurationLoader.loadConfiguration();
    return this.config;
  }

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

  set(key: string, value: any): void {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    const keys = key.split('.');
    let target: any = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!target[k] || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }

    target[keys[keys.length - 1]] = value;
  }

  validate(): ValidationResult {
    if (!this.config) {
      return {
        valid: false,
        errors: ['Configuration not loaded'],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!this.config.mode) {
      errors.push('Operation mode is required');
    } else if (!['single-shot', 'long-running'].includes(this.config.mode)) {
      errors.push('Operation mode must be "single-shot" or "long-running"');
    }

    if (!this.config.environment) {
      errors.push('Environment is required');
    } else if (!['development', 'production', 'test'].includes(this.config.environment)) {
      errors.push('Environment must be "development", "production", or "test"');
    }

    // Validate browser configuration
    if (this.config.browser.timeout <= 0) {
      errors.push('Browser timeout must be positive');
    }

    if (this.config.browser.pool.min < 0) {
      errors.push('Browser pool minimum size cannot be negative');
    }

    if (this.config.browser.pool.max < this.config.browser.pool.min) {
      errors.push('Browser pool maximum size must be greater than or equal to minimum size');
    }

    // Validate resource limits
    if (this.config.resources.maxMemoryMB <= 0) {
      errors.push('Maximum memory limit must be positive');
    }

    if (this.config.resources.maxCpuPercent <= 0 || this.config.resources.maxCpuPercent > 100) {
      errors.push('Maximum CPU percentage must be between 1 and 100');
    }

    if (this.config.resources.maxConcurrentRequests <= 0) {
      errors.push('Maximum concurrent requests must be positive');
    }

    // Validate long-running configuration
    if (this.config.longRunning.coolingPeriodMs < 0) {
      errors.push('Cooling period cannot be negative');
    }

    if (this.config.longRunning.healthCheckInterval <= 0) {
      errors.push('Health check interval must be positive');
    }

    // Warnings
    if (this.config.browser.pool.max > 10) {
      warnings.push('Large browser pool size may consume significant resources');
    }

    if (this.config.resources.maxMemoryMB > 4096) {
      warnings.push('High memory limit may affect system stability');
    }

    if (this.config.environment === 'production' && this.config.logging.level === 'debug') {
      warnings.push('Debug logging in production may impact performance');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async reload(): Promise<void> {
    await this.load();
    this.watchers.forEach(watcher => watcher());
  }

  getEnvironment(): Environment {
    return this.config?.environment || EnvironmentDetector.detectEnvironment();
  }

  /**
   * Add a watcher for configuration changes (for hot-reloading)
   */
  onConfigChange(callback: () => void): void {
    this.watchers.push(callback);
  }

  /**
   * Remove a configuration change watcher
   */
  removeConfigWatcher(callback: () => void): void {
    const index = this.watchers.indexOf(callback);
    if (index > -1) {
      this.watchers.splice(index, 1);
    }
  }

  /**
   * Enable hot-reloading for long-running mode
   * Watches configuration files for changes and automatically reloads
   */
  async enableHotReload(): Promise<void> {
    if (this.hotReloadEnabled) {
      return;
    }

    this.hotReloadEnabled = true;

    // Watch project configuration files
    const configFilePaths = await this.getWatchableConfigFiles();

    for (const filePath of configFilePaths) {
      try {
        const watcher = await watch(filePath);
        this.fileWatchers.push(watcher as any);

        // Set up async iterator to handle file changes
        this.watchConfigFile(watcher as any, filePath);
      } catch (error) {
        // File doesn't exist or can't be watched, skip silently
        continue;
      }
    }
  }

  /**
   * Disable hot-reloading and cleanup file watchers
   */
  async disableHotReload(): Promise<void> {
    if (!this.hotReloadEnabled) {
      return;
    }

    this.hotReloadEnabled = false;

    // Clear debounce timer
    if (this.reloadDebounceTimer) {
      clearTimeout(this.reloadDebounceTimer);
      this.reloadDebounceTimer = null;
    }

    // Close all file watchers
    for (const watcher of this.fileWatchers) {
      try {
        if ('close' in watcher && typeof watcher.close === 'function') {
          await watcher.close();
        }
      } catch {
        // Ignore cleanup errors
      }
    }

    this.fileWatchers = [];
  }

  /**
   * Get list of configuration files that should be watched
   */
  private async getWatchableConfigFiles(): Promise<string[]> {
    const files: string[] = [];
    const cwd = process.cwd();

    // Project configuration files
    const projectConfigFiles = [
      '.printeerrc.json',
      'printeer.config.json',
      'config.json'
    ];

    for (const fileName of projectConfigFiles) {
      const filePath = resolve(cwd, fileName);
      try {
        await access(filePath);
        files.push(filePath);
      } catch {
        // File doesn't exist, skip
      }
    }

    // User configuration file
    const userConfigPath = join(homedir(), '.printeer', 'config.json');
    try {
      await access(userConfigPath);
      files.push(userConfigPath);
    } catch {
      // File doesn't exist, skip
    }

    return files;
  }

  /**
   * Watch a specific configuration file for changes
   */
  private async watchConfigFile(watcher: any, filePath: string): Promise<void> {
    try {
      for await (const event of watcher) {
        if ((event as any).eventType === 'change') {
          this.debouncedReload();
        }
      }
    } catch (error) {
      // Watcher was closed or errored, cleanup
      const index = this.fileWatchers.indexOf(watcher);
      if (index > -1) {
        this.fileWatchers.splice(index, 1);
      }
    }
  }

  /**
   * Debounced reload to prevent excessive reloading on rapid file changes
   */
  private debouncedReload(): void {
    if (this.reloadDebounceTimer) {
      clearTimeout(this.reloadDebounceTimer);
    }

    this.reloadDebounceTimer = setTimeout(async () => {
      try {
        await this.reload();
      } catch (error) {
        // Log error but don't throw to prevent crashing the watcher
        console.error('Configuration hot-reload failed:', error);
      }
    }, this.RELOAD_DEBOUNCE_MS);
  }

  /**
   * Check if hot-reloading is currently enabled
   */
  isHotReloadEnabled(): boolean {
    return this.hotReloadEnabled;
  }

  /**
   * Cleanup method to be called when shutting down
   */
  async cleanup(): Promise<void> {
    await this.disableHotReload();
    this.watchers = [];
  }
}

// Export singleton instance
export const configManager = new PrinteerConfigurationManager();

// Configuration module barrel exports
export * from './configuration';
export { ConfigurationManager } from './manager';
export * from './cli-config-loader';
export * from './types/configuration';
export * from './types/command-manager';