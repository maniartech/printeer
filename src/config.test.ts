import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { 
  EnvironmentDetector, 
  ConfigurationLoader, 
  PrinteerConfigurationManager 
} from './config';
import type { Configuration, Environment } from './types/configuration';

describe('EnvironmentDetector', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('detectEnvironment', () => {
    it('should detect production from NODE_ENV', () => {
      process.env.NODE_ENV = 'production';
      expect(EnvironmentDetector.detectEnvironment()).toBe('production');
    });

    it('should detect test from NODE_ENV', () => {
      process.env.NODE_ENV = 'test';
      expect(EnvironmentDetector.detectEnvironment()).toBe('test');
    });

    it('should detect development from NODE_ENV', () => {
      process.env.NODE_ENV = 'development';
      expect(EnvironmentDetector.detectEnvironment()).toBe('development');
    });

    it('should be case insensitive for NODE_ENV', () => {
      process.env.NODE_ENV = 'PRODUCTION';
      expect(EnvironmentDetector.detectEnvironment()).toBe('production');
    });

    it('should detect test from CI environment', () => {
      delete process.env.NODE_ENV;
      process.env.CI = 'true';
      expect(EnvironmentDetector.detectEnvironment()).toBe('test');
    });

    it('should detect test from VITEST environment', () => {
      delete process.env.NODE_ENV;
      process.env.VITEST = 'true';
      expect(EnvironmentDetector.detectEnvironment()).toBe('test');
    });

    it('should detect test from JEST_WORKER_ID environment', () => {
      delete process.env.NODE_ENV;
      process.env.JEST_WORKER_ID = '1';
      expect(EnvironmentDetector.detectEnvironment()).toBe('test');
    });

    it('should detect production from PM2_HOME', () => {
      delete process.env.NODE_ENV;
      delete process.env.CI;
      delete process.env.VITEST;
      delete process.env.JEST_WORKER_ID;
      process.env.PM2_HOME = '/home/user/.pm2';
      expect(EnvironmentDetector.detectEnvironment()).toBe('production');
    });

    it('should detect production from KUBERNETES_SERVICE_HOST', () => {
      delete process.env.NODE_ENV;
      delete process.env.CI;
      delete process.env.VITEST;
      delete process.env.JEST_WORKER_ID;
      process.env.KUBERNETES_SERVICE_HOST = '10.0.0.1';
      expect(EnvironmentDetector.detectEnvironment()).toBe('production');
    });

    it('should detect production from DOCKER_CONTAINER', () => {
      delete process.env.NODE_ENV;
      delete process.env.CI;
      delete process.env.VITEST;
      delete process.env.JEST_WORKER_ID;
      process.env.DOCKER_CONTAINER = 'true';
      expect(EnvironmentDetector.detectEnvironment()).toBe('production');
    });

    it('should detect production from AWS_EXECUTION_ENV', () => {
      delete process.env.NODE_ENV;
      delete process.env.CI;
      delete process.env.VITEST;
      delete process.env.JEST_WORKER_ID;
      process.env.AWS_EXECUTION_ENV = 'AWS_ECS_FARGATE';
      expect(EnvironmentDetector.detectEnvironment()).toBe('production');
    });

    it('should detect production from HEROKU_APP_NAME', () => {
      delete process.env.NODE_ENV;
      delete process.env.CI;
      delete process.env.VITEST;
      delete process.env.JEST_WORKER_ID;
      process.env.HEROKU_APP_NAME = 'my-app';
      expect(EnvironmentDetector.detectEnvironment()).toBe('production');
    });

    it('should default to development when no indicators present', () => {
      delete process.env.NODE_ENV;
      delete process.env.CI;
      delete process.env.VITEST;
      delete process.env.JEST_WORKER_ID;
      delete process.env.PM2_HOME;
      delete process.env.KUBERNETES_SERVICE_HOST;
      delete process.env.DOCKER_CONTAINER;
      delete process.env.AWS_EXECUTION_ENV;
      delete process.env.HEROKU_APP_NAME;
      expect(EnvironmentDetector.detectEnvironment()).toBe('development');
    });
  });

  describe('isContainerEnvironment', () => {
    it('should detect Docker container', () => {
      process.env.DOCKER_CONTAINER = 'true';
      expect(EnvironmentDetector.isContainerEnvironment()).toBe(true);
    });

    it('should detect Kubernetes environment', () => {
      process.env.KUBERNETES_SERVICE_HOST = '10.0.0.1';
      expect(EnvironmentDetector.isContainerEnvironment()).toBe(true);
    });

    it('should detect generic container environment', () => {
      process.env.container = 'docker';
      expect(EnvironmentDetector.isContainerEnvironment()).toBe(true);
    });

    it('should detect Podman environment', () => {
      process.env.PODMAN_VERSION = '4.0.0';
      expect(EnvironmentDetector.isContainerEnvironment()).toBe(true);
    });

    it('should return false when not in container', () => {
      delete process.env.DOCKER_CONTAINER;
      delete process.env.KUBERNETES_SERVICE_HOST;
      delete process.env.container;
      delete process.env.PODMAN_VERSION;
      expect(EnvironmentDetector.isContainerEnvironment()).toBe(false);
    });
  });

  describe('isHeadlessEnvironment', () => {
    it('should detect CI environment as headless', () => {
      process.env.CI = 'true';
      expect(EnvironmentDetector.isHeadlessEnvironment()).toBe(true);
    });

    it('should detect explicit headless environment', () => {
      process.env.HEADLESS = 'true';
      expect(EnvironmentDetector.isHeadlessEnvironment()).toBe(true);
    });

    it('should detect missing DISPLAY as headless', () => {
      delete process.env.DISPLAY;
      expect(EnvironmentDetector.isHeadlessEnvironment()).toBe(true);
    });

    it('should detect container environment as headless', () => {
      process.env.DOCKER_CONTAINER = 'true';
      expect(EnvironmentDetector.isHeadlessEnvironment()).toBe(true);
    });

    it('should return false when DISPLAY is present and not in container/CI', () => {
      process.env.DISPLAY = ':0';
      delete process.env.CI;
      delete process.env.HEADLESS;
      delete process.env.DOCKER_CONTAINER;
      delete process.env.KUBERNETES_SERVICE_HOST;
      delete process.env.container;
      delete process.env.PODMAN_VERSION;
      expect(EnvironmentDetector.isHeadlessEnvironment()).toBe(false);
    });
  });

  describe('isCloudEnvironment', () => {
    it('should detect AWS environment', () => {
      process.env.AWS_EXECUTION_ENV = 'AWS_ECS_FARGATE';
      expect(EnvironmentDetector.isCloudEnvironment()).toBe(true);
    });

    it('should detect Google Cloud environment', () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'my-project';
      expect(EnvironmentDetector.isCloudEnvironment()).toBe(true);
    });

    it('should detect Azure environment', () => {
      process.env.AZURE_FUNCTIONS_ENVIRONMENT = 'Development';
      expect(EnvironmentDetector.isCloudEnvironment()).toBe(true);
    });

    it('should detect Heroku environment', () => {
      process.env.HEROKU_APP_NAME = 'my-app';
      expect(EnvironmentDetector.isCloudEnvironment()).toBe(true);
    });

    it('should detect Vercel environment', () => {
      process.env.VERCEL = '1';
      expect(EnvironmentDetector.isCloudEnvironment()).toBe(true);
    });

    it('should detect Netlify environment', () => {
      process.env.NETLIFY = 'true';
      expect(EnvironmentDetector.isCloudEnvironment()).toBe(true);
    });

    it('should return false when not in cloud environment', () => {
      delete process.env.AWS_EXECUTION_ENV;
      delete process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.AZURE_FUNCTIONS_ENVIRONMENT;
      delete process.env.HEROKU_APP_NAME;
      delete process.env.VERCEL;
      delete process.env.NETLIFY;
      expect(EnvironmentDetector.isCloudEnvironment()).toBe(false);
    });
  });
});

