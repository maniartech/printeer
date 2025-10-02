/**
 * Enhanced CLI Implementation
 * Comprehensive CLI system with flexible URL-output pairing and configuration management
 */

import { Command } from 'commander';
import { EnhancedConfigurationManager, ConfigurationError } from '../config/enhanced-config-manager';
import { BatchProcessor } from '../batch/batch-processor';
import { TemplateManager } from '../templates/template-manager';
import { ConfigurationConverter, buildConfigFromCliOptions } from './config-mapping';
import printeer from '../api';
import {
  determineOutputFilename,
  handleOutputConflicts,
  createUrlOutputPairs,
  detectOutputExtension,
  sanitizeFilename
} from './filename-utils';
import type { UrlOutputPair, CliOptions, ConversionResult } from './types/cli.types';
import type { BatchJob, BatchOptions } from '../batch/types/batch.types';
import type { EnhancedPrintConfiguration } from '../config/types/enhanced-config.types';
import { SkipFileError } from './types/cli.types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';

const program = new Command();

// Get package version
function getVersion(): string {
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageContent = require('fs').readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    return packageJson.version;
  } catch {
    return '1.0.0';
  }
}

// Setup enhanced CLI program
program
  .name('printeer')
  .description('🎯 Enhanced Web-to-PDF/PNG conversion utility with comprehensive configuration, batch processing, and template management')
  .version(getVersion(), '-v, --version', 'Display version number');

// Utility function to collect multiple option values
function collect(value: string, previous: string[] = []): string[] {
  return previous.concat([value]);
}

