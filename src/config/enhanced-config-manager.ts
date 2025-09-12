/**
 * Enhanced Configuration Manager
 * Comprehensive configuration system supporting JSON/YAML files, presets, environments, and validation
 */

import { cosmiconfig } from 'cosmiconfig';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs/promises';
import * as yaml from 'yaml';
import type {
    EnhancedPrintConfiguration,
    ConfigurationFile,
    ConfigurationPreset,
    ValidationResult,
    ValidationError,
    ResolvedConfiguration,
    ConfigurationSource
} from './types/enhanced-config.types';

export class ConfigurationError extends Error {
    constructor(message: string, public errors?: ValidationError[]) {
        super(message);
        this.name = 'ConfigurationError';
    }
}

export class EnhancedConfigurationManager {
    private explorer = cosmiconfig('printeer');
    private validator: Ajv;
    private loadedConfig?: ConfigurationFile;
    private configPath?: string;

    constructor() {
        this.validator = new Ajv({
            allErrors: true,
            removeAdditional: false,
            useDefaults: true,
            coerceTypes: true
        });
        addFormats(this.validator);
        this.setupValidationSchema();
    }

    /**
     * Load configuration from file or search for configuration files
     */
    async loadConfiguration(
        configPath?: string,
        environment?: string
    ): Promise<ResolvedConfiguration> {
        const sources: ConfigurationSource[] = [];
        let config: Partial<EnhancedPrintConfiguration> = {};

        // Load configuration file
        const result = configPath
            ? await this.explorer.load(configPath)
            : await this.explorer.search();

        if (result?.config) {
            this.loadedConfig = result.config;
            this.configPath = result.filepath;

            sources.push({
                type: 'file',
                path: result.filepath
            });

            // Validate configuration schema
            const validation = this.validateConfiguration(result.config);
            if (!validation.valid) {
                throw new ConfigurationError(
                    'Invalid configuration file',
                    validation.errors
                );
            }

            // Start with defaults
            if (result.config.defaults) {
                config = merge(config as Record<string, any>, result.config.defaults as Record<string, any>) as Partial<EnhancedPrintConfiguration>;
                sources.push({ type: 'default' });
            }

            // Apply environment-specific overrides
            if (environment && result.config.environments?.[environment]) {
                config = merge(config as Record<string, any>, result.config.environments[environment] as Record<string, any>) as Partial<EnhancedPrintConfiguration>;
                sources.push({
                    type: 'environment',
                    name: environment
                });
            }
        } else {
            // Use built-in defaults if no config file found
            config = this.getDefaultConfiguration();
            sources.push({ type: 'default' });
        }

        // Ensure we have a complete configuration
        const finalConfig = this.ensureCompleteConfiguration(config);

        return {
            config: finalConfig,
            sources,
            warnings: []
        };
    }

    /**
     * Get a specific preset configuration
     */
    async getPreset(name: string): Promise<Partial<EnhancedPrintConfiguration>> {
        // Check built-in presets first
        const builtInPresets = this.getBuiltInPresets();
        if (builtInPresets[name]) {
            return builtInPresets[name];
        }

        // Check loaded configuration presets
        if (!this.loadedConfig) {
            await this.loadConfiguration();
        }

        const preset = this.loadedConfig?.presets?.[name];
        if (!preset) {
            throw new Error(`Preset '${name}' not found`);
        }

        // Handle preset inheritance
        if (preset.extends) {
            const basePreset = await this.getPreset(preset.extends);
            return merge({} as Record<string, any>, basePreset as Record<string, any>, preset.config as Record<string, any>) as Partial<EnhancedPrintConfiguration>;
        }

        return preset.config;
    }

    /**
     * Validate configuration against schema
     */
    validateConfiguration(config: any): ValidationResult {
        // Check if this looks like a configuration file (has expected structure)
        const isConfigFile = config && (config.defaults || config.environments || config.presets || config.$schema);
        
        // If it's a configuration file, validate against the config file schema
        // If it's a configuration object, validate against the configuration schema
        const schemaName = isConfigFile ? 'enhanced-config' : 'configuration-object';
        const isValid = this.validator.validate(schemaName, config);

        const errors: ValidationError[] = [];
        if (this.validator.errors) {
            for (const error of this.validator.errors) {
                errors.push({
                    path: error.instancePath || error.schemaPath || 'root',
                    message: error.message || 'Validation error',
                    value: error.data
                });
            }
        }

        // Additional validation for unknown properties in config files
        if (isConfigFile && config) {
            const allowedKeys = ['$schema', 'defaults', 'environments', 'presets'];
            const unknownKeys = Object.keys(config).filter(key => !allowedKeys.includes(key));
            if (unknownKeys.length > 0) {
                errors.push({
                    path: 'root',
                    message: `Unknown properties: ${unknownKeys.join(', ')}. Allowed properties are: ${allowedKeys.join(', ')}`,
                    value: unknownKeys
                });
            }
        }

        return {
            valid: isValid && errors.length === 0,
            errors,
            formattedErrors: this.formatValidationErrors(errors)
        };
    }