describe('ConfigurationLoader', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let tempDir: string;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    tempDir = join(tmpdir(), `printeer-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    process.env = originalEnv;
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('loadConfiguration', () => {

    it('should load default configuration when no config files exist', async () => {
      // Clear environment variables
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('PRINTEER_')) {
          delete process.env[key];
        }
      });
      
      const config = await ConfigurationLoader.loadConfiguration();
      
      expect(config.mode).toBe('single-shot');
      expect(config.environment).toBeDefined();
      expect(config.browser).toBeDefined();
      expect(config.resources).toBeDefined();
      expect(config.longRunning).toBeDefined();
      expect(config.logging).toBeDefined();
      expect(config.security).toBeDefined();
    });

    it('should merge environment variables into configuration', async () => {
      process.env.PRINTEER_MODE = 'long-running';
      process.env.PRINTEER_BROWSER_TIMEOUT = '45000';
      process.env.PRINTEER_MAX_MEMORY_MB = '2048';
      process.env.PRINTEER_LOG_LEVEL = 'warn';
      
      const config = await ConfigurationLoader.loadConfiguration();
      
      expect(config.mode).toBe('long-running');
      expect(config.browser.timeout).toBe(45000);
      expect(config.resources.maxMemoryMB).toBe(2048);
      expect(config.logging.level).toBe('warn');
    });

    it('should parse browser args from environment variable', async () => {
      process.env.PRINTEER_BROWSER_ARGS = '--no-sandbox, --disable-gpu, --headless';
      
      const config = await ConfigurationLoader.loadConfiguration();
      
      expect(config.browser.args).toEqual(['--no-sandbox', '--disable-gpu', '--headless']);
    });

    it('should parse domain lists from environment variables', async () => {
      process.env.PRINTEER_ALLOWED_DOMAINS = 'example.com, test.com, localhost';
      process.env.PRINTEER_BLOCKED_DOMAINS = 'malicious.com, spam.com';
      
      const config = await ConfigurationLoader.loadConfiguration();
      
      expect(config.security.allowedDomains).toEqual(['example.com', 'test.com', 'localhost']);
      expect(config.security.blockedDomains).toEqual(['malicious.com', 'spam.com']);
    });

    it('should handle boolean environment variables correctly', async () => {
      process.env.PRINTEER_BROWSER_HEADLESS = 'true';
      process.env.PRINTEER_SANITIZE_INPUT = 'false';
      
      const config = await ConfigurationLoader.loadConfiguration();
      
      expect(config.browser.headless).toBe(true);
      expect(config.security.sanitizeInput).toBe(false);
    });

    it('should handle auto headless mode from environment', async () => {
      process.env.PRINTEER_BROWSER_HEADLESS = 'auto';
      
      const config = await ConfigurationLoader.loadConfiguration();
      
      expect(config.browser.headless).toBe('auto');
    });

    it('should load project configuration file', async () => {
      const projectConfig = {
        mode: 'long-running' as const,
        browser: {
          timeout: 60000,
          args: ['--custom-arg']
        },
        logging: {
          level: 'info' as const
        }
      };

      await writeFile(
        join(tempDir, '.printeerrc.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      // Mock process.cwd to return our temp directory
      const originalCwd = process.cwd;
      vi.spyOn(process, 'cwd').mockReturnValue(tempDir);

      try {
        const config = await ConfigurationLoader.loadConfiguration();
        
        expect(config.mode).toBe('long-running');
        expect(config.browser.timeout).toBe(60000);
        expect(config.browser.args).toEqual(['--custom-arg']);
        expect(config.logging.level).toBe('info');
      } finally {
        vi.mocked(process.cwd).mockRestore();
      }
    });

    it('should prioritize CLI arguments over other sources', async () => {
      process.env.PRINTEER_MODE = 'long-running';
      process.env.PRINTEER_BROWSER_TIMEOUT = '45000';

      const projectConfig = {
        mode: 'single-shot' as const,
        browser: {
          timeout: 30000
        }
      };

      await writeFile(
        join(tempDir, 'printeer.config.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      const originalCwd = process.cwd;
      vi.spyOn(process, 'cwd').mockReturnValue(tempDir);

      try {
        const cliArgs = {
          mode: 'long-running' as const,
          browser: {
            timeout: 60000,
            headless: true as const,
            args: [],
            pool: {
              min: 1,
              max: 5,
              idleTimeout: 60000
            }
          }
        };

        const config = await ConfigurationLoader.loadConfiguration(cliArgs);
        
        // CLI args should have highest priority
        expect(config.mode).toBe('long-running');
        expect(config.browser.timeout).toBe(60000);
      } finally {
        vi.mocked(process.cwd).mockRestore();
      }
    });

    it('should use environment-specific defaults', async () => {
      process.env.NODE_ENV = 'production';
      
      const config = await ConfigurationLoader.loadConfiguration();
      
      expect(config.environment).toBe('production');
      expect(config.browser.args).toContain('--no-sandbox');
      expect(config.logging.format).toBe('json');
      expect(config.resources.maxMemoryMB).toBe(1024);
    });

    it('should use test environment defaults', async () => {
      process.env.NODE_ENV = 'test';
      
      const config = await ConfigurationLoader.loadConfiguration();
      
      expect(config.environment).toBe('test');
      expect(config.browser.timeout).toBe(10000);
      expect(config.logging.level).toBe('error');
    });

    it('should handle invalid JSON in config files gracefully', async () => {
      await writeFile(
        join(tempDir, '.printeerrc.json'),
        '{ invalid json }'
      );

      const originalCwd = process.cwd;
      vi.spyOn(process, 'cwd').mockReturnValue(tempDir);

      try {
        const config = await ConfigurationLoader.loadConfiguration();
        
        // Should still load with defaults when config file is invalid
        expect(config.mode).toBe('single-shot');
        expect(config.browser).toBeDefined();
      } finally {
        vi.mocked(process.cwd).mockRestore();
      }
    });
  });
});

describe('PrinteerConfigurationManager', () => {
  let configManager: PrinteerConfigurationManager;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    configManager = new PrinteerConfigurationManager();
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('load and get', () => {
    it('should load configuration and allow getting values', async () => {
      await configManager.load();
      
      const mode = configManager.get<string>('mode');
      const browserTimeout = configManager.get<number>('browser.timeout');
      const poolMax = configManager.get<number>('browser.pool.max');
      
      expect(mode).toBeDefined();
      expect(typeof browserTimeout).toBe('number');
      expect(typeof poolMax).toBe('number');
    });

    it('should throw error when getting value before loading', () => {
      expect(() => configManager.get('mode')).toThrow('Configuration not loaded');
    });

    it('should throw error when getting non-existent key', async () => {
      await configManager.load();
      
      expect(() => configManager.get('nonexistent.key')).toThrow("Configuration key 'nonexistent.key' not found");
    });
  });

  describe('set', () => {
    it('should allow setting configuration values', async () => {
      await configManager.load();
      
      configManager.set('browser.timeout', 50000);
      
      expect(configManager.get<number>('browser.timeout')).toBe(50000);
    });

    it('should create nested objects when setting deep keys', async () => {
      await configManager.load();
      
      configManager.set('custom.nested.value', 'test');
      
      expect(configManager.get<string>('custom.nested.value')).toBe('test');
    });

    it('should throw error when setting value before loading', () => {
      expect(() => configManager.set('mode', 'test')).toThrow('Configuration not loaded');
    });
  });

  describe('validate', () => {
    it('should validate a valid configuration', async () => {
      await configManager.load();
      
      const result = configManager.validate();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect invalid operation mode', async () => {
      await configManager.load();
      configManager.set('mode', 'invalid-mode');
      
      const result = configManager.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Operation mode must be "single-shot" or "long-running"');
    });

    it('should detect invalid environment', async () => {
      await configManager.load();
      configManager.set('environment', 'invalid-env');
      
      const result = configManager.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Environment must be "development", "production", or "test"');
    });

    it('should detect negative browser timeout', async () => {
      await configManager.load();
      configManager.set('browser.timeout', -1000);
      
      const result = configManager.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Browser timeout must be positive');
    });

    it('should detect invalid browser pool configuration', async () => {
      await configManager.load();
      configManager.set('browser.pool.min', 5);
      configManager.set('browser.pool.max', 2);
      
      const result = configManager.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Browser pool maximum size must be greater than or equal to minimum size');
    });

    it('should detect invalid resource limits', async () => {
      await configManager.load();
      configManager.set('resources.maxMemoryMB', -100);
      configManager.set('resources.maxCpuPercent', 150);
      configManager.set('resources.maxConcurrentRequests', 0);
      
      const result = configManager.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Maximum memory limit must be positive');
      expect(result.errors).toContain('Maximum CPU percentage must be between 1 and 100');
      expect(result.errors).toContain('Maximum concurrent requests must be positive');
    });

    it('should generate warnings for potentially problematic configurations', async () => {
      await configManager.load();
      configManager.set('browser.pool.max', 15);
      configManager.set('resources.maxMemoryMB', 8192);
      configManager.set('environment', 'production');
      configManager.set('logging.level', 'debug');
      
      const result = configManager.validate();
      
      expect(result.warnings).toContain('Large browser pool size may consume significant resources');
      expect(result.warnings).toContain('High memory limit may affect system stability');
      expect(result.warnings).toContain('Debug logging in production may impact performance');
    });

    it('should return error when configuration not loaded', () => {
      const result = configManager.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration not loaded');
    });
  });

  describe('getEnvironment', () => {
    it('should return environment from loaded configuration', async () => {
      process.env.NODE_ENV = 'production';
      await configManager.load();
      
      expect(configManager.getEnvironment()).toBe('production');
    });

    it('should detect environment even when configuration not loaded', () => {
      process.env.NODE_ENV = 'test';
      
      expect(configManager.getEnvironment()).toBe('test');
    });
  });

  describe('reload and watchers', () => {
    it('should reload configuration and notify watchers', async () => {
      await configManager.load();
      
      let watcherCalled = false;
      const watcher = () => { watcherCalled = true; };
      
      configManager.onConfigChange(watcher);
      
      process.env.PRINTEER_MODE = 'long-running';
      await configManager.reload();
      
      expect(watcherCalled).toBe(true);
      expect(configManager.get<string>('mode')).toBe('long-running');
    });

    it('should remove watchers correctly', async () => {
      await configManager.load();
      
      let watcherCalled = false;
      const watcher = () => { watcherCalled = true; };
      
      configManager.onConfigChange(watcher);
      configManager.removeConfigWatcher(watcher);
      
      await configManager.reload();
      
      expect(watcherCalled).toBe(false);
    });
  });

  describe('hot-reloading', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = join(tmpdir(), `printeer-hotreload-test-${Date.now()}`);
      await mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
      await configManager.disableHotReload();
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should enable and disable hot-reloading', async () => {
      await configManager.load();
      
      expect(configManager.isHotReloadEnabled()).toBe(false);
      
      await configManager.enableHotReload();
      expect(configManager.isHotReloadEnabled()).toBe(true);
      
      await configManager.disableHotReload();
      expect(configManager.isHotReloadEnabled()).toBe(false);
    });

    it('should not enable hot-reloading twice', async () => {
      await configManager.load();
      
      await configManager.enableHotReload();
      expect(configManager.isHotReloadEnabled()).toBe(true);
      
      // Should not throw or cause issues
      await configManager.enableHotReload();
      expect(configManager.isHotReloadEnabled()).toBe(true);
    });

    it('should handle disabling hot-reload when not enabled', async () => {
      await configManager.load();
      
      expect(configManager.isHotReloadEnabled()).toBe(false);
      
      // Should not throw or cause issues
      await configManager.disableHotReload();
      expect(configManager.isHotReloadEnabled()).toBe(false);
    });

    it('should cleanup properly', async () => {
      await configManager.load();
      
      let watcherCalled = false;
      const watcher = () => { watcherCalled = true; };
      configManager.onConfigChange(watcher);
      
      await configManager.enableHotReload();
      expect(configManager.isHotReloadEnabled()).toBe(true);
      
      await configManager.cleanup();
      
      expect(configManager.isHotReloadEnabled()).toBe(false);
      
      // Watchers should be cleared
      await configManager.reload();
      expect(watcherCalled).toBe(false);
    });

    it('should handle file watching errors gracefully', async () => {
      await configManager.load();
      
      // Create a config file in temp directory
      const configPath = join(tempDir, '.printeerrc.json');
      await writeFile(configPath, JSON.stringify({ mode: 'long-running' }));
      
      const originalCwd = process.cwd;
      vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
      
      try {
        await configManager.enableHotReload();
        expect(configManager.isHotReloadEnabled()).toBe(true);
        
        // Should handle cleanup gracefully even if files are deleted
        await rm(configPath, { force: true });
        await configManager.disableHotReload();
        
        expect(configManager.isHotReloadEnabled()).toBe(false);
      } finally {
        vi.mocked(process.cwd).mockRestore();
      }
    });

    it('should handle non-existent config files gracefully', async () => {
      await configManager.load();
      
      const originalCwd = process.cwd;
      vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
      
      try {
        // Should not throw even when no config files exist
        await configManager.enableHotReload();
        expect(configManager.isHotReloadEnabled()).toBe(true);
        
        await configManager.disableHotReload();
        expect(configManager.isHotReloadEnabled()).toBe(false);
      } finally {
        vi.mocked(process.cwd).mockRestore();
      }
    });
  });
});