import { describe, it, expect } from 'vitest';
import type { 
  CommandContext, 
  CommandResult, 
  ServiceStatus 
} from '../../src/config/types/command-manager';

describe('Command Manager Interfaces', () => {
  describe('CommandContext', () => {
    it('should have correct structure for convert command', () => {
      const context: CommandContext = {
        command: 'convert',
        options: {
          url: 'https://example.com',
          outputFile: '/tmp/output.pdf'
        },
        config: {} as any // Mock config
      };

      expect(context.command).toBe('convert');
      expect(context.options.url).toBe('https://example.com');
      expect(context.options.outputFile).toBe('/tmp/output.pdf');
    });

    it('should support all command types', () => {
      const commands = ['convert', 'doctor', 'serve', 'config'] as const;
      
      commands.forEach(cmd => {
        const context: CommandContext = {
          command: cmd,
          options: {},
          config: {} as any
        };
        
        expect(context.command).toBe(cmd);
      });
    });
  });

  describe('CommandResult', () => {
    it('should have correct structure for successful result', () => {
      const result: CommandResult = {
        success: true,
        data: {
          outputFile: '/tmp/output.pdf',
          fileSize: 1024000
        },
        duration: 5000
      };

      expect(result.success).toBe(true);
      expect(result.data.outputFile).toBe('/tmp/output.pdf');
      expect(result.duration).toBe(5000);
      expect(result.error).toBeUndefined();
    });

    it('should have correct structure for failed result', () => {
      const result: CommandResult = {
        success: false,
        error: 'Page load timeout',
        duration: 30000
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Page load timeout');
      expect(result.duration).toBe(30000);
      expect(result.data).toBeUndefined();
    });
  });

  describe('ServiceStatus', () => {
    it('should have correct structure for service status', () => {
      const status: ServiceStatus = {
        isRunning: true,
        uptime: 3600000,
        mode: 'long-running',
        activeRequests: 2,
        totalRequests: 150,
        lastActivity: new Date()
      };

      expect(status.isRunning).toBe(true);
      expect(status.uptime).toBe(3600000);
      expect(status.mode).toBe('long-running');
      expect(status.activeRequests).toBe(2);
      expect(status.totalRequests).toBe(150);
      expect(status.lastActivity).toBeInstanceOf(Date);
    });

    it('should support idle service status', () => {
      const status: ServiceStatus = {
        isRunning: true,
        uptime: 1800000,
        mode: 'single-shot',
        activeRequests: 0,
        totalRequests: 0
      };

      expect(status.activeRequests).toBe(0);
      expect(status.totalRequests).toBe(0);
      expect(status.lastActivity).toBeUndefined();
    });
  });
});