    /**
     * Get available presets (built-in + custom)
     */
    async getAvailablePresets(): Promise<Record<string, ConfigurationPreset>> {
        const presets: Record<string, ConfigurationPreset> = {};

        // Add built-in presets
        const builtInPresets = this.getBuiltInPresets();
        for (const [name, config] of Object.entries(builtInPresets)) {
            presets[name] = {
                name,
                description: `Built-in preset: ${name}`,
                config
            };
        }

        // Add custom presets from loaded configuration
        if (this.loadedConfig?.presets) {
            for (const [name, preset] of Object.entries(this.loadedConfig.presets)) {
                presets[name] = preset;
            }
        }

        return presets;
    }

    /**
     * Merge multiple configurations with proper precedence
     */
    mergeConfigurations(
        base: Partial<EnhancedPrintConfiguration>,
        ...overrides: Partial<EnhancedPrintConfiguration>[]
    ): EnhancedPrintConfiguration {
        const merged = merge({} as Record<string, any>, base as Record<string, any>, ...overrides.map(o => o as Record<string, any>)) as Partial<EnhancedPrintConfiguration>;
        return this.ensureCompleteConfiguration(merged);
    }

    /**
     * Export configuration to file
     */
    async exportConfiguration(
        config: Partial<EnhancedPrintConfiguration>,
        filePath: string,
        format: 'json' | 'yaml' = 'json'
    ): Promise<void> {
        const configFile: ConfigurationFile = {
            $schema: './node_modules/printeer/schemas/config.schema.json',
            defaults: config
        };

        let content: string;
        if (format === 'yaml') {
            content = yaml.stringify(configFile);
        } else {
            content = JSON.stringify(configFile, null, 2);
        }

        await fs.writeFile(filePath, content, 'utf8');
    }

    /**
     * Get built-in configuration presets
     */
    getBuiltInPresets(): Record<string, Partial<EnhancedPrintConfiguration>> {
        return {
            'web-article': {
                page: {
                    format: 'A4',
                    orientation: 'portrait',
                    margins: { top: '1in', right: '1in', bottom: '1in', left: '1in' }
                },
                pdf: {
                    printBackground: true,
                    scale: 0.8,
                    displayHeaderFooter: false
                },
                wait: {
                    until: 'networkidle0',
                    timeout: 30000
                },
                emulation: {
                    mediaType: 'screen',
                    colorScheme: 'light',
                    reducedMotion: 'no-preference'
                }
            },
            'mobile-responsive': {
                viewport: {
                    width: 375,
                    height: 667,
                    isMobile: true,
                    hasTouch: true,
                    isLandscape: false,
                    deviceScaleFactor: 2
                },
                page: {
                    format: 'A4',
                    orientation: 'portrait',
                    margins: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
                },
                emulation: {
                    mediaType: 'screen',
                    colorScheme: 'light',
                    reducedMotion: 'no-preference'
                }
            },
            'print-optimized': {
                emulation: {
                    mediaType: 'print',
                    colorScheme: 'light',
                    reducedMotion: 'reduce'
                },
                pdf: {
                    preferCSSPageSize: true,
                    printBackground: false,
                    scale: 1.0,
                    displayHeaderFooter: false
                },
                wait: {
                    until: 'networkidle0',
                    timeout: 45000
                }
            },
            'high-quality': {
                image: {
                    quality: 100,
                    type: 'png',
                    fullPage: true,
                    optimizeForSize: false,
                    encoding: 'binary'
                },
                viewport: {
                    deviceScaleFactor: 2,
                    width: 1920,
                    height: 1080,
                    isMobile: false,
                    hasTouch: false,
                    isLandscape: false
                },
                performance: {
                    blockResources: [],
                    cacheEnabled: true,
                    javascriptEnabled: true,
                    maxConcurrent: 1,
                    retryAttempts: 3,
                    loadTimeout: 60000
                }
            },
            'fast-batch': {
                performance: {
                    blockResources: ['image', 'font', 'stylesheet'],
                    maxConcurrent: 10,
                    cacheEnabled: true,
                    javascriptEnabled: false,
                    retryAttempts: 1,
                    loadTimeout: 15000
                },
                pdf: {
                    printBackground: false,
                    scale: 0.6,
                    displayHeaderFooter: false
                },
                wait: {
                    until: 'domcontentloaded',
                    timeout: 10000
                }
            }
        };
    }

