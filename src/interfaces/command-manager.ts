// Command management interfaces

import { Configuration } from '../types/configuration';

export type CommandType = 'convert' | 'doctor' | 'serve' | 'config';

export interface CommandContext {
  command: CommandType;
  options: any;
  config: Configuration;
}

export interface CommandResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

export interface CommandManager {
  initialize(config: Configuration): Promise<void>;
  executeCommand(context: CommandContext): Promise<CommandResult>;
  shutdown(): Promise<void>;
  getStatus(): ServiceStatus;
}

export interface ServiceStatus {
  isRunning: boolean;
  uptime: number;
  mode: string;
  activeRequests: number;
  totalRequests: number;
  lastActivity?: Date;
}