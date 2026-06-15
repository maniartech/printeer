/**
 * Enhanced Batch Processor
 * Comprehensive batch processing with resource optimization and browser pool integration
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { EnhancedConfigurationManager } from '../config/enhanced-config-manager';
import printeer from '../api';
import type {
  BatchJob,
  BatchOptions,
  BatchResult,
  BatchData,
  BatchReport,
  ResourceMetrics
} from './types/batch.types';
import {
  BatchValidationError
} from './types/batch.types';
import type { EnhancedPrintConfiguration, ValidationResult } from '../config/types/enhanced-config.types';

export class BatchProcessor extends EventEmitter {
  private configManager: EnhancedConfigurationManager;
  private results: Map<string, BatchResult> = new Map();
  private startTime?: Date;
  private activeJobs = 0;
  private maxConcurrency: number;
  private resourceMetrics: ResourceMetrics[] = [];

  constructor(public options: BatchOptions) {
    super();
    this.maxConcurrency = options.concurrency;
    this.configManager = new EnhancedConfigurationManager();
  }

  /**
   * Process batch file (CSV, JSON, or YAML)
   */
  async processBatchFile(
    batchFile: string,
    options: BatchOptions
  ): Promise<BatchReport> {
    try {
      // Set batch mode for browser strategy detection
      process.env.PRINTEER_BATCH_MODE = '1';

      // Load and validate batch file
      const batchData = await this.loadBatchFile(batchFile);
      const validation = await this.validateBatchData(batchData);

      if (!validation.valid) {
        throw new BatchValidationError(
          'Invalid batch file',
          validation.formattedErrors
        );
      }

      // Apply the file-level `defaults` block and `variables` block to each job
      // before processing. (BUG-034/035)
      const jobs = this.applyBatchDefaultsAndVariables(batchData);

      // Process the batch
      return await this.processBatch(jobs, options);
    } catch (error) {
      this.emit('error', error);
      throw error;
    } finally {
      // Clean up batch mode flag
      delete process.env.PRINTEER_BATCH_MODE;
    }
  }

  /**
   * Process batch jobs with intelligent resource management
   */
  async processBatch(
    jobs: BatchJob[],
    options: BatchOptions
  ): Promise<BatchReport> {
    this.startTime = new Date();

    try {
      // Set batch mode for browser strategy detection
      process.env.PRINTEER_BATCH_MODE = '1';

      // Validate and prepare jobs
      const processedJobs = await this.prepareJobs(jobs, options);

      // Execute dry run if requested
      if (options.dryRun) {
        return this.generateDryRunReport(processedJobs, options);
      }

      // Process jobs with resource optimization
      await this.processJobsWithResourceOptimization(processedJobs, options);

      // Generate final report
      return await this.generateBatchReport(options);
    } finally {
      await this.cleanup();
      // Clean up batch mode flag
      delete process.env.PRINTEER_BATCH_MODE;
    }
  }

  /**
   * Process jobs with dynamic resource-aware concurrency
   */
  private async processJobsWithResourceOptimization(
    jobs: BatchJob[],
    options: BatchOptions
  ): Promise<void> {
    const processedJobs = new Set<string>();
    const processingJobs = new Set<string>();
    const jobQueue: BatchJob[] = [];
    // In-flight worker promises, keyed by job id, so we can await them and
    // never leave a dangling (unhandled) rejection. (BUG-006)
    const inFlight = new Map<string, Promise<void>>();
    // First fail-fast error, captured to abort scheduling.
    let abortError: unknown = null;

    // Initialize queue with jobs that have no dependencies, ordered by `priority`
    // (lower number = higher priority; unset runs last). Priority is a hint —
    // dependency edges still gate ordering, and concurrency means several run at
    // once — but it was previously parsed and ignored. (BUG-038)
    jobs.forEach(job => {
      if (!job.dependencies || job.dependencies.length === 0) {
        jobQueue.push(job);
      }
    });
    jobQueue.sort((a, b) => (a.priority ?? Number.POSITIVE_INFINITY) - (b.priority ?? Number.POSITIVE_INFINITY));

    const concurrency = Math.max(1, options.concurrency || this.maxConcurrency);

    while ((jobQueue.length > 0 || inFlight.size > 0) && !abortError) {
      // Fill up to the concurrency limit.
      while (inFlight.size < concurrency && jobQueue.length > 0 && !abortError) {
        const job = jobQueue.shift()!;
        if (processedJobs.has(job.id) || processingJobs.has(job.id) || inFlight.has(job.id)) {
          continue;
        }
        processingJobs.add(job.id);
        const promise = this.processJobWithResourceMonitoring(
          job, options, processedJobs, processingJobs, jobQueue, jobs
        )
          .catch(error => {
            // The worker already records the failed result and emits
            // 'job-failed'. In fail-fast mode we capture the first error here
            // (awaited, so it never becomes an unhandled rejection) and let the
            // outer loop stop scheduling new jobs. (BUG-006)
            if (!options.continueOnError && !abortError) {
              abortError = error;
            }
          })
          .finally(() => {
            inFlight.delete(job.id);
          });
        inFlight.set(job.id, promise);
      }

      // Wait for at least one in-flight job to settle before scheduling more.
      if (inFlight.size > 0) {
        await Promise.race(inFlight.values());
      }
    }

    // Allow any still-running jobs to finish so nothing is left dangling.
    await Promise.allSettled(inFlight.values());

    // Fail-fast: surface the first failure to the caller (→ non-zero exit).
    if (abortError) {
      throw abortError;
    }
  }

  /**
   * Process individual job with resource monitoring
   */
  private async processJobWithResourceMonitoring(
    job: BatchJob,
    options: BatchOptions,
    processedJobs: Set<string>,
    processingJobs: Set<string>,
    jobQueue: BatchJob[],
    allJobs: BatchJob[]
  ): Promise<void> {
    this.activeJobs++;
    const currentJobNumber = processedJobs.size + processingJobs.size;
    const totalJobs = allJobs.length;
    this.emit('job-started', job, { currentJobNumber, totalJobs });

    try {
      const result = await this.executeJob(job, options);
      this.results.set(job.id, result);
      const completedJobNumber = processedJobs.size + 1;
      const totalJobs = allJobs.length;
      this.emit('job-completed', job, result, { completedJobNumber, totalJobs });

      // Queue dependent jobs when this job completes
      allJobs.forEach(candidateJob => {
        if (candidateJob.dependencies?.includes(job.id) &&
            !processedJobs.has(candidateJob.id) &&
            !processingJobs.has(candidateJob.id)) {

          // Check if all dependencies are satisfied
          const allDepsCompleted = candidateJob.dependencies.every(depId =>
            processedJobs.has(depId)
          );

          if (allDepsCompleted) {
            jobQueue.push(candidateJob);
          }
        }
      });

    } catch (error) {
      const failureResult: BatchResult = {
        jobId: job.id,
        status: 'failed',
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        // Retries actually attempted before giving up. (BUG-033)
        retryCount: job.retryCount ?? options.retryAttempts ?? 0
      };

      this.results.set(job.id, failureResult);
      this.emit('job-failed', job, error);

      if (!options.continueOnError) {
        throw error;
      }
    } finally {
      this.activeJobs--;
      processingJobs.delete(job.id);
      processedJobs.add(job.id);
    }
  }

  /**
   * Execute individual job
   */
  private async executeJob(
    job: BatchJob,
    options: BatchOptions
  ): Promise<BatchResult> {
    const startTime = new Date();

    // Apply job configuration
    const config = await this.resolveJobConfiguration(job);

    // Resolve output path with output directory if specified
    const outputPath = this.resolveOutputPath(job.output, options.outputDirectory);
    const jobWithResolvedOutput = { ...job, output: outputPath };

    // Retry a failed conversion up to `--retry` times (per-job override via
    // job.retryCount). attempt 0 is the initial try; result.retryCount records
    // how many *retries* were actually performed. (BUG-033)
    const maxRetries = Math.max(0, job.retryCount ?? options.retryAttempts ?? 0);
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.executeRealConversion(jobWithResolvedOutput, config);
        const endTime = new Date();
        return {
          jobId: job.id,
          status: 'completed',
          startTime,
          endTime,
          duration: endTime.getTime() - startTime.getTime(),
          outputFile: outputPath,
          retryCount: attempt
        };
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          this.emit('job-retry', job, { attempt: attempt + 1, maxRetries });
          // Small linear backoff, capped, so a transient failure can recover.
          await new Promise(resolve => setTimeout(resolve, Math.min(2000, 100 * (attempt + 1))));
        }
      }
    }

    const attempts = maxRetries + 1;
    throw new Error(
      `Job execution failed after ${attempts} attempt${attempts === 1 ? '' : 's'}: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`
    );
  }

  /**
   * Resolve output path with output directory
   */
  private resolveOutputPath(outputPath: string, outputDirectory?: string): string {
    if (!outputDirectory) {
      return outputPath;
    }

    // If output path is absolute, use it as-is
    if (path.isAbsolute(outputPath)) {
      return outputPath;
    }

    // Combine output directory with relative path
    return path.join(outputDirectory, outputPath);
  }

  /**
   * Execute real conversion using printeer API
   */
  private async executeRealConversion(
    job: BatchJob,
    config: EnhancedPrintConfiguration
  ): Promise<void> {
    // Ensure output directory exists
    const outputDir = path.dirname(job.output);
    await fs.mkdir(outputDir, { recursive: true }).catch(() => {
      // Directory might already exist, ignore error
    });

    // Convert enhanced config to legacy format for printeer API
    const legacyConfig = this.convertToLegacyConfig(config);

    // Call the real printeer API
    await printeer(job.url, job.output, null, legacyConfig);
  }

  /**
   * Convert enhanced configuration to legacy format for printeer API
   */
  private convertToLegacyConfig(config: EnhancedPrintConfiguration): any {
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
   * Calculate complexity factor for processing time simulation
   */
  private calculateComplexityFactor(config: EnhancedPrintConfiguration): number {
    let factor = 1;

    // PDF complexity
    if (config.pdf?.displayHeaderFooter) factor += 0.2;
    if (config.pdf?.generateTaggedPDF) factor += 0.3;
    if (config.pdf?.scale && config.pdf.scale < 0.8) factor += 0.1;

    // Image complexity
    if (config.image?.quality && config.image.quality > 90) factor += 0.2;
    if (config.image?.fullPage) factor += 0.1;

    // Wait complexity
    if (config.wait?.timeout && config.wait.timeout > 30000) factor += 0.2;
    if (config.wait?.selector) factor += 0.1;

    return Math.max(0.5, Math.min(2.0, factor));
  }

  /**
   * Resolve job configuration by merging preset, config, and CLI options
   */
  private async resolveJobConfiguration(job: BatchJob): Promise<EnhancedPrintConfiguration> {
    // Load base configuration
    const resolved = await this.configManager.loadConfiguration();
    let config = resolved.config;

    // Apply preset if specified
    if (job.preset) {
      const preset = await this.configManager.getPreset(job.preset);
      config = this.configManager.mergeConfigurations(config, preset);
    }

    // Apply job-specific configuration
    if (job.config) {
      config = this.configManager.mergeConfigurations(config, job.config);
    }

    return config;
  }

  /**
   * Load batch file (CSV, JSON, or YAML)
   */
  private async loadBatchFile(filePath: string): Promise<BatchData> {
    const ext = path.extname(filePath).toLowerCase();
    const content = await fs.readFile(filePath, 'utf-8');

    switch (ext) {
      case '.csv':
        return this.parseCSVBatch(content);
      case '.json':
        return this.normalizeBatchData(JSON.parse(content));
      case '.yaml':
      case '.yml':
        return this.normalizeBatchData(yaml.parse(content));
      default:
        throw new Error(`Unsupported batch file format: ${ext}`);
    }
  }

  /**
   * Accept either the documented bare-array form `[{url, output}, …]` or the
   * wrapped object form `{ jobs: [...], defaults?, variables? }`. The README and
   * docs show the bare array, so a top-level array must be treated as the job
   * list. (BUG-004)
   */
  private normalizeBatchData(parsed: unknown): BatchData {
    if (Array.isArray(parsed)) {
      return { jobs: parsed as BatchJob[] };
    }
    return (parsed || {}) as BatchData;
  }

  /**
   * Apply the file-level `defaults` and `variables` blocks to every job.
   *
   * Precedence (highest wins): per-job value > `defaults` > nothing. For the
   * variable pool used in `{{...}}` / `{...}` substitution the precedence is:
   * per-job `variables` > `defaults.variables` > file-level `variables`.
   * `config` is deep-merged; other fields are job-wins shallow. (BUG-034/035)
   */
  private applyBatchDefaultsAndVariables(batchData: BatchData): BatchJob[] {
    const defaults = (batchData.defaults || {}) as Partial<BatchJob>;
    const fileVariables = batchData.variables || {};

    return (batchData.jobs || []).map(job => {
      const merged: BatchJob = { ...defaults, ...job };
      // Deep-merge config so a default header/footer and a per-job override coexist.
      merged.config = this.deepMerge(defaults.config, job.config);
      // Pool variables from all three levels for substitution.
      merged.variables = {
        ...fileVariables,
        ...(defaults.variables || {}),
        ...(job.variables || {})
      };
      // A job with no variables at all should stay undefined so expansion is skipped.
      if (Object.keys(merged.variables).length === 0) {
        delete merged.variables;
      }
      return merged;
    });
  }

  /** Minimal deep merge for plain config objects (source overrides target). */
  private deepMerge<T>(target: T | undefined, source: T | undefined): T | undefined {
    if (target === undefined) return source;
    if (source === undefined) return target;
    if (
      typeof target !== 'object' || target === null || Array.isArray(target) ||
      typeof source !== 'object' || source === null || Array.isArray(source)
    ) {
      return source;
    }
    const out: Record<string, unknown> = { ...(target as Record<string, unknown>) };
    for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
      out[key] = this.deepMerge(out[key], value);
    }
    return out as T;
  }

  /**
   * Parse CSV batch file
   */
  private parseCSVBatch(content: string): BatchData {
    const lines = content.split('\n').filter(line =>
      line.trim() && !line.startsWith('#')
    );

    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const jobs: BatchJob[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);

      if (values.length !== headers.length) {
        console.warn(`Line ${i + 1}: Column count mismatch, skipping`);
        continue;
      }

      const job: BatchJob = {
        id: this.getCSVValue(headers, values, 'id') || `job-${i}`,
        url: this.getCSVValue(headers, values, 'url') || '',
        output: this.getCSVValue(headers, values, 'output') || this.getCSVValue(headers, values, 'filename') || ''
      };

      // Parse optional fields
      const preset = this.getCSVValue(headers, values, 'preset');
      if (preset) job.preset = preset;

      const variables = this.getCSVValue(headers, values, 'variables');
      if (variables) {
        try {
          job.variables = JSON.parse(variables);
        } catch (e) {
          console.warn(`Line ${i + 1}: Invalid JSON in variables field, ignoring`);
        }
      }

      const priority = this.getCSVValue(headers, values, 'priority');
      if (priority) {
        const priorityNum = parseInt(priority, 10);
        if (!isNaN(priorityNum)) job.priority = priorityNum;
      }

      if (job.url && job.output) {
        jobs.push(job);
      }
    }

    return { jobs };
  }

  /**
   * Parse CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        values.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add final field
    values.push(current.trim());
    return values;
  }

  /**
   * Get value from CSV headers and values arrays
   */
  private getCSVValue(headers: string[], values: string[], field: string): string | undefined {
    const index = headers.indexOf(field);
    return index >= 0 ? values[index] : undefined;
  }

  /**
   * Validate batch data
   */
  private async validateBatchData(batchData: BatchData): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!batchData.jobs || batchData.jobs.length === 0) {
      errors.push('Batch file must contain at least one job');
    }

    // Validate individual jobs and auto-generate IDs if missing
    for (let i = 0; i < (batchData.jobs || []).length; i++) {
      const job = batchData.jobs![i];

      // Auto-generate ID if missing
      if (!job.id) {
        job.id = `job-${i + 1}`;
      }

      if (!job.url) {
        errors.push(`Job ${job.id} missing required field: url`);
      }
      if (!job.output) {
        errors.push(`Job ${job.id} missing required field: output`);
      }

      // Validate URL format — but skip strings that still contain a `{{var}}` /
      // `{var}` template, since those are only resolved after variable
      // substitution (a substituted-but-still-invalid URL is caught at convert
      // time and recorded as a failed job). (BUG-035/037)
      if (job.url && !/\{\{?\s*\w+\s*\}?\}/.test(job.url)) {
        try {
          new URL(job.url);
        } catch {
          errors.push(`Job ${job.id}: Invalid URL format`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.map(msg => ({ path: 'batch', message: msg })),
      formattedErrors: errors
    };
  }

  /**
   * Prepare jobs for processing (expand variables, validate, etc.)
   */
  private async prepareJobs(
    jobs: BatchJob[],
    _options: BatchOptions
  ): Promise<BatchJob[]> {
    const preparedJobs: BatchJob[] = [];

    for (const job of jobs) {
      // Expand jobs with variables
      const expandedJobs = await this.expandJobVariables(job);

      // Validate each expanded job
      for (const expandedJob of expandedJobs) {
        preparedJobs.push(expandedJob);
      }
    }

    return preparedJobs;
  }

  /**
   * Expand job variables (e.g., array variables create multiple jobs)
   */
  private async expandJobVariables(job: BatchJob): Promise<BatchJob[]> {
    if (!job.variables) {
      return [job];
    }

    const expandedJobs: BatchJob[] = [];
    const variableKeys = Object.keys(job.variables);

    // Find array variables for expansion
    const arrayVariables = variableKeys.filter(key =>
      Array.isArray(job.variables![key])
    );

    if (arrayVariables.length === 0) {
      // No array variables, just substitute scalar variables
      return [this.substituteVariables(job, job.variables)];
    }

    // Expand array variables (handle first array variable)
    const arrayVar = arrayVariables[0];
    const arrayValues = job.variables[arrayVar] as any[];

    for (const value of arrayValues) {
      const variableSet = { ...job.variables, [arrayVar]: value };
      const expandedJob = this.substituteVariables(job, variableSet);
      expandedJob.id = `${job.id}-${value}`;
      expandedJobs.push(expandedJob);
    }

    return expandedJobs;
  }

  /**
   * Substitute variables in job properties
   */
  private substituteVariables(
    job: BatchJob,
    variables: Record<string, unknown>
  ): BatchJob {
    const substituted = { ...job };

    // Substitute in URL and output path...
    substituted.url = this.substituteString(job.url, variables);
    substituted.output = this.substituteString(job.output, variables);

    // ...and in any string within the job's config (e.g. a header/footer
    // template that references {{companyName}}). (BUG-035)
    if (job.config) {
      substituted.config = this.substituteDeep(job.config, variables) as BatchJob['config'];
    }

    return substituted;
  }

  /**
   * Substitute variables in a string template. Supports both the documented
   * double-brace `{{name}}` syntax (used by the shipped examples) and the
   * single-brace `{name}` form, for back-compat. (BUG-035)
   */
  private substituteString(template: string, variables: Record<string, unknown>): string {
    if (typeof template !== 'string') return template;
    const sub = (key: string, match: string): string => {
      const v = variables[key];
      return v !== undefined && v !== null ? String(v) : match;
    };
    return template
      .replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => sub(k, m))
      .replace(/\{(\w+)\}/g, (m, k) => sub(k, m));
  }

  /** Recursively substitute variables in every string within a value. */
  private substituteDeep(value: unknown, variables: Record<string, unknown>): unknown {
    if (typeof value === 'string') return this.substituteString(value, variables);
    if (Array.isArray(value)) return value.map(v => this.substituteDeep(v, variables));
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = this.substituteDeep(v, variables);
      }
      return out;
    }
    return value;
  }

  /**
   * Build dependency graph for job scheduling
   */
  private buildDependencyGraph(jobs: BatchJob[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const job of jobs) {
      graph.set(job.id, job.dependencies || []);
    }

    return graph;
  }

  /**
   * Generate dry run report
   */
  private generateDryRunReport(
    jobs: BatchJob[],
    _options: BatchOptions
  ): BatchReport {
    const results: BatchResult[] = jobs.map(job => ({
      jobId: job.id,
      status: 'completed' as const,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      outputFile: job.output,
      retryCount: 0
    }));

    return {
      totalJobs: jobs.length,
      successfulJobs: jobs.length,
      failedJobs: 0,
      skippedJobs: 0,
      totalDuration: 0,
      startTime: new Date(),
      endTime: new Date(),
      results
    };
  }

  /**
   * Generate comprehensive batch report
   */
  private async generateBatchReport(_options: BatchOptions): Promise<BatchReport> {
    const results = Array.from(this.results.values());
    const totalJobs = results.length;
    const successfulJobs = results.filter(r => r.status === 'completed').length;
    const failedJobs = results.filter(r => r.status === 'failed').length;
    const skippedJobs = results.filter(r => r.status === 'skipped').length;

    const totalDuration = this.startTime
      ? new Date().getTime() - this.startTime.getTime()
      : 0;

    const report: BatchReport = {
      totalJobs,
      successfulJobs,
      failedJobs,
      skippedJobs,
      totalDuration,
      startTime: this.startTime || new Date(),
      endTime: new Date(),
      results,
      jobs: results // Add jobs property for backward compatibility
    } as BatchReport;

    return report;
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    // Reset state first
    this.results.clear();
    this.activeJobs = 0;
    this.resourceMetrics = [];

    // Note: Browser cleanup is handled by the API layer's browser manager
    // Each individual job properly releases browsers back to the pool
    // The global browser manager handles final cleanup on process exit
  }
}