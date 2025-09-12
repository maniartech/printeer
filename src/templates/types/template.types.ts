/**
 * Template System Types
 * Type definitions for HTML template management and rendering
 */

export type TemplateType = 'header' | 'footer' | 'content';

export interface Template {
  name: string;
  content: string;
  type: TemplateType;
  variables: string[];
  description?: string;
  author?: string;
  version?: string;
  created?: Date;
  modified?: Date;
}

export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TemplateRenderContext {
  variables: Record<string, any>;
  functions?: Record<string, Function>;
  helpers?: Record<string, any>;
}

export interface BuiltInTemplate {
  name: string;
  description: string;
  content: string;
  type: TemplateType;
  variables: string[];
  category: 'corporate' | 'simple' | 'minimal' | 'invoice' | 'report';
}

export class TemplateError extends Error {
  constructor(message: string, public templateName?: string) {
    super(message);
    this.name = 'TemplateError';
  }
}

export class TemplateValidationError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message);
    this.name = 'TemplateValidationError';
  }
}

export class TemplateLoadError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'TemplateLoadError';
  }
}