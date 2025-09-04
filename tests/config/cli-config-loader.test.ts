import { describe, it, expect } from 'vitest';
import { CliConfigLoader } from '../../src/config/cli-config-loader.js';

describe('CliConfigLoader', () => {
  describe('parseCliArgs', () => {
    it('should parse mode arguments', () => {
      const config1 = CliConfigLoader.parseCliArgs(['--mode', 'long-running']);
      expect(config1.mode).toBe('long-running');

      const config2 = CliConfigLoader.parseCliArgs(['--mode', 'single-shot']);
      expect(config2.mode).toBe('single-shot');
    });

    it('should parse environment arguments', () => {
      const config1 = CliConfigLoader.parseCliArgs(['--environment', 'production']);
      expect(config1.environment).toBe('production');

      const config2 = CliConfigLoader.parseCliArgs(['--env', 'development']);
      expect(config2.environment).toBe('development');

      const config3 = CliConfigLoader.parseCliArgs(['--test']);
      expect(config3.environment).toBe('test');

      const config4 = CliConfigLoader.parseCliArgs(['--production']);
      expect(config4.environment).toBe('production');

      const config5 = CliConfigLoader.parseCliArgs(['--development']);
      expect(config5.environment).toBe('development');
    });

    it('should parse browser arguments', () => {
      const config1 = CliConfigLoader.parseCliArgs(['--headless']);
      expect(config1.browser?.headless).toBe(true);

      const config2 = CliConfigLoader.parseCliArgs(['--headless', 'auto']);
      expect(config2.browser?.headless).toBe('auto');

      const config3 = CliConfigLoader.parseCliArgs(['--no-headless']);
      expect(config3.browser?.headless).toBe(false);

      const config4 = CliConfigLoader.parseCliArgs(['--browser-timeout', '60000']);
      expect(config4.browser?.timeout).toBe(60000);

      const config5 = CliConfigLoader.parseCliArgs(['--browser-executable', '/usr/bin/chrome']);
      expect(config5.browser?.executablePath).toBe('/usr/bin/chrome');
    });

    it('should parse browser pool arguments', () => {
      const config1 = CliConfigLoader.parseCliArgs(['--pool-min', '2']);
      expect(config1.browser?.pool?.min).toBe(2);

      const config2 = CliConfigLoader.parseCliArgs(['--pool-max', '10']);
      expect(config2.browser?.pool?.max).toBe(10);

      const config3 = CliConfigLoader.parseCliArgs(['--pool-min', '1', '--pool-max', '5']);
      expect(config3.browser?.pool?.min).toBe(1);
      expect(config3.browser?.pool?.max).toBe(5);
    });

    it('should parse resource arguments', () => {
      const config1 = CliConfigLoader.parseCliArgs(['--max-memory', '2048']);
      expect(config1.resources?.maxMemoryMB).toBe(2048);

      const config2 = CliConfigLoader.parseCliArgs(['--max-cpu', '75']);
      expect(config2.resources?.maxCpuPercent).toBe(75);

      const config3 = CliConfigLoader.parseCliArgs(['--max-concurrent', '15']);
      expect(config3.resources?.maxConcurrentRequests).toBe(15);
    });

    it('should parse logging arguments', () => {
      const config1 = CliConfigLoader.parseCliArgs(['--log-level', 'warn']);
      expect(config1.logging?.level).toBe('warn');

      const config2 = CliConfigLoader.parseCliArgs(['--log-format', 'json']);
      expect(config2.logging?.format).toBe('json');

      const config3 = CliConfigLoader.parseCliArgs(['--log-destination', 'file']);
      expect(config3.logging?.destination).toBe('file');

      const config4 = CliConfigLoader.parseCliArgs(['--verbose']);
      expect(config4.logging?.level).toBe('debug');

      const config5 = CliConfigLoader.parseCliArgs(['-v']);
      expect(config5.logging?.level).toBe('debug');

      const config6 = CliConfigLoader.parseCliArgs(['--quiet']);
      expect(config6.logging?.level).toBe('error');

      const config7 = CliConfigLoader.parseCliArgs(['-q']);
      expect(config7.logging?.level).toBe('error');
    });

    it('should parse security arguments', () => {
      const config1 = CliConfigLoader.parseCliArgs(['--allowed-domains', 'example.com,test.com']);
      expect(config1.security?.allowedDomains).toEqual(['example.com', 'test.com']);

      const config2 = CliConfigLoader.parseCliArgs(['--blocked-domains', 'bad.com,malicious.com']);
      expect(config2.security?.blockedDomains).toEqual(['bad.com', 'malicious.com']);
    });

    it('should parse long-running mode arguments', () => {
      const config1 = CliConfigLoader.parseCliArgs(['--cooling-period', '600000']);
      expect(config1.longRunning?.coolingPeriodMs).toBe(600000);

      const config2 = CliConfigLoader.parseCliArgs(['--max-uptime', '172800000']);
      expect(config2.longRunning?.maxUptime).toBe(172800000);
    });

    it('should handle multiple arguments', () => {
      const config = CliConfigLoader.parseCliArgs([
        '--mode', 'long-running',
        '--environment', 'production',
        '--headless',
        '--browser-timeout', '45000',
        '--max-memory', '1024',
        '--log-level', 'info',
        '--allowed-domains', 'example.com,test.com'
      ]);

      expect(config.mode).toBe('long-running');
      expect(config.environment).toBe('production');
      expect(config.browser?.headless).toBe(true);
      expect(config.browser?.timeout).toBe(45000);
      expect(config.resources?.maxMemoryMB).toBe(1024);
      expect(config.logging?.level).toBe('info');
      expect(config.security?.allowedDomains).toEqual(['example.com', 'test.com']);
    });

    it('should ignore invalid arguments', () => {
      const config1 = CliConfigLoader.parseCliArgs(['--mode', 'invalid-mode']);
      expect(config1.mode).toBeUndefined();

      const config2 = CliConfigLoader.parseCliArgs(['--environment', 'invalid-env']);
      expect(config2.environment).toBeUndefined();

      const config3 = CliConfigLoader.parseCliArgs(['--log-level', 'invalid-level']);
      expect(config3.logging?.level).toBeUndefined();

      const config4 = CliConfigLoader.parseCliArgs(['--browser-timeout', 'not-a-number']);
      expect(config4.browser?.timeout).toBeUndefined();
    });

    it('should handle missing values gracefully', () => {
      const config1 = CliConfigLoader.parseCliArgs(['--mode']);
      expect(config1.mode).toBeUndefined();

      const config2 = CliConfigLoader.parseCliArgs(['--browser-timeout']);
      expect(config2.browser?.timeout).toBeUndefined();

      const config3 = CliConfigLoader.parseCliArgs(['--allowed-domains']);
      expect(config3.security?.allowedDomains).toBeUndefined();
    });

    it('should handle empty arguments array', () => {
      const config = CliConfigLoader.parseCliArgs([]);
      expect(Object.keys(config)).toHaveLength(0);
    });

    it('should handle unknown arguments gracefully', () => {
      const config = CliConfigLoader.parseCliArgs(['--unknown-arg', 'value', '--another-unknown']);
      expect(Object.keys(config)).toHaveLength(0);
    });

    it('should trim domain values', () => {
      const config = CliConfigLoader.parseCliArgs(['--allowed-domains', ' example.com , test.com ']);
      expect(config.security?.allowedDomains).toEqual(['example.com', 'test.com']);
    });
  });

  describe('getHelpText', () => {
    it('should return help text', () => {
      const helpText = CliConfigLoader.getHelpText();
      expect(helpText).toContain('Configuration Options');
      expect(helpText).toContain('--mode');
      expect(helpText).toContain('--environment');
      expect(helpText).toContain('--headless');
      expect(helpText).toContain('--log-level');
      expect(helpText).toContain('--allowed-domains');
    });

    it('should include all major option categories', () => {
      const helpText = CliConfigLoader.getHelpText();
      expect(helpText).toContain('Browser Options');
      expect(helpText).toContain('Resource Options');
      expect(helpText).toContain('Logging Options');
      expect(helpText).toContain('Security Options');
      expect(helpText).toContain('Long-Running Mode Options');
      expect(helpText).toContain('Environment Shortcuts');
    });
  });
});