import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Executes Printeer CLI commands and captures results
 */
export class CLIExecutor {
  constructor(config = {}) {
    this.config = {
      timeout: 30000,
      retries: 2,
      printeerCommand: 'printeer',
      ...config
    };
  }

  async executeCommand(args, options = {}) {
    const startTime = Date.now();
    const mergedOptions = { ...this.config, ...options };

    let lastError;
    for (let attempt = 0; attempt <= mergedOptions.retries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retry attempt ${attempt}/${mergedOptions.retries}`);
        }

        const result = await this.runSingleCommand(args, mergedOptions);
        result.duration = Date.now() - startTime;
        result.attempts = attempt + 1;
        return result;
      } catch (error) {
        lastError = error;
        if (attempt < mergedOptions.retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    // All retries failed
    return {
      exitCode: 1,
      stdout: '',
      stderr: lastError.message,
      duration: Date.now() - startTime,
      attempts: mergedOptions.retries + 1,
      success: false
    };
  }

  async runSingleCommand(args, options) {
    return new Promise((resolve, reject) => {
      const child = spawn(args[0], args.slice(1), {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: options.timeout
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeoutId = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`Command timed out after ${options.timeout}ms`));
      }, options.timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          exitCode: code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          success: code === 0
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  async validateOutput(outputPath, expectedType = 'pdf') {
    if (!fs.existsSync(outputPath)) {
      return {
        exists: false,
        size: 0,
        valid: false,
        type: null
      };
    }

    const stats = fs.statSync(outputPath);
    const size = stats.size;

    // Basic validation based on file size and extension
    const ext = path.extname(outputPath).toLowerCase();
    const expectedExt = expectedType.toLowerCase();

    let valid = false;
    if (expectedExt === 'pdf' && ext === '.pdf' && size > 1000) {
      // PDF should be at least 1KB
      valid = true;
    } else if ((expectedExt === 'png' || expectedExt === 'jpg' || expectedExt === 'jpeg') &&
               (ext === '.png' || ext === '.jpg' || ext === '.jpeg') && size > 500) {
      // Images should be at least 500 bytes
      valid = true;
    }

    return {
      exists: true,
      size,
      valid,
      type: ext.slice(1)
    };
  }
}

/**
 * Builds Printeer CLI commands dynamically
 */
export class PrinteerCommandBuilder {
  constructor(baseUrl = 'http://localhost:4000') {
    this.baseUrl = baseUrl;
    this.params = {};
  }

  url(endpoint) {
    this.params.url = `${this.baseUrl}${endpoint}`;
    return this;
  }

  output(filePath) {
    this.params.output = filePath;
    return this;
  }

  format(format) {
    this.params.format = format;
    return this;
  }

  orientation(orientation) {
    this.params.orientation = orientation;
    return this;
  }

  margins(margins) {
    this.params.margins = margins;
    return this;
  }

  scale(scale) {
    this.params.scale = scale;
    return this;
  }

  quality(quality) {
    this.params.quality = quality;
    return this;
  }

  background(include = true) {
    if (include) {
      this.params.background = true;
    }
    return this;
  }

  viewport(width, height) {
    this.params.viewport = `${width}x${height}`;
    return this;
  }

  waitFor(strategy) {
    this.params.waitFor = strategy;
    return this;
  }

  timeout(ms) {
    this.params.timeout = ms;
    return this;
  }

  headers(headers) {
    if (typeof headers === 'object') {
      this.params.headers = JSON.stringify(headers);
    } else {
      this.params.headers = headers;
    }
    return this;
  }

  cookies(cookies) {
    if (typeof cookies === 'object') {
      this.params.cookies = JSON.stringify(cookies);
    } else {
      this.params.cookies = cookies;
    }
    return this;
  }

  retries(count) {
    this.params.retries = count;
    return this;
  }

  userAgent(ua) {
    this.params.userAgent = ua;
    return this;
  }

  build() {
    const args = ['printeer'];

    Object.entries(this.params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (typeof value === 'boolean') {
          if (value) args.push(`--${key}`);
        } else {
          // Convert camelCase to kebab-case for CLI
          const cliKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
          args.push(`--${cliKey}`, String(value));
        }
      }
    });

    return args;
  }

  reset() {
    this.params = {};
    return this;
  }
}