/**
 * Bidirectional Configuration Mapping System
 * Ensures 100% compatibility between CLI options and JSON configurations
 */

import type { EnhancedPrintConfiguration } from '../config/types/enhanced-config.types';
import type { ConfigMapping, CliOptions, EquivalenceValidationResult } from './types/cli.types';
import { EnhancedConfigurationManager } from '../config/enhanced-config-manager';

/**
 * Configuration Mapping Registry
 * Maps CLI options to JSON configuration paths and vice versa
 */
export const CONFIG_MAPPINGS: ConfigMapping[] = [
  // Page Configuration
  { cliOption: 'format', jsonPath: 'page.format', type: 'string' },
  { cliOption: 'orientation', jsonPath: 'page.orientation', type: 'string' },
  { cliOption: 'margins', jsonPath: 'page.margins', type: 'object', parser: parseMargins, serializer: serializeMargins },
  { cliOption: 'custom-size', jsonPath: 'page.format', type: 'object', parser: parseCustomSize, serializer: serializeCustomSize },

  // PDF Configuration
  { cliOption: 'scale', jsonPath: 'pdf.scale', type: 'number' },
  { cliOption: 'print-background', jsonPath: 'pdf.printBackground', type: 'boolean' },
  { cliOption: 'no-print-background', jsonPath: 'pdf.printBackground', type: 'boolean', parser: () => false },
  { cliOption: 'header-template', jsonPath: 'pdf.headerTemplate', type: 'string' },
  { cliOption: 'footer-template', jsonPath: 'pdf.footerTemplate', type: 'string' },
  { cliOption: 'header-footer', jsonPath: 'pdf.displayHeaderFooter', type: 'boolean' },
  { cliOption: 'prefer-css-page-size', jsonPath: 'pdf.preferCSSPageSize', type: 'boolean' },
  { cliOption: 'tagged-pdf', jsonPath: 'pdf.generateTaggedPDF', type: 'boolean' },
  { cliOption: 'pdf-outline', jsonPath: 'pdf.outline', type: 'boolean' },

  // Image Configuration
  { cliOption: 'quality', jsonPath: 'image.quality', type: 'number' },
  { cliOption: 'image-type', jsonPath: 'image.type', type: 'string' },
  { cliOption: 'full-page', jsonPath: 'image.fullPage', type: 'boolean' },
  { cliOption: 'clip', jsonPath: 'image.clip', type: 'object', parser: parseClipRegion, serializer: serializeClipRegion },
  { cliOption: 'optimize-size', jsonPath: 'image.optimizeForSize', type: 'boolean' },

  // Viewport Configuration
  { cliOption: 'viewport', jsonPath: 'viewport', type: 'object', parser: parseViewportConfig, serializer: serializeViewportConfig },
  { cliOption: 'device-scale', jsonPath: 'viewport.deviceScaleFactor', type: 'number' },
  { cliOption: 'mobile', jsonPath: 'viewport.isMobile', type: 'boolean' },
  { cliOption: 'tablet', jsonPath: 'viewport.isTablet', type: 'boolean' },
  { cliOption: 'landscape-viewport', jsonPath: 'viewport.isLandscape', type: 'boolean' },

  // Wait Configuration
  { cliOption: 'wait-until', jsonPath: 'wait.until', type: 'string' },
  { cliOption: 'wait-timeout', jsonPath: 'wait.timeout', type: 'number' },
  { cliOption: 'wait-selector', jsonPath: 'wait.selector', type: 'string' },
  { cliOption: 'wait-delay', jsonPath: 'wait.delay', type: 'number' },
  { cliOption: 'wait-function', jsonPath: 'wait.customFunction', type: 'string' },

  // Media & Emulation Configuration
  { cliOption: 'media-type', jsonPath: 'emulation.mediaType', type: 'string' },
  { cliOption: 'color-scheme', jsonPath: 'emulation.colorScheme', type: 'string' },
  { cliOption: 'timezone', jsonPath: 'emulation.timezone', type: 'string' },
  { cliOption: 'locale', jsonPath: 'emulation.locale', type: 'string' },
  { cliOption: 'user-agent', jsonPath: 'auth.userAgent', type: 'string' },

  // Authentication Configuration
  { cliOption: 'auth', jsonPath: 'auth.basic', type: 'object', parser: parseBasicAuth, serializer: serializeBasicAuth },
  { cliOption: 'headers', jsonPath: 'auth.headers', type: 'object', parser: JSON.parse, serializer: JSON.stringify },
  { cliOption: 'cookies', jsonPath: 'auth.cookies', type: 'object', parser: JSON.parse, serializer: JSON.stringify },

  // Performance Configuration
  { cliOption: 'block-resources', jsonPath: 'performance.blockResources', type: 'array', parser: parseResourceTypes, serializer: serializeResourceTypes },
  { cliOption: 'disable-javascript', jsonPath: 'performance.javascriptEnabled', type: 'boolean', parser: () => false },
  { cliOption: 'cache', jsonPath: 'performance.cacheEnabled', type: 'boolean' },
  { cliOption: 'no-cache', jsonPath: 'performance.cacheEnabled', type: 'boolean', parser: () => false },
  { cliOption: 'load-timeout', jsonPath: 'performance.loadTimeout', type: 'number' },
  { cliOption: 'retry', jsonPath: 'performance.retryAttempts', type: 'number' }
];

