import type { Configuration, BrowserConfig, ResourceLimits, LoggingConfig, SecurityConfig, LongRunningConfig } from '../types/configuration.js';

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
 * Helper function to merge long running config safely
 */
function mergeLongRunningConfig(existing: Partial<LongRunningConfig> | undefined, updates: Partial<LongRunningConfig>): LongRunningConfig {
  return {
    coolingPeriodMs: updates.coolingPeriodMs ?? existing?.coolingPeriodMs ?? 60000,
    healthCheckInterval: updates.healthCheckInterval ?? existing?.healthCheckInterval ?? 10000,
    maxUptime: updates.maxUptime ?? existing?.maxUptime ?? 3600000
  };
}

/**
 * CLI Configuration Loader - Parses command line arguments into configuration overrides
 */
export class CliConfigLoader {
  /**
   * Parse CLI arguments into configuration overrides
   */
  static parseCliArgs(args: string[] = process.argv.slice(2)): Partial<Configuration> {
    const config: Partial<Configuration> = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const nextArg = args[i + 1];
      
      switch (arg) {
        case '--mode':
          if (nextArg && ['single-shot', 'long-running'].includes(nextArg)) {
            config.mode = nextArg as any;
            i++; // Skip next argument
          }
          break;
          
        case '--environment':
        case '--env':
          if (nextArg && ['development', 'production', 'test'].includes(nextArg)) {
            config.environment = nextArg as any;
            i++; // Skip next argument
          }
          break;
          
        case '--headless':
          if (nextArg === 'auto') {
            config.browser = mergeBrowserConfig(config.browser, { headless: 'auto' });
            i++; // Skip next argument
          } else {
            // Boolean flag
            config.browser = mergeBrowserConfig(config.browser, { headless: true });
          }
          break;
          
        case '--no-headless':
          config.browser = mergeBrowserConfig(config.browser, { headless: false });
          break;
          
        case '--browser-timeout':
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.browser = mergeBrowserConfig(config.browser, { timeout: parseInt(nextArg, 10) });
            i++; // Skip next argument
          }
          break;
          
        case '--browser-executable':
          if (nextArg) {
            config.browser = mergeBrowserConfig(config.browser, { executablePath: nextArg });
            i++; // Skip next argument
          }
          break;
          
        case '--max-memory':
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.resources = mergeResourceLimits(config.resources, { maxMemoryMB: parseInt(nextArg, 10) });
            i++; // Skip next argument
          }
          break;
          
        case '--max-cpu':
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.resources = mergeResourceLimits(config.resources, { maxCpuPercent: parseInt(nextArg, 10) });
            i++; // Skip next argument
          }
          break;
          
        case '--max-concurrent':
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.resources = mergeResourceLimits(config.resources, { maxConcurrentRequests: parseInt(nextArg, 10) });
            i++; // Skip next argument
          }
          break;
          
        case '--log-level':
          if (nextArg && ['error', 'warn', 'info', 'debug'].includes(nextArg)) {
            config.logging = mergeLoggingConfig(config.logging, { level: nextArg as any });
            i++; // Skip next argument
          }
          break;
          
        case '--log-format':
          if (nextArg && ['json', 'text'].includes(nextArg)) {
            config.logging = mergeLoggingConfig(config.logging, { format: nextArg as any });
            i++; // Skip next argument
          }
          break;
          
        case '--log-destination':
          if (nextArg && ['console', 'file', 'both'].includes(nextArg)) {
            config.logging = mergeLoggingConfig(config.logging, { destination: nextArg as any });
            i++; // Skip next argument
          }
          break;
          
        case '--allowed-domains':
          if (nextArg) {
            config.security = mergeSecurityConfig(config.security, { 
              allowedDomains: nextArg.split(',').map(d => d.trim()) 
            });
            i++; // Skip next argument
          }
          break;
          
        case '--blocked-domains':
          if (nextArg) {
            config.security = mergeSecurityConfig(config.security, { 
              blockedDomains: nextArg.split(',').map(d => d.trim()) 
            });
            i++; // Skip next argument
          }
          break;
          
        case '--cooling-period':
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.longRunning = mergeLongRunningConfig(config.longRunning, { coolingPeriodMs: parseInt(nextArg, 10) });
            i++; // Skip next argument
          }
          break;
          
        case '--max-uptime':
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.longRunning = mergeLongRunningConfig(config.longRunning, { maxUptime: parseInt(nextArg, 10) });
            i++; // Skip next argument
          }
          break;
          
        case '--pool-min':
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            const currentPool = config.browser?.pool || { min: 0, max: 2, idleTimeout: 60000 };
            config.browser = mergeBrowserConfig(config.browser, { 
              pool: { ...currentPool, min: parseInt(nextArg, 10) } 
            });
            i++; // Skip next argument
          }
          break;
          
        case '--pool-max':
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            const currentPool = config.browser?.pool || { min: 0, max: 2, idleTimeout: 60000 };
            config.browser = mergeBrowserConfig(config.browser, { 
              pool: { ...currentPool, max: parseInt(nextArg, 10) } 
            });
            i++; // Skip next argument
          }
          break;
          
        case '--verbose':
        case '-v':
          config.logging = mergeLoggingConfig(config.logging, { level: 'debug' });
          break;
          
        case '--quiet':
        case '-q':
          config.logging = mergeLoggingConfig(config.logging, { level: 'error' });
          break;
          
        case '--production':
          config.environment = 'production';
          break;
          
        case '--development':
          config.environment = 'development';
          break;
          
        case '--test':
          config.environment = 'test';
          break;
      }
    }
    
    return config;
  }
  
  /**
   * Get help text for CLI configuration options
   */
  static getHelpText(): string {
    return `
Configuration Options:
  --mode <mode>              Operation mode: single-shot, long-running
  --environment <env>        Environment: development, production, test
  --env <env>                Alias for --environment
  
Browser Options:
  --headless [auto]          Run browser in headless mode (default: auto)
  --no-headless              Run browser in windowed mode
  --browser-timeout <ms>     Browser timeout in milliseconds
  --browser-executable <path> Path to browser executable
  --pool-min <num>           Minimum browser pool size
  --pool-max <num>           Maximum browser pool size
  
Resource Options:
  --max-memory <mb>          Maximum memory usage in MB
  --max-cpu <percent>        Maximum CPU usage percentage
  --max-concurrent <num>     Maximum concurrent requests
  
Logging Options:
  --log-level <level>        Log level: error, warn, info, debug
  --log-format <format>      Log format: json, text
  --log-destination <dest>   Log destination: console, file, both
  --verbose, -v              Enable verbose logging (debug level)
  --quiet, -q                Enable quiet logging (error level only)
  
Security Options:
  --allowed-domains <list>   Comma-separated list of allowed domains
  --blocked-domains <list>   Comma-separated list of blocked domains
  
Long-Running Mode Options:
  --cooling-period <ms>      Cooling period before shutdown in milliseconds
  --max-uptime <ms>          Maximum uptime in milliseconds
  
Environment Shortcuts:
  --production               Set environment to production
  --development              Set environment to development
  --test                     Set environment to test
`;
  }
}