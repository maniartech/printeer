import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigurationManager } from '../config-manager.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;
  let tempDir: string;
  let originalEnv: typeof process.env;

  // Robust recursive removal for Windows where files can be briefly locked
  async function removeDirWithRetry(dir: string, attempts = 5, delayMs = 100): Promise<void> {
    for (let i = 0; i < attempts; i++) {
      try {
        await rm(dir, { recursive: true, force: true });
        return;
      } catch (err: unknown) {
        const codeVal = (err as { code?: unknown })?.code;
        const code = typeof codeVal === 'string' ? codeVal : undefined;
        // Retry on common transient Windows errors
        if (code && ['ENOTEMPTY', 'EPERM', 'EBUSY'].includes(code) && i < attempts - 1) {
          await new Promise(res => setTimeout(res, delayMs));
          continue;
        }
        throw err;
      }
    }
  }

  beforeEach(async () => {
    // Create temporary directory for test configs
    tempDir = join(tmpdir(), `printeer-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    // Save original environment
    originalEnv = { ...process.env };

    // Clear environment variables
    delete process.env.NODE_ENV;
    delete process.env.PRINTEER_ENV;
    delete process.env.PRINTEER_MODE;
    delete process.env.PRINTEER_BROWSER_EXECUTABLE;
    delete process.env.PRINTEER_BROWSER_HEADLESS;
    delete process.env.PRINTEER_BROWSER_TIMEOUT;
    delete process.env.PRINTEER_MAX_MEMORY_MB;
    delete process.env.PRINTEER_MAX_CPU_PERCENT;
    delete process.env.PRINTEER_MAX_CONCURRENT_REQUESTS;
    delete process.env.PRINTEER_LOG_LEVEL;
    delete process.env.PRINTEER_LOG_FORMAT;
    delete process.env.PRINTEER_ALLOWED_DOMAINS;
    delete process.env.PRINTEER_BLOCKED_DOMAINS;

    configManager = new ConfigurationManager(tempDir);
  });

  afterEach(async () => {
    // Restore environment
    process.env = originalEnv;

    // Cleanup
    configManager.destroy();
  await removeDirWithRetry(tempDir);
  });

  describe('Environment Detection', () => {
    it('should detect development environment by default', () => {
      expect(configManager.getEnvironment()).toBe('development');
    });

    it('should detect production environment from NODE_ENV', () => {
      process.env.NODE_ENV = 'production';
      expect(configManager.getEnvironment()).toBe('production');
    });

    it('should detect test environment from PRINTEER_ENV', () => {
      process.env.PRINTEER_ENV = 'test';
      expect(configManager.getEnvironment()).toBe('test');
    });

    it('should detect production in CI environment', () => {
      process.env.CI = 'true';
      expect(configManager.getEnvironment()).toBe('production');
    });

    it('should detect production in Docker environment', () => {
      process.env.DOCKER = 'true';
      expect(configManager.getEnvironment()).toBe('production');
    });

    it('should detect production in Kubernetes environment', () => {
      process.env.KUBERNETES_SERVICE_HOST = 'kubernetes.default.svc';
      expect(configManager.getEnvironment()).toBe('production');
    });
  });

  describe('Default Configuration', () => {
    it('should load default configuration successfully', async () => {
      const config = await configManager.load();

      expect(config).toBeDefined();
      expect(config.mode).toBe('single-shot');
      expect(config.environment).toBe('development');
      expect(config.browser).toBeDefined();
      expect(config.resources).toBeDefined();
      expect(config.longRunning).toBeDefined();
      expect(config.logging).toBeDefined();
      expect(config.security).toBeDefined();
    });

    it('should have different defaults for production environment', async () => {
      process.env.NODE_ENV = 'production';
      configManager = new ConfigurationManager(tempDir);

  const config = await configManager.load();

  expect(config.environment).toBe('production');
  expect(config.browser.headless).toBe(true);
  expect(config.logging.format).toBe('json');
  expect(config.logging.level).toBe('info');
  expect(config.resources.maxMemoryMB).toBe(1024);
    });

    it('should have different defaults for development environment', async () => {
      process.env.NODE_ENV = 'development';
      configManager = new ConfigurationManager(tempDir);

      const config = await configManager.load();

      expect(config.environment).toBe('development');
      expect(config.browser.headless).toBe('auto');
      expect(config.logging.format).toBe('text');
      expect(config.logging.level).toBe('debug');
      expect(config.resources.maxMemoryMB).toBe(512);
    });
  });

  describe('Configuration File Loading', () => {
    it('should load configuration from JSON file', async () => {
      const testConfig = {
        mode: 'long-running' as const,
        browser: {
          timeout: 60000
        },
        logging: {
          level: 'warn' as const
        }
      };

      await writeFile(
        join(tempDir, 'printeer.config.json'),
        JSON.stringify(testConfig, null, 2)
      );

      const config = await configManager.load();

      expect(config.mode).toBe('long-running');
      expect(config.browser.timeout).toBe(60000);
      expect(config.logging.level).toBe('warn');
    });

    it('should handle missing configuration files gracefully', async () => {
      const config = await configManager.load();
      expect(config).toBeDefined();
      expect(config.mode).toBe('single-shot'); // Default value
    });

    it('should throw error for invalid JSON', async () => {
      await writeFile(
        join(tempDir, 'printeer.config.json'),
        '{ invalid json }'
      );

      await expect(configManager.load()).rejects.toThrow();
    });
  });

  describe('Environment Variable Loading', () => {
    it('should load configuration from environment variables', async () => {
      process.env.PRINTEER_MODE = 'long-running';
      process.env.PRINTEER_BROWSER_TIMEOUT = '45000';
      process.env.PRINTEER_MAX_MEMORY_MB = '2048';
      process.env.PRINTEER_LOG_LEVEL = 'error';
      process.env.PRINTEER_ALLOWED_DOMAINS = 'example.com,test.com';

      const config = await configManager.load();

      expect(config.mode).toBe('long-running');
      expect(config.browser.timeout).toBe(45000);
      expect(config.resources.maxMemoryMB).toBe(2048);
      expect(config.logging.level).toBe('error');
      expect(config.security.allowedDomains).toEqual(['example.com', 'test.com']);
    });

    it('should handle browser headless environment variable', async () => {
      process.env.PRINTEER_BROWSER_HEADLESS = 'auto';
      const config = await configManager.load();
      expect(config.browser.headless).toBe('auto');

      process.env.PRINTEER_BROWSER_HEADLESS = 'true';
      const config2 = await configManager.load();
      expect(config2.browser.headless).toBe(true);

      process.env.PRINTEER_BROWSER_HEADLESS = 'false';
      const config3 = await configManager.load();
      expect(config3.browser.headless).toBe(false);
    });
  });

  describe('Configuration Precedence', () => {
    it('should prioritize environment variables over config files', async () => {
      // Create config file
      await writeFile(
        join(tempDir, 'printeer.config.json'),
        JSON.stringify({
          browser: { timeout: 30000 },
          logging: { level: 'info' }
        })
      );

      // Set environment variable
      process.env.PRINTEER_BROWSER_TIMEOUT = '60000';

      const config = await configManager.load();

      expect(config.browser.timeout).toBe(60000); // From env var
      expect(config.logging.level).toBe('info'); // From config file
    });
  });

  describe('Configuration Validation', () => {
    it('should validate valid configuration', async () => {
      await configManager.load();
      const validation = configManager.validate();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid mode', async () => {
      await writeFile(
        join(tempDir, 'printeer.config.json'),
        JSON.stringify({ mode: 'invalid-mode' })
      );

      await expect(configManager.load()).rejects.toThrow('Configuration validation failed');
    });

    it('should reject invalid environment', async () => {
      await writeFile(
        join(tempDir, 'printeer.config.json'),
        JSON.stringify({ environment: 'invalid-env' })
      );

      await expect(configManager.load()).rejects.toThrow('Configuration validation failed');
    });

    it('should reject invalid browser configuration', async () => {
      await writeFile(
        join(tempDir, 'printeer.config.json'),
        JSON.stringify({
          browser: {
            headless: 'invalid',
            timeout: -1000,
            pool: {
              min: -1,
              max: 0,
              idleTimeout: -5000
            }
          }
        })
      );

      await expect(configManager.load()).rejects.toThrow('Configuration validation failed');
    });

    it('should reject invalid resource limits', async () => {
      await writeFile(
        join(tempDir, 'printeer.config.json'),
        JSON.stringify({
          resources: {
            maxMemoryMB: -100,
            maxCpuPercent: 150,
            maxDiskMB: 0,
            maxConcurrentRequests: -5
          }
        })
      );

      await expect(configManager.load()).rejects.toThrow('Configuration validation failed');
    });

    it('should reject invalid logging configuration', async () => {
      await writeFile(
        join(tempDir, 'printeer.config.json'),
        JSON.stringify({
          logging: {
            level: 'invalid-level',
            format: 'invalid-format',
            destination: 'invalid-destination'
          }
        })
      );

      await expect(configManager.load()).rejects.toThrow('Configuration validation failed');
    });

    it('should reject invalid security configuration', async () => {
      await writeFile(
        join(tempDir, 'printeer.config.json'),
        JSON.stringify({
          security: {
            maxFileSize: -1000,
            allowedDomains: ['invalid..domain', ''],
            blockedDomains: ['another..invalid', 'bad domain with spaces']
          }
        })
      );

      await expect(configManager.load()).rejects.toThrow('Configuration validation failed');
    });

    it('should accept valid domain patterns', async () => {
      await writeFile(
        join(tempDir, 'printeer.config.json'),
        JSON.stringify({
          security: {
            allowedDomains: ['example.com', '*.example.com', '*'],
            blockedDomains: ['bad.com', '*.malicious.com']
          }
        })
      );

      const config = await configManager.load();
      expect(config.security.allowedDomains).toEqual(['example.com', '*.example.com', '*']);
    });

  it('should generate warnings for potentially problematic values', async () => {
      await writeFile(
        join(tempDir, 'printeer.config.json'),
        JSON.stringify({
          resources: {
            maxMemoryMB: 128, // Very low
            maxConcurrentRequests: 50 // Very high
          }
        })
      );

  await configManager.load();
      const validation = configManager.validate();

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(w => w.includes('very low'))).toBe(true);
      expect(validation.warnings.some(w => w.includes('very high'))).toBe(true);
    });
  });

  describe('Configuration Access', () => {
    it('should get configuration values by key path', async () => {
      await configManager.load();

      expect(configManager.get('mode')).toBe('single-shot');
      expect(configManager.get('browser.timeout')).toBe(30000);
      expect(configManager.get('browser.pool.max')).toBe(2);
      expect(configManager.get('logging.level')).toBe('debug');
    });

    it('should throw error for non-existent keys', async () => {
      await configManager.load();

      expect(() => configManager.get('nonexistent')).toThrow('Configuration key \'nonexistent\' not found');
      expect(() => configManager.get('browser.nonexistent')).toThrow('Configuration key \'browser.nonexistent\' not found');
    });

    it('should throw error when accessing config before loading', () => {
      expect(() => configManager.get('mode')).toThrow('Configuration not loaded');
    });

    it('should set configuration values by key path', async () => {
      await configManager.load();

      configManager.set('browser.timeout', 45000);
      expect(configManager.get('browser.timeout')).toBe(45000);

      configManager.set('new.nested.value', 'test');
      expect(configManager.get('new.nested.value')).toBe('test');
    });

    it('should throw error when setting config before loading', () => {
      expect(() => configManager.set('mode', 'test')).toThrow('Configuration not loaded');
    });
  });

  describe('Configuration Reloading', () => {
    it('should reload configuration successfully', async () => {
      // Initial load
      await configManager.load();
      expect(configManager.get('browser.timeout')).toBe(30000);

      // Update config file
      await writeFile(
        join(tempDir, 'printeer.config.json'),
        JSON.stringify({ browser: { timeout: 60000 } })
      );

      // Reload
      await configManager.reload();
      expect(configManager.get('browser.timeout')).toBe(60000);
    });
  });

  describe('Hot Reload', () => {
    it('should enable and disable hot reload without errors', async () => {
      await configManager.load();

      expect(() => configManager.enableHotReload()).not.toThrow();
      expect(() => configManager.disableHotReload()).not.toThrow();
    });

    it('should not enable hot reload multiple times', async () => {
      await configManager.load();

  configManager.enableHotReload();
  const watcherCount1 = (configManager as unknown as { watchers: Map<string, unknown> }).watchers.size;

  configManager.enableHotReload();
  const watcherCount2 = (configManager as unknown as { watchers: Map<string, unknown> }).watchers.size;

      expect(watcherCount1).toBe(watcherCount2);
    });
  });

  describe('Configuration Merging', () => {
    it('should deep merge nested configuration objects', async () => {
      await writeFile(
        join(tempDir, 'printeer.config.json'),
        JSON.stringify({
          browser: {
            timeout: 45000,
            pool: {
              max: 10
            }
          },
          logging: {
            level: 'warn'
          }
        })
      );

      const config = await configManager.load();

      // Should merge browser config
      expect(config.browser.timeout).toBe(45000); // From file
      expect(config.browser.headless).toBe('auto'); // From default
      expect(config.browser.pool.max).toBe(10); // From file
      expect(config.browser.pool.min).toBe(0); // From default

      // Should merge logging config
      expect(config.logging.level).toBe('warn'); // From file
      expect(config.logging.format).toBe('text'); // From default
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Try to load from a directory that doesn't exist
      const invalidConfigManager = new ConfigurationManager('/nonexistent/path');

      // Should not throw, should use defaults
      const config = await invalidConfigManager.load();
      expect(config).toBeDefined();
      expect(config.mode).toBe('single-shot');
    });

    it('should provide detailed validation error messages', async () => {
      await writeFile(
        join(tempDir, 'printeer.config.json'),
        JSON.stringify({
          mode: 'invalid',
          browser: { timeout: -1 },
          resources: { maxCpuPercent: 150 }
        })
      );

      try {
        await configManager.load();
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Configuration validation failed');
        expect((error as Error).message).toContain('Invalid mode');
        expect((error as Error).message).toContain('timeout must be positive');
        expect((error as Error).message).toContain('maxCpuPercent must be between');
      }
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', async () => {
  await configManager.load();
  configManager.enableHotReload();

  const internals1 = configManager as unknown as { config: unknown; watchers: Map<string, unknown> };
  expect(internals1.config).not.toBeNull();
  expect(internals1.watchers.size).toBeGreaterThan(0);

  configManager.destroy();

  const internals2 = configManager as unknown as { config: unknown; watchers: Map<string, unknown> };
  expect(internals2.config).toBeNull();
  expect(internals2.watchers.size).toBe(0);
    });
  });

  describe('CLI Arguments Integration', () => {
    it('should load configuration with CLI arguments', async () => {
      const cliArgs = [
        '--mode', 'long-running',
        '--environment', 'production',
        '--browser-timeout', '45000',
        '--max-memory', '2048',
        '--log-level', 'warn'
      ];

      const config = await configManager.load(cliArgs);

      expect(config.mode).toBe('long-running');
      expect(config.environment).toBe('production');
      expect(config.browser.timeout).toBe(45000);
      expect(config.resources.maxMemoryMB).toBe(2048);
      expect(config.logging.level).toBe('warn');
    });

    it('should prioritize CLI arguments over environment variables', async () => {
      // Set environment variable
      process.env.PRINTEER_BROWSER_TIMEOUT = '30000';
      process.env.PRINTEER_LOG_LEVEL = 'info';

      // Set CLI arguments
      const cliArgs = [
        '--browser-timeout', '60000',
        '--log-level', 'error'
      ];

      const config = await configManager.load(cliArgs);

      expect(config.browser.timeout).toBe(60000); // From CLI
      expect(config.logging.level).toBe('error'); // From CLI
    });

    it('should prioritize CLI arguments over config files', async () => {
      // Create config file
      await writeFile(
        join(tempDir, 'printeer.config.json'),
        JSON.stringify({
          browser: { timeout: 30000 },
          logging: { level: 'info' }
        })
      );

      // Set CLI arguments
      const cliArgs = [
        '--browser-timeout', '60000',
        '--log-level', 'debug'
      ];

      const config = await configManager.load(cliArgs);

      expect(config.browser.timeout).toBe(60000); // From CLI
      expect(config.logging.level).toBe('debug'); // From CLI
    });

    it('should merge CLI arguments with other sources', async () => {
      // Create config file
      await writeFile(
        join(tempDir, 'printeer.config.json'),
        JSON.stringify({
          browser: { timeout: 30000 },
          resources: { maxMemoryMB: 512 }
        })
      );

      // Set environment variable
      process.env.PRINTEER_LOG_LEVEL = 'info';

      // Set CLI arguments (only some values)
      const cliArgs = ['--browser-timeout', '60000'];

      const config = await configManager.load(cliArgs);

      expect(config.browser.timeout).toBe(60000); // From CLI
      expect(config.resources.maxMemoryMB).toBe(512); // From config file
      expect(config.logging.level).toBe('info'); // From env var
      expect(config.mode).toBe('single-shot'); // From default
    });

    it('should handle environment shortcuts in CLI', async () => {
      const config1 = await configManager.load(['--production']);
      expect(config1.environment).toBe('production');

      const config2 = await configManager.load(['--development']);
      expect(config2.environment).toBe('development');

      const config3 = await configManager.load(['--test']);
      expect(config3.environment).toBe('test');
    });

    it('should handle verbose and quiet flags', async () => {
      const config1 = await configManager.load(['--verbose']);
      expect(config1.logging.level).toBe('debug');

      const config2 = await configManager.load(['-v']);
      expect(config2.logging.level).toBe('debug');

      const config3 = await configManager.load(['--quiet']);
      expect(config3.logging.level).toBe('error');

      const config4 = await configManager.load(['-q']);
      expect(config4.logging.level).toBe('error');
    });
  });

  describe('Enhanced Environment Detection', () => {
    it('should detect container environments', () => {
      process.env.DOCKER = 'true';
      expect(configManager.getEnvironment()).toBe('production');
      delete process.env.DOCKER;

      process.env.KUBERNETES_SERVICE_HOST = 'kubernetes.default.svc';
      expect(configManager.getEnvironment()).toBe('production');
      delete process.env.KUBERNETES_SERVICE_HOST;
    });

    it('should handle various NODE_ENV values', () => {
      process.env.NODE_ENV = 'dev';
      expect(configManager.getEnvironment()).toBe('development');

      process.env.NODE_ENV = 'prod';
      expect(configManager.getEnvironment()).toBe('production');

      process.env.NODE_ENV = 'staging';
      expect(configManager.getEnvironment()).toBe('development'); // Default fallback
    });

    it('should prioritize PRINTEER_ENV over NODE_ENV', () => {
      process.env.NODE_ENV = 'production';
      process.env.PRINTEER_ENV = 'development';

      // Create new instance to pick up environment changes
      const newConfigManager = new ConfigurationManager(tempDir);
      expect(newConfigManager.getEnvironment()).toBe('development');
    });
  });

  describe('Configuration Source Precedence', () => {
    it('should follow correct precedence order', async () => {
      // Create config file (lowest precedence for this test)
      await writeFile(
        join(tempDir, 'printeer.config.json'),
        JSON.stringify({
          browser: { timeout: 10000 },
          logging: { level: 'error' },
          resources: { maxMemoryMB: 256 }
        })
      );

      // Set environment variable (medium precedence)
      process.env.PRINTEER_BROWSER_TIMEOUT = '20000';
      process.env.PRINTEER_LOG_LEVEL = 'warn';

      // Set CLI arguments (highest precedence)
      const cliArgs = ['--browser-timeout', '30000'];

      const config = await configManager.load(cliArgs);

      // CLI should win
      expect(config.browser.timeout).toBe(30000);

      // Env var should win over config file
      expect(config.logging.level).toBe('warn');

      // Config file should be used when no override
      expect(config.resources.maxMemoryMB).toBe(256);
    });
  });

  describe('Hot Reload with Multiple Sources', () => {
    it('should reload configuration from all sources', async () => {
      // Initial load
      await configManager.load(['--browser-timeout', '30000']);
      expect(configManager.get('browser.timeout')).toBe(30000);

      // Update config file
      await writeFile(
        join(tempDir, 'printeer.config.json'),
        JSON.stringify({
          browser: { timeout: 45000 },
          logging: { level: 'warn' }
        })
      );

      // Update environment variable
      process.env.PRINTEER_MAX_MEMORY_MB = '1024';

      // Reload with same CLI args
      await configManager.reload(['--browser-timeout', '30000']);

      // CLI should still take precedence
      expect(configManager.get('browser.timeout')).toBe(30000);

      // But new values should be loaded
      expect(configManager.get('logging.level')).toBe('warn');
      expect(configManager.get('resources.maxMemoryMB')).toBe(1024);
    });
  });});