/**
 * CLI-to-JSON Configuration Converter
 */
export async function buildConfigFromCliOptions(
  options: CliOptions,
  configManager: EnhancedConfigurationManager
): Promise<Partial<EnhancedPrintConfiguration>> {
  const config: Partial<EnhancedPrintConfiguration> = {};

  // Process all mappings
  for (const mapping of CONFIG_MAPPINGS) {
    // Convert kebab-case cliOption to camelCase to match Commander/CLI parser behavior
    const cliKey = mapping.cliOption.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    const cliValue = (options as any)[cliKey];

    if (cliValue !== undefined) {
      // Parse the value if a parser is provided
      const parsedValue = mapping.parser ? mapping.parser(cliValue) : cliValue;

      // Validate the value if a validator is provided
      if (mapping.validator && !mapping.validator(parsedValue)) {
        console.warn(`Invalid value for --${mapping.cliOption}: ${cliValue}`);
        continue;
      }

      // Set the value in the configuration object using the JSON path
      setNestedValue(config, mapping.jsonPath, parsedValue);
    }
  }

  // Apply mobile defaults when --mobile is set (unless viewport is explicitly specified)
  if ((options as any).mobile && !(options as any).viewport) {
    // Get current viewport or create new one with mobile defaults
    const existingViewport = config.viewport || {};
    config.viewport = {
      width: existingViewport.width ?? 375,       // iPhone X width
      height: existingViewport.height ?? 812,     // iPhone X height
      deviceScaleFactor: existingViewport.deviceScaleFactor ?? 2,  // Retina display
      isMobile: true,
      hasTouch: existingViewport.hasTouch ?? true,
      isLandscape: existingViewport.isLandscape ?? false
    };
  }

  // Apply tablet defaults when --tablet is set (unless viewport is explicitly specified)
  if ((options as any).tablet && !(options as any).viewport && !(options as any).mobile) {
    // Get current viewport or create new one with tablet defaults
    const existingViewport = config.viewport || {};
    config.viewport = {
      width: existingViewport.width ?? 768,       // iPad width
      height: existingViewport.height ?? 1024,    // iPad height
      deviceScaleFactor: existingViewport.deviceScaleFactor ?? 2,  // Retina display
      isMobile: false,  // Tablets are not "mobile" in Puppeteer sense
      hasTouch: existingViewport.hasTouch ?? true,
      isLandscape: existingViewport.isLandscape ?? false
    };
  }

  return config;
}

/**
 * JSON-to-CLI Configuration Converter
 */
export function buildCliOptionsFromConfig(config: Partial<EnhancedPrintConfiguration>): string[] {
  const cliOptions: string[] = [];

  for (const mapping of CONFIG_MAPPINGS) {
    const jsonValue = getNestedValue(config, mapping.jsonPath);

    if (jsonValue !== undefined && jsonValue !== null) {
      // Serialize the value if a serializer is provided
      const serializedValue = mapping.serializer ? mapping.serializer(jsonValue) : String(jsonValue);

      // Handle boolean flags
      if (mapping.type === 'boolean') {
        if (jsonValue === true) {
          cliOptions.push(`--${mapping.cliOption}`);
        } else if (jsonValue === false && mapping.cliOption.startsWith('no-')) {
          cliOptions.push(`--${mapping.cliOption}`);
        }
      } else {
        // Handle value options
        cliOptions.push(`--${mapping.cliOption}`, serializedValue);
      }
    }
  }

  return cliOptions;
}

/**
 * Configuration Equivalence Validator
 */
export async function validateConfigurationEquivalence(
  cliOptions: CliOptions,
  jsonConfig: Partial<EnhancedPrintConfiguration>,
  configManager: EnhancedConfigurationManager
): Promise<EquivalenceValidationResult> {
  const differences: string[] = [];

  // Convert CLI to config
  const configFromCli = await buildConfigFromCliOptions(cliOptions, configManager);

  // Convert JSON config to CLI
  const cliFromConfig = buildCliOptionsFromConfig(jsonConfig);
  const cliOptionsFromConfig = parseCliOptions(cliFromConfig);
  const configFromConvertedCli = await buildConfigFromCliOptions(cliOptionsFromConfig, configManager);

  // Deep compare configurations
  const cliConfigStr = JSON.stringify(sortObjectKeys(configFromCli));
  const jsonConfigStr = JSON.stringify(sortObjectKeys(configFromConvertedCli));

  if (cliConfigStr !== jsonConfigStr) {
    differences.push('Configuration structures differ after round-trip conversion');

    // Find specific differences
    const cliKeys = Object.keys(flattenObject(configFromCli));
    const jsonKeys = Object.keys(flattenObject(configFromConvertedCli));

    const onlyInCli = cliKeys.filter(k => !jsonKeys.includes(k));
    const onlyInJson = jsonKeys.filter(k => !cliKeys.includes(k));

    onlyInCli.forEach(key => differences.push(`Only in CLI config: ${key}`));
    onlyInJson.forEach(key => differences.push(`Only in JSON config: ${key}`));
  }

  return {
    isEquivalent: differences.length === 0,
    differences
  };
}

