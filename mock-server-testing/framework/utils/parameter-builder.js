/**
 * CLI parameter construction utilities
 */
export class ParameterBuilder {
  constructor() {
    this.parameterDefinitions = {
      format: {
        type: 'string',
        values: ['A4', 'A3', 'A5', 'Letter', 'Legal', 'Tabloid'],
        default: 'A4'
      },
      orientation: {
        type: 'string',
        values: ['portrait', 'landscape'],
        default: 'portrait'
      },
      margins: {
        type: 'string',
        values: ['none', '1in', '2cm', '1in,2cm,1in,2cm', '0.5in', '1.5cm'],
        default: '1in'
      },
      scale: {
        type: 'number',
        values: [0.5, 0.75, 1.0, 1.25, 1.5, 2.0],
        default: 1.0
      },
      quality: {
        type: 'string',
        values: ['low', 'medium', 'high'],
        default: 'medium'
      },
      background: {
        type: 'boolean',
        values: [true, false],
        default: true
      },
      viewport: {
        type: 'string',
        values: ['800x600', '1024x768', '1280x720', '1920x1080'],
        default: '1024x768'
      },
      waitFor: {
        type: 'string',
        values: [
          'timeout:5000',
          'selector:#content',
          'selector:.ready',
          'function:window.__ready',
          'networkidle0',
          'networkidle2'
        ],
        default: 'timeout:5000'
      },
      timeout: {
        type: 'number',
        values: [5000, 10000, 15000, 30000],
        default: 30000
      },
      retries: {
        type: 'number',
        values: [0, 1, 2, 3, 5],
        default: 2
      },
      userAgent: {
        type: 'string',
        values: [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
          'custom-printeer-agent'
        ],
        default: null
      }
    };
  }

  /**
   * Generate all possible parameter combinations for a test matrix
   */
  generateParameterMatrix(testCase) {
    const matrix = testCase.parameterMatrix || {};
    const combinations = [];

    // If no matrix provided, use single default combination
    if (Object.keys(matrix).length === 0) {
      return [this.getDefaultParameters()];
    }

    // Generate all combinations
    const keys = Object.keys(matrix);
    this.generateCombinationsRecursive(keys, matrix, 0, {}, combinations);

    return combinations;
  }

  generateCombinationsRecursive(keys, matrix, index, current, combinations) {
    if (index === keys.length) {
      combinations.push({ ...current });
      return;
    }

    const key = keys[index];
    const values = matrix[key];

    for (const value of values) {
      current[key] = value;
      this.generateCombinationsRecursive(keys, matrix, index + 1, current, combinations);
    }
  }

  /**
   * Get default parameters for basic testing
   */
  getDefaultParameters() {
    const defaults = {};
    for (const [key, definition] of Object.entries(this.parameterDefinitions)) {
      if (definition.default !== null && definition.default !== undefined) {
        defaults[key] = definition.default;
      }
    }
    return defaults;
  }

  /**
   * Generate quick test parameters (reduced matrix)
   */
  generateQuickParameters(testCase) {
    const matrix = testCase.parameterMatrix || {};
    const quickMatrix = {};

    // Reduce each parameter to 1-2 values for quick testing
    for (const [key, values] of Object.entries(matrix)) {
      if (Array.isArray(values) && values.length > 0) {
        quickMatrix[key] = values.length > 1 ? [values[0], values[1]] : [values[0]];
      }
    }

    return this.generateParameterMatrix({ parameterMatrix: quickMatrix });
  }

  /**
   * Generate smoke test parameters (minimal testing)
   */
  generateSmokeParameters() {
    return [{
      format: 'A4',
      orientation: 'portrait',
      margins: '1in'
    }];
  }

  /**
   * Validate parameter values
   */
  validateParameters(parameters) {
    const errors = [];

    for (const [key, value] of Object.entries(parameters)) {
      if (this.parameterDefinitions[key]) {
        const definition = this.parameterDefinitions[key];

        // Type validation
        if (definition.type === 'number' && typeof value !== 'number') {
          errors.push(`Parameter '${key}' should be a number, got ${typeof value}`);
          continue;
        }

        if (definition.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Parameter '${key}' should be a boolean, got ${typeof value}`);
          continue;
        }

        if (definition.type === 'string' && typeof value !== 'string') {
          errors.push(`Parameter '${key}' should be a string, got ${typeof value}`);
          continue;
        }

        // Value validation
        if (definition.values && !definition.values.includes(value)) {
          errors.push(`Parameter '${key}' has invalid value '${value}'. Valid values: ${definition.values.join(', ')}`);
        }
      } else {
        console.warn(`Unknown parameter: ${key}`);
      }
    }

    return errors;
  }

  /**
   * Get parameter combinations for specific formats
   */
  getFormatSpecificParameters(formats) {
    return formats.map(format => ({
      format,
      orientation: 'portrait',
      margins: '1in'
    }));
  }

  /**
   * Get parameter combinations for specific orientations
   */
  getOrientationSpecificParameters(orientations) {
    return orientations.map(orientation => ({
      format: 'A4',
      orientation,
      margins: '1in'
    }));
  }

  /**
   * Merge parameters with defaults
   */
  mergeWithDefaults(parameters) {
    const defaults = this.getDefaultParameters();
    return { ...defaults, ...parameters };
  }

  /**
   * Filter parameters by group/suite requirements
   */
  filterParametersForSuite(parameters, suiteType) {
    const filtered = { ...parameters };

    switch (suiteType) {
      case 'print':
        // Print tests need all formatting parameters
        break;
      case 'auth':
        // Auth tests don't need scale/quality
        delete filtered.scale;
        delete filtered.quality;
        break;
      case 'dynamic':
        // Dynamic tests focus on wait strategies
        filtered.waitFor = parameters.waitFor || 'selector:#content';
        filtered.timeout = parameters.timeout || 10000;
        break;
      case 'errors':
        // Error tests need retry parameters
        filtered.retries = parameters.retries || 3;
        filtered.timeout = parameters.timeout || 5000;
        break;
      case 'image':
        // Image tests need viewport and quality
        filtered.viewport = parameters.viewport || '1024x768';
        break;
    }

    return filtered;
  }
}