    /**
     * Get default configuration
     */
    private getDefaultConfiguration(): Partial<EnhancedPrintConfiguration> {
        return {
            page: {
                format: 'A4',
                orientation: 'portrait',
                margins: { top: '1in', right: '1in', bottom: '1in', left: '1in' }
            },
            pdf: {
                printBackground: true,
                displayHeaderFooter: false,
                preferCSSPageSize: false,
                generateTaggedPDF: false,
                scale: 1.0,
                omitBackground: false,
                outline: false
            },
            image: {
                fullPage: true,
                quality: 90,
                type: 'png',
                encoding: 'binary',
                optimizeForSize: false
            },
            viewport: {
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1,
                isMobile: false,
                hasTouch: false,
                isLandscape: false
            },
            wait: {
                until: 'networkidle0',
                timeout: 30000
            },
            auth: {},
            emulation: {
                mediaType: 'screen',
                colorScheme: 'no-preference',
                reducedMotion: 'no-preference'
            },
            performance: {
                blockResources: [],
                maxConcurrent: 3,
                retryAttempts: 2,
                cacheEnabled: true,
                javascriptEnabled: true,
                loadTimeout: 30000
            }
        };
    }

    /**
     * Ensure configuration is complete with all required fields
     */
    private ensureCompleteConfiguration(
        config: Partial<EnhancedPrintConfiguration>
    ): EnhancedPrintConfiguration {
        const defaults = this.getDefaultConfiguration();
        return merge({} as Record<string, any>, defaults as Record<string, any>, config as Record<string, any>) as EnhancedPrintConfiguration;
    }

    /**
     * Format validation errors for display
     */
    private formatValidationErrors(errors: ValidationError[]): string[] {
        return errors.map(error => {
            const path = error.path === 'root' ? '' : error.path;
            return path ? `${path}: ${error.message}` : error.message;
        });
    }