/**
 * Configuration Converter Class
 */
export class ConfigurationConverter {
  constructor(private configManager: EnhancedConfigurationManager) {}

  /**
   * Export CLI command as JSON configuration
   */
  async exportCliToJson(cliOptions: CliOptions): Promise<Partial<EnhancedPrintConfiguration>> {
    return await buildConfigFromCliOptions(cliOptions, this.configManager);
  }

  /**
   * Generate CLI command from JSON configuration
   */
  generateCliFromJson(config: Partial<EnhancedPrintConfiguration>): string[] {
    return buildCliOptionsFromConfig(config);
  }

  /**
   * Generate complete CLI command string from JSON configuration
   */
  generateCliCommandFromJson(
    config: Partial<EnhancedPrintConfiguration>,
    url?: string,
    output?: string
  ): string {
    const options = this.generateCliFromJson(config);
    const baseCommand = 'printeer convert';
    const urlPart = url ? ` --url ${url}` : '';
    const outputPart = output ? ` --output ${output}` : '';
    const optionsPart = options.length > 0 ? ` ${options.join(' ')}` : '';

    return `${baseCommand}${urlPart}${outputPart}${optionsPart}`;
  }

  /**
   * Validate that CLI and JSON produce equivalent configurations
   */
  async validateEquivalence(
    cliOptions: CliOptions,
    jsonConfig: Partial<EnhancedPrintConfiguration>
  ): Promise<EquivalenceValidationResult> {
    return await validateConfigurationEquivalence(cliOptions, jsonConfig, this.configManager);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const sorted: any = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = sortObjectKeys(obj[key]);
  });

  return sorted;
}

function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const flattened: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  }

  return flattened;
}

export function parseCliOptions(cliArray: string[]): CliOptions {
  const options: any = {};

  for (let i = 0; i < cliArray.length; i++) {
    const arg = cliArray[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-/g, '');
      const nextArg = cliArray[i + 1];

      if (nextArg && !nextArg.startsWith('--')) {
        // Value option
        options[key] = nextArg;
        i++; // Skip next argument
      } else {
        // Boolean flag
        options[key] = true;
      }
    }
  }

  return options;
}

// ============================================================================
// PARSER AND SERIALIZER FUNCTIONS
// ============================================================================

function parseMargins(marginStr: string): any {
  if (marginStr.includes(',')) {
    // Parse individual margins: "top:1in,right:0.5in,bottom:1in,left:0.5in"
    const margins: any = {};
    marginStr.split(',').forEach(part => {
      const [side, value] = part.split(':');
      margins[side.trim()] = value.trim();
    });
    return margins;
  } else {
    // Uniform margins: "1in"
    return { top: marginStr, right: marginStr, bottom: marginStr, left: marginStr };
  }
}

function serializeMargins(margins: any): string {
  if (typeof margins === 'string') return margins;
  if (typeof margins === 'object') {
    return `top:${margins.top},right:${margins.right},bottom:${margins.bottom},left:${margins.left}`;
  }
  return String(margins);
}

function parseCustomSize(sizeStr: string): { width: string; height: string } {
  const [width, height] = sizeStr.split(',').map(s => s.trim());
  return { width, height };
}

function serializeCustomSize(size: { width: string; height: string }): string {
  return `${size.width},${size.height}`;
}

function parseViewportConfig(viewportStr: string): any {
  const [width, height] = viewportStr.split('x').map(s => parseInt(s.trim(), 10));
  return { width, height };
}

function serializeViewportConfig(viewport: any): string {
  return `${viewport.width}x${viewport.height}`;
}

function parseClipRegion(clipStr: string): { x: number; y: number; width: number; height: number } {
  const [x, y, width, height] = clipStr.split(',').map(s => parseInt(s.trim(), 10));
  return { x, y, width, height };
}

function serializeClipRegion(clip: any): string {
  return `${clip.x},${clip.y},${clip.width},${clip.height}`;
}

function parseBasicAuth(authStr: string): { username: string; password: string } {
  const [username, password] = authStr.split(':');
  return { username, password };
}

function serializeBasicAuth(auth: { username: string; password: string }): string {
  return `${auth.username}:${auth.password}`;
}

function parseResourceTypes(typesStr: string): string[] {
  return typesStr.split(',').map(t => t.trim());
}

function serializeResourceTypes(types: string[]): string {
  return types.join(',');
}