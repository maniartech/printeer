import type { Configuration } from '../types/configuration.js';

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
            config.browser = { ...config.browser, headless: 'auto' };
            i++; // Skip next argument
          } else {
            // Boolean flag
            config.browser = { ...config.browser, headless: true };
          }
          break;
          
        case '--no-headless':
          config.browser = { ...config.browser, headless: false };
          break;
          
        case '--browser-timeout':
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.browser = { ...config.browser, timeout: parseInt(nextArg, 10) };
            i++; // Skip next argument
          }
          break;
          
        case '--browser-executable':
          if (nextArg) {
            config.browser = { ...config.browser, executablePath: nextArg };
            i++; // Skip next argument
          }
          break;
          
        case '--max-memory':
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.resources = { ...config.resources, maxMemoryMB: parseInt(nextArg, 10) };
            i++; // Skip next argument
          }
          break;
          
        case '--max-cpu':
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.resources = { ...config.resources, maxCpuPercent: parseInt(nextArg, 10) };
            i++; // Skip next argument
          }
          break;
          
        case '--max-concurrent':
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.resources = { ...config.resources, maxConcurrentRequests: parseInt(nextArg, 10) };
            i++; // Skip next argument
          }
          break;
          
        case '--log-level':
          if (nextArg && ['error', 'warn', 'info', 'debug'].includes(nextArg)) {
            config.logging = { ...config.logging, level: nextArg as any };
            i++; // Skip next argument
          }
          break;
          
        case '--log-format':
          if (nextArg && ['json', 'text'].includes(nextArg)) {
            config.logging = { ...config.logging, format: nextArg as any };
            i++; // Skip next argument
          }
          break;
          
        case '--log-destination':
          if (nextArg && ['console', 'file', 'both'].includes(nextArg)) {
            config.logging = { ...config.logging, destination: nextArg as any };
            i++; // Skip next argument
          }
          break;
          
        case '--allowed-domains':
          if (nextArg) {
            config.security = { 
              ...config.security, 
              allowedDomains: nextArg.split(',').map(d => d.trim()) 
            };
            i++; // Skip next argument
          }
          break;
          
        case '--blocked-domains':
          if (nextArg) {
            config.security = { 
              ...config.security, 
              blockedDomains: nextArg.split(',').map(d => d.trim()) 
            };
            i++; // Skip next argument
          }
          break;
          
        case '--cooling-period':
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.longRunning = { ...config.longRunning, coolingPeriodMs: parseInt(nextArg, 10) };
            i++; // Skip next argument
          }
          break;
          
        case '--max-uptime':
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.longRunning = { ...config.longRunning, maxUptime: parseInt(nextArg, 10) };
            i++; // Skip next argument
          }
          break;
          
        case '--pool-min':
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.browser = { 
              ...config.browser, 
              pool: { ...config.browser?.pool, min: parseInt(nextArg, 10) } 
            };
            i++; // Skip next argument
          }
          break;
          
        case '--pool-max':
          if (nextArg && !isNaN(parseInt(nextArg, 10))) {
            config.browser = { 
              ...config.browser, 
              pool: { ...config.browser?.pool, max: parseInt(nextArg, 10) } 
            };
            i++; // Skip next argument
          }
          break;
          
        case '--verbose':
        case '-v':
          config.logging = { ...config.logging, level: 'debug' };
          break;
          
        case '--quiet':
        case '-q':
          config.logging = { ...config.logging, level: 'error' };
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