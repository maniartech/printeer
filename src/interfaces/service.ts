// Main service interfaces for library usage

import { PrinteerOptions, ConversionResult } from '../types/conversion';
import { DiagnosticResult } from '../types/diagnostics';
import { Configuration } from '../types/configuration';
import { ServiceStatus } from './command-manager';

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