// Enhanced convert command with flexible URL-output pairing
program
  .command('convert')
  .alias('c')
  .description('Convert web page(s) to PDF/PNG with flexible URL-output pairing')
  .option('-u, --url <url>', 'URL to convert (can be used multiple times)', collect, [])
  .option('-o, --output <filename>', 'Output filename for preceding --url (optional)', collect, [])
  .option('--output-dir <dir>', 'Output directory for generated filenames')
  .option('--output-pattern <pattern>', 'Filename pattern for auto-generated names (e.g., "{title}.pdf", "{domain}_{timestamp}.png")')
  .option('--output-conflict <strategy>', 'Conflict resolution: "override", "copy", "skip", "prompt"', 'copy')
  .option('--title-fallback', 'Use webpage title for filename when --output not specified (default behavior)')
  .option('--url-fallback', 'Use URL-based algorithm when title unavailable')
  .option('-c, --config <path>', 'Configuration file path')
  .option('-p, --preset <name>', 'Use configuration preset')
  .option('-e, --env <environment>', 'Environment (development, production)')

  // Page options
  .option('-f, --format <format>', 'Page format (A4, A3, Letter, Legal, custom)')
  .option('--orientation <type>', 'Page orientation (portrait/landscape)')
  .option('--margins <margins>', 'Page margins (e.g., "1in" or "top:1in,right:0.5in")')
  .option('--custom-size <size>', 'Custom page size (e.g., "210mm,297mm")')

  // Viewport options
  .option('--viewport <size>', 'Viewport size (e.g., "1920x1080")')
  .option('--device-scale <factor>', 'Device scale factor (0.1-3.0)', parseFloat)
  .option('--mobile', 'Emulate mobile device')
  .option('--landscape-viewport', 'Use landscape viewport')

  // Wait conditions
  .option('--wait-until <condition>', 'Wait condition (load, domcontentloaded, networkidle0, networkidle2)')
  .option('--wait-timeout <ms>', 'Wait timeout in milliseconds', parseInt)
  .option('--wait-selector <selector>', 'Wait for CSS selector to appear')
  .option('--wait-delay <ms>', 'Additional delay in milliseconds', parseInt)
  .option('--wait-function <js>', 'Custom JavaScript function to wait for')

  // Media and emulation
  .option('--media-type <type>', 'Emulate media type (screen/print)')
  .option('--color-scheme <scheme>', 'Color scheme (light/dark/no-preference)')
  .option('--timezone <tz>', 'Timezone (e.g., "America/New_York")')
  .option('--locale <locale>', 'Locale (e.g., "en-US")')
  .option('--user-agent <ua>', 'Custom user agent string')

  // PDF specific options
  .option('--scale <factor>', 'Scale factor (0.1-2.0)', parseFloat)
  .option('--print-background', 'Print background graphics')
  .option('--no-print-background', 'Don\'t print background graphics')
  .option('--header-template <template>', 'Header template name or file path')
  .option('--footer-template <template>', 'Footer template name or file path')
  .option('--header-footer', 'Display header and footer')
  .option('--prefer-css-page-size', 'Prefer CSS page size')
  .option('--tagged-pdf', 'Generate tagged PDF (accessibility)')
  .option('--pdf-outline', 'Generate PDF outline/bookmarks')

  // Image specific options
  .option('--quality <number>', 'Image quality (1-100, JPEG/WebP only)', parseInt)
  .option('--image-type <type>', 'Image type (png/jpeg/webp)')
  .option('--full-page', 'Capture full page')
  .option('--clip <region>', 'Clip region (x,y,width,height)')
  .option('--optimize-size', 'Optimize image file size')

  // Authentication
  .option('--auth <credentials>', 'Basic auth (username:password)')
  .option('--headers <json>', 'Custom headers (JSON string)')
  .option('--cookies <json>', 'Custom cookies (JSON string)')

  // Performance
  .option('--block-resources <types>', 'Block resource types (image,stylesheet,font,script)')
  .option('--disable-javascript', 'Disable JavaScript execution')
  .option('--cache', 'Enable caching')
  .option('--no-cache', 'Disable caching')
  .option('--load-timeout <ms>', 'Page load timeout', parseInt)
  .option('--retry <attempts>', 'Retry attempts on failure', parseInt)

  // Processing options
  .option('--concurrency <num>', 'Concurrent processes for multiple URLs', parseInt)
  .option('--continue-on-error', 'Continue processing on individual failures')
  .option('--max-memory <amount>', 'Maximum memory usage (e.g., "2GB")')
  .option('--cleanup', 'Cleanup temporary files after processing')

  // Output options
  .option('-q, --quiet', 'Suppress output')
  .option('--verbose', 'Verbose output')
  .option('--dry-run', 'Validate configuration without converting')
  .option('--output-metadata', 'Include metadata in output')

  .action(async (options) => {
    try {
      // Validate URL-output pairing
      if (!options.url || options.url.length === 0) {
        throw new Error('At least one --url must be specified');
      }

      // Ensure output array doesn't exceed url array
      if (options.output && options.output.length > options.url.length) {
        throw new Error('Number of --output options cannot exceed number of --url options');
      }

      await runEnhancedConvertWithPairing(options);
    } catch (error) {
      console.error('Conversion failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Batch processing command
program
  .command('batch')
  .alias('b')
  .description('Batch processing of multiple URLs from file')
  .argument('<batchFile>', 'Batch file (CSV, JSON, or YAML)')
  .option('-o, --output-dir <dir>', 'Output directory', './output')
  .option('-c, --concurrency <num>', 'Concurrent processes', '3')
  .option('--max-memory <amount>', 'Maximum memory usage (e.g., "2GB")')
  .option('--continue-on-error', 'Continue processing on individual failures')
  .option('--report <format>', 'Report format (json, csv, html)', 'json')
  .option('--report-file <path>', 'Report output file')
  .option('--retry <attempts>', 'Retry attempts for failed jobs', '2')
  .option('--progress', 'Show progress bar')
  .option('--dry-run', 'Validate batch file without processing')
  .option('--cleanup', 'Cleanup temporary files after processing')
  .option('-q, --quiet', 'Suppress output except errors')
  .option('--verbose', 'Verbose output')
  .action(async (batchFile, options) => {
    try {
      await runBatchProcess(batchFile, options);
    } catch (error) {
      console.error('Batch processing failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Configuration management commands
const configCmd = program
  .command('config')
  .description('Configuration management');

configCmd
  .command('init')
  .description('Initialize configuration file')
  .option('-t, --template <name>', 'Configuration template (basic, advanced, professional)')
  .option('-f, --format <format>', 'Configuration format (json, yaml)', 'json')
  .option('--output <path>', 'Output file path')
  .option('--overwrite', 'Overwrite existing configuration')
  .action(async (options) => {
    await initializeConfig(options);
  });

configCmd
  .command('validate')
  .description('Validate configuration file')
  .argument('[configFile]', 'Configuration file to validate')
  .option('--env <environment>', 'Environment to validate')
  .option('--preset <name>', 'Preset to validate')
  .option('--verbose', 'Detailed validation output')
  .action(async (configFile, options) => {
    await validateConfig(configFile, options);
  });

configCmd
  .command('presets')
  .description('List available presets')
  .option('--built-in', 'Show built-in presets only')
  .option('--custom', 'Show custom presets only')
  .option('--config <path>', 'Configuration file to read presets from')
  .action(async (options) => {
    await listPresets(options);
  });

configCmd
  .command('show')
  .description('Show resolved configuration')
  .option('-c, --config <path>', 'Configuration file path')
  .option('-p, --preset <name>', 'Preset to show')
  .option('-e, --env <environment>', 'Environment')
  .option('--format <format>', 'Output format (json, yaml)', 'json')
  .action(async (options) => {
    await showConfiguration(options);
  });

configCmd
  .command('export-from-cli')
  .description('Export CLI command as JSON/YAML configuration')
  .argument('<cliCommand>', 'CLI command to export (in quotes)')
  .option('-o, --output <file>', 'Output configuration file')
  .option('-f, --format <format>', 'Output format (json, yaml)', 'json')
  .option('--pretty', 'Pretty-print the output')
  .action(async (cliCommand, options) => {
    await exportCliToConfig(cliCommand, options);
  });

configCmd
  .command('generate-cli')
  .description('Generate CLI command from JSON/YAML configuration')
  .argument('<configFile>', 'Configuration file path')
  .option('--url <url>', 'URL to include in generated command')
  .option('--output <file>', 'Output file to include in generated command')
  .option('--save <file>', 'Save generated command to file')
  .option('--copy', 'Copy generated command to clipboard')
  .action(async (configFile, options) => {
    await generateCliFromConfig(configFile, options);
  });

// Template management commands
const templateCmd = program
  .command('template')
  .alias('tpl')
  .description('Template management');

templateCmd
  .command('list')
  .description('List available templates')
  .option('--built-in', 'Show built-in templates only')
  .option('--custom', 'Show custom templates only')
  .action(async (options) => {
    await listTemplates(options);
  });

templateCmd
  .command('show')
  .description('Show template content')
  .argument('<name>', 'Template name')
  .option('--variables <json>', 'Variables for rendering (JSON string)')
  .option('--preview', 'Show rendered preview')
  .action(async (name, options) => {
    await showTemplate(name, options);
  });

templateCmd
  .command('preview')
  .description('Preview template with variables')
  .argument('<name>', 'Template name')
  .option('--variables <json>', 'Variables for rendering (JSON string)')
  .action(async (name, options) => {
    await previewTemplate(name, options);
  });

// Add cleanup command for server maintenance
import('./cleanup-command').then(m => {
  program.addCommand(m.default());
}).catch(error => {
  console.warn('Failed to load cleanup command:', error.message);
});

// Export the program for testing
export { program };

// ============================================================================
// IMPLEMENTATION FUNCTIONS
// ============================================================================

/**
 * Main enhanced convert function with URL-output pairing
 */
async function runEnhancedConvertWithPairing(options: CliOptions): Promise<void> {
  const configManager = new EnhancedConfigurationManager();
  const urls = options.url || [];
  const outputs = options.output || [];

  // Create URL-output pairs
  const urlOutputPairs = await createUrlOutputPairs(urls, outputs, options);

  if (urlOutputPairs.length === 1) {
    // Single URL conversion
    return await runSingleUrlConversion(urlOutputPairs[0], options, configManager);
  } else {
    // Multiple URL batch processing
    return await runMultiUrlConversion(urlOutputPairs, options, configManager);
  }
}

/**
 * Process single URL conversion
 */
async function runSingleUrlConversion(
  pair: UrlOutputPair,
  options: CliOptions,
  configManager: EnhancedConfigurationManager
): Promise<void> {
  // Load and prepare configuration
  const config = await loadAndPrepareConfig(options, configManager);

  // Determine final output filename
  const outputFilename = await determineOutputFilename(pair, options);

  // Handle conflicts
  const finalOutput = await handleOutputConflicts(outputFilename, options);

  // Dry run check
  if (options.dryRun) {
    console.log('Configuration validation successful');
    console.log(`Would convert: ${pair.url} -> ${finalOutput}`);
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  // Execute conversion with real printeer API
  const result = await executeRealConversion(pair.url, finalOutput, config);

  if (!options.quiet) {
    console.log(`✓ Conversion complete: ${result.outputFile}`);
    if (options.outputMetadata && result.metadata) {
      console.log('Metadata:', JSON.stringify(result.metadata, null, 2));
    }
  }
}

/**
 * Process multiple URL conversion using batch processor
 */
async function runMultiUrlConversion(
  pairs: UrlOutputPair[],
  options: CliOptions,
  configManager: EnhancedConfigurationManager
): Promise<void> {
  // Set batch mode for browser strategy detection
  process.env.PRINTEER_BATCH_MODE = '1';

  try {
    // Create batch jobs from URL-output pairs
    const batchJobs = await createBatchJobsFromPairs(pairs, options, configManager);

    // Use the batch processor for multiple URLs
    const batchProcessor = new BatchProcessor({
      concurrency: options.concurrency || Math.min(3, pairs.length),
      retryAttempts: options.retry || 2,
      continueOnError: options.continueOnError || true,
      outputDirectory: options.outputDir || process.cwd(),
      reportFormat: 'json',
      progressTracking: !options.quiet,
      dryRun: options.dryRun || false,
      cleanup: options.cleanup !== false
    });

    // Set up progress tracking
    if (!options.quiet) {
      batchProcessor.on('job-completed', (job, result) => {
        console.log(`✓ Completed: ${job.url} -> ${result.outputFile} (${result.duration}ms)`);
      });

      batchProcessor.on('job-failed', (job, error) => {
        console.error(`✗ Failed: ${job.url} - ${error.message}`);
      });
    }

    const report = await batchProcessor.processBatch(batchJobs, batchProcessor.options);

    if (!options.quiet) {
      console.log(`\nMulti-URL conversion complete:`);
      console.log(`  Total URLs: ${report.totalJobs}`);
      console.log(`  Successful: ${report.successfulJobs}`);
      console.log(`  Failed: ${report.failedJobs}`);
      console.log(`  Duration: ${report.totalDuration}ms`);
    }
  } catch (error) {
    throw new Error(`Multi-URL conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Clean up batch mode flag
    delete process.env.PRINTEER_BATCH_MODE;
  }
}

/**
 * Create batch jobs from URL-output pairs
 */
async function createBatchJobsFromPairs(
  pairs: UrlOutputPair[],
  options: CliOptions,
  configManager: EnhancedConfigurationManager
): Promise<BatchJob[]> {
  const jobs: BatchJob[] = [];
  const existingFilenames = new Set<string>();

  for (const pair of pairs) {
    try {
      // Determine output filename
      const outputFilename = await determineOutputFilename(pair, options);

      // Handle conflicts
      const finalOutput = await handleOutputConflicts(outputFilename, options, existingFilenames);

      // Track filename to prevent batch-level conflicts
      existingFilenames.add(path.basename(finalOutput));

      const job: BatchJob = {
        id: `url-${pair.index + 1}`,
        url: pair.url,
        output: finalOutput,
        metadata: {
          index: pair.index + 1,
          totalUrls: pairs.length,
          originalUrl: pair.url,
          explicitOutput: !!pair.output,
          generatedFilename: path.basename(finalOutput)
        }
      };

      // Apply preset if specified
      if (options.preset) {
        job.preset = options.preset;
      }

      // Apply job-specific configuration
      if (needsJobSpecificConfig(options)) {
        job.config = await buildConfigFromCliOptions(options, configManager);
      }

      jobs.push(job);

    } catch (error) {
      if (error instanceof SkipFileError) {
        if (!options.quiet) {
          console.log(`⏭️  Skipping URL due to existing file: ${pair.url}`);
        }
        continue; // Skip this URL
      } else {
        throw error;
      }
    }
  }

  if (jobs.length === 0) {
    throw new Error('No URLs to process - all were skipped due to existing files');
  }

  return jobs;
}

/**
 * Load and prepare configuration from various sources
 */
async function loadAndPrepareConfig(
  options: CliOptions,
  configManager: EnhancedConfigurationManager
): Promise<EnhancedPrintConfiguration> {
  // Load base configuration
  const resolved = await configManager.loadConfiguration(options.config, options.env);
  let config = resolved.config;

  // Apply preset if specified
  if (options.preset) {
    const preset = await configManager.getPreset(options.preset);
    config = configManager.mergeConfigurations(config, preset);
  }

  // Apply CLI options to configuration
  const cliConfig = await buildConfigFromCliOptions(options, configManager);
  config = configManager.mergeConfigurations(config, cliConfig);

  // Validate final configuration
  const validation = configManager.validateConfiguration(config);
  if (!validation.valid) {
    throw new Error(`Invalid configuration: ${validation.formattedErrors.join(', ')}`);
  }

  return config;
}

/**
 * Check if CLI options require job-specific configuration
 */
function needsJobSpecificConfig(options: CliOptions): boolean {
  return !!(
    options.viewport || options.margins || options.scale ||
    options.quality || options.mediaType || options.colorScheme ||
    options.waitUntil || options.waitTimeout || options.printBackground
  );
}

/**
 * Simulate conversion process (placeholder for actual implementation)
 */
async function executeRealConversion(
  url: string,
  output: string,
  config: EnhancedPrintConfiguration
): Promise<ConversionResult> {
  const startTime = Date.now();

  try {
    // Convert enhanced config to simple config for legacy API
    const legacyConfig = convertToLegacyConfig(config);

    // Call the real printeer API
    const result = await printeer(url, output, null, legacyConfig);

    const duration = Date.now() - startTime;

    return {
      outputFile: result,
      success: true,
      duration,
      metadata: {
        pageCount: 1, // TODO: Extract from actual PDF
        fileSize: 0,  // TODO: Get actual file size
        dimensions: { width: 595, height: 842 }, // TODO: Get from config
        loadTime: duration
      }
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    throw new Error(`Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert enhanced configuration to legacy format for printeer API
 */
function convertToLegacyConfig(config: EnhancedPrintConfiguration): any {
  return {
    format: config.page?.format || 'A4',
    orientation: config.page?.orientation || 'portrait',
    margin: config.page?.margins,
    scale: config.pdf?.scale,
    quality: config.image?.quality,
    printBackground: config.pdf?.printBackground,
    viewport: config.viewport,
    waitUntil: config.wait?.until,
    waitTimeout: config.wait?.timeout,
    headers: config.auth?.headers,
    cookies: config.auth?.cookies
  };
}

/**
 * Run batch processing from file
 */
async function runBatchProcess(batchFile: string, options: any): Promise<void> {
  const batchProcessor = new BatchProcessor({
    concurrency: parseInt(options.concurrency, 10),
    retryAttempts: parseInt(options.retry, 10),
    continueOnError: options.continueOnError,
    outputDirectory: options.outputDir,
    reportFormat: options.report,
    progressTracking: options.progress,
    dryRun: options.dryRun,
    cleanup: options.cleanup
  });

  // Set up event listeners for progress tracking
  if (options.progress && !options.quiet) {
    batchProcessor.on('job-started', (job, progress) => {
      console.log(`Starting: ${job.id}`);
      if (progress) {
        console.log(`Processing job ${progress.currentJobNumber}/${progress.totalJobs}`);
      }
    });

    batchProcessor.on('job-completed', (job, result, progress) => {
      console.log(`✓ Completed: ${job.id} (${result.duration}ms)`);
    });

    batchProcessor.on('job-failed', (job, error) => {
      console.error(`✗ Failed: ${job.id} - ${error.message}`);
    });
  }

  const report = await batchProcessor.processBatchFile(batchFile, batchProcessor.options);

  // Output report
  if (options.reportFile) {
    await fs.writeFile(options.reportFile, JSON.stringify(report, null, 2));
  }

  if (!options.quiet) {
    console.log(`\nBatch processing complete:`);
    console.log(`  Total jobs: ${report.totalJobs}`);
    console.log(`  Successful: ${report.successfulJobs}`);
    console.log(`  Failed: ${report.failedJobs}`);
    console.log(`  Duration: ${report.totalDuration}ms`);

    // Also output in the format expected by tests
    if (report.totalJobs > 1) {
      console.log(`\n${report.successfulJobs}/${report.totalJobs} jobs completed successfully`);
    }
  }
}

/**
 * Initialize configuration file
 */
async function initializeConfig(options: any): Promise<void> {
  const configManager = new EnhancedConfigurationManager();
  const template = options.template || 'basic';
  const format = options.format || 'json';
  const outputPath = options.output || `printeer.config.${format}`;

  // Check if file exists and overwrite option
  try {
    await fs.access(outputPath);
    if (!options.overwrite) {
      throw new Error(`Configuration file already exists: ${outputPath}. Use --overwrite to replace.`);
    }
  } catch (error) {
    // File doesn't exist, which is fine
  }

  // Generate configuration based on template
  const config = await generateConfigurationTemplate(template);

  // Write configuration file
  if (format === 'yaml') {
    await fs.writeFile(outputPath, yaml.stringify(config));
  } else {
    await fs.writeFile(outputPath, JSON.stringify(config, null, 2));
  }

  console.log(`✓ Configuration file created: ${outputPath}`);
}

/**
 * Generate configuration template
 */
async function generateConfigurationTemplate(template: string): Promise<any> {
  const configManager = new EnhancedConfigurationManager();

  switch (template) {
    case 'basic':
      return {
        $schema: './node_modules/printeer/schemas/config.schema.json',
        defaults: configManager.getBuiltInPresets()['web-article']
      };

    case 'advanced':
      return {
        $schema: './node_modules/printeer/schemas/config.schema.json',
        defaults: configManager.getBuiltInPresets()['web-article'],
        environments: {
          development: configManager.getBuiltInPresets()['fast-batch'],
          production: configManager.getBuiltInPresets()['high-quality']
        },
        presets: {
          'custom-preset': configManager.getBuiltInPresets()['print-optimized']
        }
      };

    default:
      return {
        $schema: './node_modules/printeer/schemas/config.schema.json',
        defaults: configManager.getBuiltInPresets()['web-article']
      };
  }
}

/**
 * Validate configuration file
 */
async function validateConfig(configFile: string | undefined, options: any): Promise<void> {
  const configManager = new EnhancedConfigurationManager();

  try {
    const resolved = await configManager.loadConfiguration(configFile, options.env);

    if (options.preset) {
      const preset = await configManager.getPreset(options.preset);
      console.log('Preset validation successful');
    }

    // Validate the configuration file if provided
    if (configFile) {
      const fileContent = JSON.parse(await fs.readFile(configFile, 'utf8'));
      const fileValidation = configManager.validateConfiguration(fileContent);

      if (!fileValidation.valid) {
        console.error('✗ Configuration file validation failed:');
        fileValidation.formattedErrors.forEach(error => {
          console.error(`  - ${error}`);
        });
        process.exit(1);
      }
    }

    console.log('✓ Configuration is valid');

    if (options.verbose) {
      console.log('\nResolved configuration:');
      console.log(JSON.stringify(resolved.config, null, 2));
    }

  } catch (error) {
    console.error('✗ Configuration validation failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * List available presets
 */
async function listPresets(options: any): Promise<void> {
  const configManager = new EnhancedConfigurationManager();

  try {
    if (options.config) {
      await configManager.loadConfiguration(options.config);
    }

    const presets = await configManager.getAvailablePresets();

    console.log('Available presets:');
    for (const [name, preset] of Object.entries(presets)) {
      const isBuiltIn = configManager.getBuiltInPresets()[name] !== undefined;
      const type = isBuiltIn ? '[built-in]' : '[custom]';

      if (options.builtIn && !isBuiltIn) continue;
      if (options.custom && isBuiltIn) continue;

      console.log(`  ${name} ${type}`);
      if (preset.description) {
        console.log(`    ${preset.description}`);
      }
    }
  } catch (error) {
    console.error('✗ Failed to list presets:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Show resolved configuration
 */
async function showConfiguration(options: any): Promise<void> {
  const configManager = new EnhancedConfigurationManager();

  try {
    const resolved = await configManager.loadConfiguration(options.config, options.env);
    let config = resolved.config;

    // Apply preset if specified
    if (options.preset) {
      const preset = await configManager.getPreset(options.preset);
      config = configManager.mergeConfigurations(config, preset);
    }

    // Format output
    const outputFormat = options.format.toLowerCase();
    let output: string;

    if (outputFormat === 'yaml') {
      output = yaml.stringify(config);
    } else {
      output = JSON.stringify(config, null, 2);
    }

    console.log('Resolved configuration:');
    console.log(output);

    // Show configuration source information
    console.log('\nConfiguration sources:');
    resolved.sources.forEach(source => {
      switch (source.type) {
        case 'file':
          console.log(`  • Config file: ${source.path}`);
          break;
        case 'environment':
          console.log(`  • Environment: ${source.name}`);
          break;
        case 'preset':
          console.log(`  • Preset: ${source.name}`);
          break;
        case 'default':
          console.log(`  • Built-in defaults`);
          break;
      }
    });

  } catch (error) {
    console.error('✗ Failed to show configuration:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Export CLI command to configuration
 */
async function exportCliToConfig(cliCommand: string, options: any): Promise<void> {
  try {
    const configManager = new EnhancedConfigurationManager();
    const converter = new ConfigurationConverter(configManager);

    // Parse CLI command to extract options
    const cliArgs = cliCommand.split(' ').slice(2); // Remove 'printeer convert'
    const parsedOptions = parseCliArgs(cliArgs);

    // Convert CLI options to configuration
    const config = await converter.exportCliToJson(parsedOptions);

    // Format output
    const outputFormat = options.format.toLowerCase();
    let output: string;

    if (outputFormat === 'yaml') {
      output = yaml.stringify(config);
    } else {
      output = options.pretty
        ? JSON.stringify(config, null, 2)
        : JSON.stringify(config);
    }

    // Save or display
    if (options.output) {
      await fs.writeFile(options.output, output, 'utf8');
      console.log(`✓ Configuration exported to: ${options.output}`);
    } else {
      console.log(output);
    }

  } catch (error) {
    console.error('✗ Failed to export CLI to configuration:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Generate CLI command from configuration
 */
async function generateCliFromConfig(configFile: string, options: any): Promise<void> {
  try {
    const configManager = new EnhancedConfigurationManager();
    const converter = new ConfigurationConverter(configManager);

    // Load configuration file
    const configContent = await fs.readFile(configFile, 'utf8');
    const config = configFile.endsWith('.yaml') || configFile.endsWith('.yml')
      ? yaml.parse(configContent)
      : JSON.parse(configContent);

    // Generate CLI command
    const cliCommand = converter.generateCliCommandFromJson(config, options.url, options.output);

    // Save or display
    if (options.save) {
      await fs.writeFile(options.save, cliCommand, 'utf8');
      console.log(`✓ CLI command saved to: ${options.save}`);
    }

    console.log('\nGenerated CLI command:');
    console.log(cliCommand);

  } catch (error) {
    console.error('✗ Failed to generate CLI from configuration:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * List available templates
 */
async function listTemplates(options: any): Promise<void> {
  const templateManager = new TemplateManager();

  try {
    const templates = templateManager.getAvailableTemplates();
    const builtInTemplates = templateManager.getBuiltInTemplates();

    console.log('Available templates:');
    for (const name of templates) {
      const isBuiltIn = builtInTemplates[name] !== undefined;
      const type = isBuiltIn ? '[built-in]' : '[custom]';

      if (options.builtIn && !isBuiltIn) continue;
      if (options.custom && isBuiltIn) continue;

      console.log(`  ${name} ${type}`);

      const info = templateManager.getTemplateInfo(name);
      if (info && 'description' in info && info.description) {
        console.log(`    ${info.description}`);
      }
    }
  } catch (error) {
    console.error('✗ Failed to list templates:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Show template content
 */
async function showTemplate(name: string, options: unknown): Promise<void> {
  const templateManager = new TemplateManager();

  try {
    const template = templateManager.getTemplateInfo(name);
    if (!template) {
      console.error(`✗ Template '${name}' not found`);
      process.exit(1);
    }

    console.log(`Template: ${name}`);
    console.log(`Type: ${template.type}`);
    if ('description' in template && template.description) {
      console.log(`Description: ${template.description}`);
    }
    console.log(`Variables: ${template.variables.join(', ')}`);
    console.log('\nContent:');
    console.log(template.content);

    if (options.preview && options.variables) {
      const variables = JSON.parse(options.variables);
      const rendered = templateManager.renderTemplate(name, variables);
      console.log('\nRendered preview:');
      console.log(rendered);
    }

  } catch (error) {
    console.error('✗ Failed to show template:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Preview template with variables
 */
async function previewTemplate(name: string, options: unknown): Promise<void> {
  const templateManager = new TemplateManager();

  try {
    const template = templateManager.getTemplateInfo(name);
    if (!template) {
      console.error(`✗ Template '${name}' not found`);
      process.exit(1);
    }

    let variables = {};
    if (options.variables) {
      try {
        // Handle file references (starting with @)
        if (options.variables.startsWith('@')) {
          const filePath = options.variables.slice(1);
          const fileContent = await fs.readFile(filePath, 'utf8');
          variables = JSON.parse(fileContent);
        } else {
          // Try to parse as JSON, with fallback for common shell escaping issues
          let jsonStr = options.variables;

          // Handle common shell escaping issues
          if (jsonStr.includes('\\"')) {
            jsonStr = jsonStr.replace(/\\"/g, '"');
          }

          // If it looks like it might be a simple key-value, try to fix it
          if (!jsonStr.startsWith('{') && jsonStr.includes(':')) {
            jsonStr = `{${jsonStr}}`;
          }

          variables = JSON.parse(jsonStr);
        }
      } catch (error) {
        // Provide helpful error message
        console.error('✗ Invalid JSON in variables option');
        console.error('  Use: --variables \'{"key":"value"}\' or --variables @file.json');
        process.exit(1);
      }
    }

    const rendered = templateManager.renderTemplate(name, variables);
    console.log(rendered);

  } catch (error) {
    console.error('✗ Failed to preview template:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Parse CLI arguments into options object
 */
function parseCliArgs(args: string[]): CliOptions {
  const options: unknown = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      const nextArg = args[i + 1];

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