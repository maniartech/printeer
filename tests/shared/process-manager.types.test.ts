import { describe, it, expect } from 'vitest';
import type { 
  ProcessState, 
  ShutdownOptions 
} from '../../src/types/process-manager';

describe('Process Manager Interfaces', () => {
  describe('ProcessState', () => {
    it('should have correct structure for active process state', () => {
      const state: ProcessState = {
        mode: 'long-running',
        startTime: new Date(),
        lastActivity: new Date(),
        isShuttingDown: false,
        activeRequests: 3,
        totalRequests: 100
      };

      expect(state.mode).toBe('long-running');
      expect(state.startTime).toBeInstanceOf(Date);
      expect(state.lastActivity).toBeInstanceOf(Date);
      expect(state.isShuttingDown).toBe(false);
      expect(state.activeRequests).toBe(3);
      expect(state.totalRequests).toBe(100);
    });

    it('should support shutting down state', () => {
      const state: ProcessState = {
        mode: 'single-shot',
        startTime: new Date(),
        lastActivity: new Date(),
        isShuttingDown: true,
        activeRequests: 1,
        totalRequests: 1
      };

      expect(state.isShuttingDown).toBe(true);
      expect(state.mode).toBe('single-shot');
    });
  });

  describe('ShutdownOptions', () => {
    it('should have correct structure for graceful shutdown', () => {
      const options: ShutdownOptions = {
        reason: 'ttl-expired',
        timeout: 30000,
        force: false
      };

      expect(options.reason).toBe('ttl-expired');
      expect(options.timeout).toBe(30000);
      expect(options.force).toBe(false);
    });

    it('should support forced shutdown', () => {
      const options: ShutdownOptions = {
        reason: 'signal',
        timeout: 5000,
        force: true
      };

      expect(options.reason).toBe('signal');
      expect(options.force).toBe(true);
    });

    it('should support all shutdown reasons', () => {
      const reasons = ['ttl-expired', 'signal', 'error', 'manual'] as const;
      
      reasons.forEach(reason => {
        const options: ShutdownOptions = {
          reason,
          timeout: 10000,
          force: false
        };
        
        expect(options.reason).toBe(reason);
      });
    });
  });
});