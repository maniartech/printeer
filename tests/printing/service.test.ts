import { describe, it, expect, vi } from 'vitest';
import type { PrinteerService } from '../../src/printing/types/service';
import type { PrinteerOptions, ConversionResult } from '../../src/printing/types/conversion';
import type { DiagnosticResult } from '../../src/diagnostics/types/diagnostics';
import type { ServiceStatus } from '../../src/config/types/command-manager';

describe('Service Interfaces', () => {
  describe('PrinteerService', () => {
    it('should define correct interface structure', () => {
      // Create a mock implementation to test interface structure
      const mockService: PrinteerService = {
        start: vi.fn().mockResolvedValue(undefined),
        convert: vi.fn().mockResolvedValue({
          outputFile: '/tmp/test.pdf',
          outputType: 'pdf',
          fileSize: 1024,
          duration: 1000,
          success: true
        } as ConversionResult),
        doctor: vi.fn().mockResolvedValue([
          {
            status: 'pass',
            component: 'browser',
            message: 'Browser available'
          }
        ] as DiagnosticResult[]),
        stop: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          isRunning: true,
          uptime: 1000,
          mode: 'long-running',
          activeRequests: 0,
          totalRequests: 1
        } as ServiceStatus),
        isHealthy: vi.fn().mockReturnValue(true)
      };

      // Test that all methods exist and have correct signatures
      expect(typeof mockService.start).toBe('function');
      expect(typeof mockService.convert).toBe('function');
      expect(typeof mockService.doctor).toBe('function');
      expect(typeof mockService.stop).toBe('function');
      expect(typeof mockService.getStatus).toBe('function');
      expect(typeof mockService.isHealthy).toBe('function');
    });

    it('should handle conversion options correctly', async () => {
      const mockService: PrinteerService = {
        start: vi.fn().mockResolvedValue(undefined),
        convert: vi.fn().mockImplementation(async (options: PrinteerOptions) => {
          return {
            outputFile: options.outputFile,
            outputType: options.outputType || 'pdf',
            fileSize: 1024,
            duration: 1000,
            success: true
          } as ConversionResult;
        }),
        doctor: vi.fn().mockResolvedValue([]),
        stop: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({} as ServiceStatus),
        isHealthy: vi.fn().mockReturnValue(true)
      };

      const options: PrinteerOptions = {
        url: 'https://example.com',
        outputFile: '/tmp/test.pdf',
        outputType: 'pdf'
      };

      const result = await mockService.convert(options);
      
      expect(mockService.convert).toHaveBeenCalledWith(options);
      expect(result.outputFile).toBe('/tmp/test.pdf');
      expect(result.outputType).toBe('pdf');
      expect(result.success).toBe(true);
    });

    it('should return diagnostic results correctly', async () => {
      const expectedDiagnostics: DiagnosticResult[] = [
        {
          status: 'pass',
          component: 'browser',
          message: 'Browser is available'
        },
        {
          status: 'warn',
          component: 'fonts',
          message: 'Limited fonts available',
          remediation: 'Install additional fonts'
        }
      ];

      const mockService: PrinteerService = {
        start: vi.fn().mockResolvedValue(undefined),
        convert: vi.fn().mockResolvedValue({} as ConversionResult),
        doctor: vi.fn().mockResolvedValue(expectedDiagnostics),
        stop: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({} as ServiceStatus),
        isHealthy: vi.fn().mockReturnValue(true)
      };

      const diagnostics = await mockService.doctor();
      
      expect(mockService.doctor).toHaveBeenCalled();
      expect(diagnostics).toEqual(expectedDiagnostics);
      expect(diagnostics).toHaveLength(2);
      expect(diagnostics[0].status).toBe('pass');
      expect(diagnostics[1].status).toBe('warn');
    });
  });
});