    /**
     * Setup JSON schema validation
     */
    private setupValidationSchema(): void {
        const schema = {
            type: 'object',
            properties: {
                $schema: { type: 'string' },
                defaults: { $ref: '#/definitions/EnhancedPrintConfiguration' },
                environments: {
                    type: 'object',
                    additionalProperties: { $ref: '#/definitions/EnhancedPrintConfiguration' }
                },
                presets: {
                    type: 'object',
                    additionalProperties: { $ref: '#/definitions/ConfigurationPreset' }
                }
            },
            definitions: {
                EnhancedPrintConfiguration: {
                    type: 'object',
                    properties: {
                        page: { $ref: '#/definitions/PageConfiguration' },
                        pdf: { $ref: '#/definitions/PDFConfiguration' },
                        image: { $ref: '#/definitions/ImageConfiguration' },
                        viewport: { $ref: '#/definitions/ViewportConfiguration' },
                        wait: { $ref: '#/definitions/WaitConfiguration' },
                        auth: { $ref: '#/definitions/AuthConfiguration' },
                        emulation: { $ref: '#/definitions/EmulationConfiguration' },
                        performance: { $ref: '#/definitions/PerformanceConfiguration' }
                    }
                },
                PageConfiguration: {
                    type: 'object',
                    properties: {
                        format: {
                            oneOf: [
                                {
                                    type: 'string',
                                    enum: ['A4', 'A3', 'A2', 'A1', 'A0', 'Letter', 'Legal', 'Tabloid', 'Ledger']
                                },
                                {
                                    type: 'object',
                                    properties: {
                                        width: { oneOf: [{ type: 'string' }, { type: 'number' }] },
                                        height: { oneOf: [{ type: 'string' }, { type: 'number' }] }
                                    },
                                    required: ['width', 'height']
                                }
                            ]
                        },
                        orientation: {
                            type: 'string',
                            enum: ['portrait', 'landscape']
                        },
                        margins: {
                            oneOf: [
                                { type: 'string' },
                                {
                                    type: 'object',
                                    properties: {
                                        top: { oneOf: [{ type: 'string' }, { type: 'number' }] },
                                        right: { oneOf: [{ type: 'string' }, { type: 'number' }] },
                                        bottom: { oneOf: [{ type: 'string' }, { type: 'number' }] },
                                        left: { oneOf: [{ type: 'string' }, { type: 'number' }] }
                                    },
                                    required: ['top', 'right', 'bottom', 'left']
                                }
                            ]
                        }
                    }
                },
                PDFConfiguration: {
                    type: 'object',
                    properties: {
                        printBackground: { type: 'boolean' },
                        displayHeaderFooter: { type: 'boolean' },
                        headerTemplate: { type: 'string' },
                        footerTemplate: { type: 'string' },
                        preferCSSPageSize: { type: 'boolean' },
                        generateTaggedPDF: { type: 'boolean' },
                        scale: { type: 'number', minimum: 0.1, maximum: 2.0 },
                        omitBackground: { type: 'boolean' },
                        outline: { type: 'boolean' }
                    }
                },
                ImageConfiguration: {
                    type: 'object',
                    properties: {
                        fullPage: { type: 'boolean' },
                        quality: { type: 'number', minimum: 1, maximum: 100 },
                        type: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
                        encoding: { type: 'string', enum: ['base64', 'binary'] },
                        optimizeForSize: { type: 'boolean' }
                    }
                },
                ViewportConfiguration: {
                    type: 'object',
                    properties: {
                        width: { type: 'number', minimum: 1 },
                        height: { type: 'number', minimum: 1 },
                        deviceScaleFactor: { type: 'number', minimum: 0.1, maximum: 3.0 },
                        isMobile: { type: 'boolean' },
                        hasTouch: { type: 'boolean' },
                        isLandscape: { type: 'boolean' }
                    }
                },
                WaitConfiguration: {
                    type: 'object',
                    properties: {
                        until: { type: 'string', enum: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'] },
                        timeout: { type: 'number', minimum: 1000 },
                        selector: { type: 'string' },
                        delay: { type: 'number', minimum: 0 },
                        customFunction: { type: 'string' }
                    }
                },
                AuthConfiguration: {
                    type: 'object',
                    properties: {
                        basic: {
                            type: 'object',
                            properties: {
                                username: { type: 'string' },
                                password: { type: 'string' }
                            },
                            required: ['username', 'password']
                        },
                        headers: {
                            type: 'object',
                            additionalProperties: { type: 'string' }
                        },
                        cookies: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    value: { type: 'string' },
                                    domain: { type: 'string' },
                                    path: { type: 'string' }
                                },
                                required: ['name', 'value']
                            }
                        },
                        userAgent: { type: 'string' }
                    }
                },
                EmulationConfiguration: {
                    type: 'object',
                    properties: {
                        mediaType: { type: 'string', enum: ['screen', 'print'] },
                        colorScheme: { type: 'string', enum: ['light', 'dark', 'no-preference'] },
                        reducedMotion: { type: 'string', enum: ['reduce', 'no-preference'] },
                        timezone: { type: 'string' },
                        locale: { type: 'string' }
                    }
                },
                PerformanceConfiguration: {
                    type: 'object',
                    properties: {
                        blockResources: {
                            type: 'array',
                            items: {
                                type: 'string',
                                enum: ['document', 'stylesheet', 'image', 'media', 'font', 'script', 'texttrack', 'xhr', 'fetch', 'eventsource', 'websocket', 'manifest', 'other']
                            }
                        },
                        maxConcurrent: { type: 'number', minimum: 1 },
                        retryAttempts: { type: 'number', minimum: 0 },
                        cacheEnabled: { type: 'boolean' },
                        javascriptEnabled: { type: 'boolean' },
                        loadTimeout: { type: 'number', minimum: 1000 }
                    }
                },
                ConfigurationPreset: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        extends: { type: 'string' },
                        config: { $ref: '#/definitions/EnhancedPrintConfiguration' }
                    },
                    required: ['name', 'config']
                }
            }
        };

        this.validator.addSchema(schema, 'enhanced-config');
        
        // Add schema for validating configuration objects (not config files)
        const configObjectSchema = {
            $ref: '#/definitions/EnhancedPrintConfiguration',
            definitions: schema.definitions
        };
        this.validator.addSchema(configObjectSchema, 'configuration-object');
    }
}

// Simple merge function to replace lodash-es dependency
function merge(target: Record<string, any>, ...sources: Record<string, unknown>[]): Record<string, unknown> {
    if (!target) target = {};

    for (const source of sources) {
        if (!source) continue;

        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                    target[key] = merge(target[key] || {}, source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
    }

    return target;
}