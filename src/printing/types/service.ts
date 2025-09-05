// Main service interfaces for library usage

import { PrinteerOptions, ConversionResult } from './conversion';
import { DiagnosticResult } from '../../diagnostics/types/diagnostics';
import { Configuration } from '../../config/types/configuration';
import { ServiceStatus } from '../../config/types/command-manager';

export interface PrinteerService {
  start(): Promise<void>;
  convert(options: PrinteerOptions): Promise<ConversionResult>;
  doctor(): Promise<DiagnosticResult[]>;
  stop(): Promise<void>;
  getStatus(): ServiceStatus;
  isHealthy(): boolean;
}

export interface ServiceFactory {
  createService(config?: Partial<Configuration>): PrinteerService;
  validateConfiguration(config: Partial<Configuration>): boolean;
  getDefaultConfiguration(): Configuration;
}