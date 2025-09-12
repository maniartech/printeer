/**
 * Template Manager
 * Comprehensive template management system for headers, footers, and content
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  Template,
  TemplateType,
  TemplateValidationResult,
  TemplateRenderContext,
  BuiltInTemplate
} from './types/template.types';
import {
  TemplateError,
  TemplateValidationError,
  TemplateLoadError
} from './types/template.types';

export class TemplateManager {
  private templates: Map<string, Template> = new Map();
  private builtInTemplates: Map<string, BuiltInTemplate> = new Map();

  constructor() {
    this.loadBuiltInTemplates();
  }

  /**
   * Load template from file
   */
  async loadTemplate(name: string, filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const template = await this.parseTemplate(content, name);

      // Validate template
      const validation = await this.validateTemplate(template);
      if (!validation.valid) {
        throw new TemplateValidationError(
          `Invalid template: ${name}`,
          validation.errors
        );
      }

      this.templates.set(name, template);
    } catch (error) {
      throw new TemplateLoadError(
        `Failed to load template: ${name}`,
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * Render template with variables
   */
  renderTemplate(
    name: string,
    variables: Record<string, any>
  ): string {
    const template = this.templates.get(name) ||
                    this.getBuiltInTemplate(name);

    if (!template) {
      throw new TemplateError(`Template '${name}' not found`);
    }

    return this.renderTemplateContent(template.content, variables);
  }

  /**
   * Render template content with variable substitution
   */
  renderTemplateContent(
    content: string,
    variables: Record<string, any>
  ): string {
    let rendered = content;

    // Handle {{variable}} syntax
    rendered = rendered.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(variables, path);
      return value !== undefined ? String(value) : match;
    });

    // Handle {variable} syntax
    rendered = rendered.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });

    // Handle special Puppeteer variables
    rendered = this.handleSpecialVariables(rendered);

    return rendered;
  }

  /**
   * Validate template structure and syntax
   */
  async validateTemplate(template: Template): Promise<TemplateValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate basic structure
    if (!template.content.trim()) {
      errors.push('Template content cannot be empty');
    }

    // Check for required CSS classes for page variables
    if (template.type === 'header' || template.type === 'footer') {
      if (template.content.includes('pageNumber') &&
          !template.content.includes('class="pageNumber"')) {
        errors.push('pageNumber variable must use class="pageNumber"');
      }

      if (template.content.includes('totalPages') &&
          !template.content.includes('class="totalPages"')) {
        errors.push('totalPages variable must use class="totalPages"');
      }
    }

    // Validate variable syntax
    const invalidVariables = template.content.match(/\{\{[^}]*\}\}/g)?.filter(v =>
      !/^\{\{\w+(?:\.\w+)*\}\}$/.test(v)
    );

    if (invalidVariables && invalidVariables.length > 0) {
      errors.push(`Invalid variable syntax: ${invalidVariables.join(', ')}`);
    }

    // Check for basic HTML structure issues
    const openTags = (template.content.match(/<[^/][^>]*>/g) || []).length;
    const closeTags = (template.content.match(/<\/[^>]*>/g) || []).length;
    
    if (openTags !== closeTags) {
      warnings.push('Potential HTML structure issue: unmatched tags detected');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get available template names
   */
  getAvailableTemplates(): string[] {
    const customTemplates = Array.from(this.templates.keys());
    const builtInTemplates = Array.from(this.builtInTemplates.keys());
    return [...customTemplates, ...builtInTemplates];
  }

  /**
   * Get template information
   */
  getTemplateInfo(name: string): Template | BuiltInTemplate | null {
    return this.templates.get(name) || this.builtInTemplates.get(name) || null;
  }

  /**
   * Extract variables from template content
   */
  extractVariables(content: string): string[] {
    const variables = new Set<string>();

    // Extract {{variable}} patterns
    const matches = content.match(/\{\{(\w+(?:\.\w+)*)\}\}/g);
    if (matches) {
      matches.forEach(match => {
        const variable = match.slice(2, -2); // Remove {{ and }}
        variables.add(variable);
      });
    }

    // Extract {variable} patterns
    const simpleMatches = content.match(/\{(\w+)\}/g);
    if (simpleMatches) {
      simpleMatches.forEach(match => {
        const variable = match.slice(1, -1); // Remove { and }
        variables.add(variable);
      });
    }

    return Array.from(variables);
  }

  /**
   * Get built-in templates
   */
  getBuiltInTemplates(): Record<string, string> {
    const templates: Record<string, string> = {};
    
    for (const [name, template] of this.builtInTemplates) {
      templates[name] = template.content;
    }

    return templates;
  }

  /**
   * Handle special Puppeteer variables
   */
  private handleSpecialVariables(content: string): string {
    const now = new Date();
    
    return content
      .replace(/\{\{pageNumber\}\}/g, '<span class="pageNumber"></span>')
      .replace(/\{\{totalPages\}\}/g, '<span class="totalPages"></span>')
      .replace(/\{\{date\}\}/g, now.toLocaleDateString())
      .replace(/\{\{time\}\}/g, now.toLocaleTimeString())
      .replace(/\{\{url\}\}/g, '<span class="url"></span>')
      .replace(/\{\{title\}\}/g, '<span class="title"></span>')
      .replace(/\{\{timestamp\}\}/g, now.toISOString());
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Get built-in template by name
   */
  private getBuiltInTemplate(name: string): Template | null {
    const builtIn = this.builtInTemplates.get(name);
    if (!builtIn) {
      return null;
    }

    return {
      name: builtIn.name,
      content: builtIn.content,
      type: builtIn.type,
      variables: builtIn.variables,
      description: builtIn.description
    };
  }

  /**
   * Parse template from content
   */
  private async parseTemplate(content: string, name: string): Promise<Template> {
    const variables = this.extractVariables(content);
    const type = this.detectTemplateType(content, name);

    return {
      name,
      content,
      type,
      variables,
      created: new Date()
    };
  }

  /**
   * Detect template type from content and name
   */
  private detectTemplateType(content: string, name: string): TemplateType {
    if (name.toLowerCase().includes('header') ||
        content.includes('pageNumber') ||
        content.includes('totalPages')) {
      return 'header';
    }

    if (name.toLowerCase().includes('footer')) {
      return 'footer';
    }

    return 'content';
  }

  /**
   * Load built-in templates
   */
  private loadBuiltInTemplates(): void {
    const templates: BuiltInTemplate[] = [
      {
        name: 'simple-header',
        description: 'Simple header with title and page numbers',
        category: 'simple',
        type: 'header',
        variables: ['title', 'pageNumber', 'totalPages'],
        content: `
          <div style="font-size: 10px; text-align: center; width: 100%; padding: 5px 0;">
            <span style="float: left;">{{title}}</span>
            <span style="float: right;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        `
      },
      {
        name: 'simple-footer',
        description: 'Simple footer with generation date and time',
        category: 'simple',
        type: 'footer',
        variables: ['date', 'time'],
        content: `
          <div style="font-size: 9px; text-align: center; width: 100%; padding: 5px 0;">
            <span>Generated on {{date}} at {{time}}</span>
          </div>
        `
      },
      {
        name: 'corporate-header',
        description: 'Professional corporate header with company information',
        category: 'corporate',
        type: 'header',
        variables: ['company.name', 'company.address', 'document.type', 'document.date'],
        content: `
          <div style="font-size: 11px; width: 100%; padding: 10px 0; border-bottom: 1px solid #ccc;">
            <div style="float: left;">
              <strong>{{company.name}}</strong><br>
              <small>{{company.address}}</small>
            </div>
            <div style="float: right; text-align: right;">
              <strong>{{document.type}}</strong><br>
              <small>{{document.date}}</small>
            </div>
          </div>
        `
      },
      {
        name: 'corporate-footer',
        description: 'Professional corporate footer with company details',
        category: 'corporate',
        type: 'footer',
        variables: ['company.name', 'company.website', 'pageNumber', 'totalPages'],
        content: `
          <div style="font-size: 9px; text-align: center; width: 100%; padding: 5px 0; border-top: 1px solid #ccc;">
            <span>{{company.name}} - {{company.website}} - Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        `
      },
      {
        name: 'invoice-header',
        description: 'Professional invoice header with company and invoice details',
        category: 'invoice',
        type: 'header',
        variables: ['company.name', 'company.address', 'company.city', 'company.state', 'company.zip', 'company.phone', 'invoice.number', 'invoice.date', 'invoice.dueDate'],
        content: `
          <div style="font-size: 12px; width: 100%; padding: 15px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 50%; vertical-align: top;">
                  <strong style="font-size: 14px;">{{company.name}}</strong><br>
                  {{company.address}}<br>
                  {{company.city}}, {{company.state}} {{company.zip}}<br>
                  {{company.phone}}
                </td>
                <td style="width: 50%; text-align: right; vertical-align: top;">
                  <h2 style="margin: 0; color: #333;">INVOICE</h2>
                  <strong>Invoice #: {{invoice.number}}</strong><br>
                  <strong>Date: {{invoice.date}}</strong><br>
                  <strong>Due Date: {{invoice.dueDate}}</strong>
                </td>
              </tr>
            </table>
          </div>
        `
      },
      {
        name: 'report-header',
        description: 'Professional report header with title and period',
        category: 'report',
        type: 'header',
        variables: ['report.title', 'report.period', 'pageNumber', 'totalPages'],
        content: `
          <div style="font-size: 11px; width: 100%; padding: 10px 0; background: #f5f5f5;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 33%; vertical-align: middle;">
                  <strong>{{report.title}}</strong>
                </td>
                <td style="width: 34%; text-align: center; vertical-align: middle;">
                  Period: {{report.period}}
                </td>
                <td style="width: 33%; text-align: right; vertical-align: middle;">
                  Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                </td>
              </tr>
            </table>
          </div>
        `
      },
      {
        name: 'minimal-header',
        description: 'Minimal header with just page numbers',
        category: 'minimal',
        type: 'header',
        variables: ['pageNumber', 'totalPages'],
        content: `
          <div style="font-size: 8px; text-align: right; width: 100%; padding: 3px 0;">
            <span class="pageNumber"></span> / <span class="totalPages"></span>
          </div>
        `
      },
      {
        name: 'minimal-footer',
        description: 'Minimal footer with just the date',
        category: 'minimal',
        type: 'footer',
        variables: ['date'],
        content: `
          <div style="font-size: 8px; text-align: center; width: 100%; padding: 3px 0;">
            {{date}}
          </div>
        `
      }
    ];

    for (const template of templates) {
      this.builtInTemplates.set(template.name, template);
    }
  }
}