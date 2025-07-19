import { describe, it, expect } from 'vitest';
import type { 
  PrinteerOptions, 
  ConversionResult, 
  BrowserOptions, 
  RenderOptions,
  Viewport,
  Margin
} from '../conversion';

describe('Conversion Types', () => {
  describe('PrinteerOptions', () => {
    it('should have correct structure for basic conversion options', () => {
      const options: PrinteerOptions = {
        url: 'https://example.com',
        outputFile: '/tmp/output.pdf',
        outputType: 'pdf'
      };

      expect(options.url).toBe('https://example.com');
      expect(options.outputFile).toBe('/tmp/output.pdf');
      expect(options.outputType).toBe('pdf');
    });

    it('should support browser and render options', () => {
      const viewport: Viewport = {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 2
      };

      const margin: Margin = {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      };

      const browserOptions: BrowserOptions = {
        headless: true,
        viewport,
        timeout: 30000
      };

      const renderOptions: RenderOptions = {
        waitUntil: 'networkidle0',
        timeout: 30000,
        quality: 90,
        format: 'A4',
        margin,
        fullPage: true
      };

      const options: PrinteerOptions = {
        url: 'https://example.com',
        outputFile: '/tmp/output.pdf',
        outputType: 'pdf',
        browserOptions,
        renderOptions
      };

      expect(options.browserOptions?.viewport?.width).toBe(1920);
      expect(options.renderOptions?.waitUntil).toBe('networkidle0');
      expect(options.renderOptions?.margin?.top).toBe('1cm');
    });
  });

  describe('ConversionResult', () => {
    it('should have correct structure for successful conversion', () => {
      const result: ConversionResult = {
        outputFile: '/tmp/output.pdf',
        outputType: 'pdf',
        fileSize: 1024000,
        duration: 5000,
        success: true,
        metadata: {
          pageTitle: 'Example Page',
          pageUrl: 'https://example.com',
          timestamp: new Date(),
          browserVersion: '119.0.0.0'
        }
      };

      expect(result.success).toBe(true);
      expect(result.outputType).toBe('pdf');
      expect(result.fileSize).toBe(1024000);
      expect(result.duration).toBe(5000);
      expect(result.metadata?.pageTitle).toBe('Example Page');
    });

    it('should have correct structure for failed conversion', () => {
      const result: ConversionResult = {
        outputFile: '',
        outputType: 'pdf',
        fileSize: 0,
        duration: 2000,
        success: false,
        error: 'Page load timeout'
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Page load timeout');
      expect(result.fileSize).toBe(0);
    });
  });

  describe('Type Validation', () => {
    it('should validate output types', () => {
      const pdfOptions: PrinteerOptions = {
        url: 'https://example.com',
        outputFile: '/tmp/output.pdf',
        outputType: 'pdf'
      };

      const pngOptions: PrinteerOptions = {
        url: 'https://example.com',
        outputFile: '/tmp/output.png',
        outputType: 'png'
      };

      expect(pdfOptions.outputType).toBe('pdf');
      expect(pngOptions.outputType).toBe('png');
    });

    it('should validate wait until options', () => {
      const renderOptions: RenderOptions = {
        waitUntil: 'networkidle2',
        timeout: 30000
      };

      expect(renderOptions.waitUntil).toBe('networkidle2');
    });
  });
});