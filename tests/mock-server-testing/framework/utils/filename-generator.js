/**
 * Generates descriptive filenames that encode test parameters
 */
export class FilenameGenerator {
  constructor(config = {}) {
    this.config = {
      maxLength: 200,
      separator: '_',
      paramSeparator: '-',
      ...config
    };
  }

  /**
   * Generate a descriptive filename
   * Format: {group}_{endpoint}_{parameters}_{timestamp}.{ext}
   */
  generate(testCase, parameters, timestamp, extension = 'pdf') {
    const parts = [
      this.sanitize(testCase.group),
      this.sanitize(this.extractEndpointName(testCase.endpoint)),
      this.encodeParameters(parameters),
      timestamp
    ];

    const filename = parts.join(this.config.separator);
    const finalName = this.truncateIfNeeded(`${filename}.${extension}`);

    return finalName;
  }

  /**
   * Extract a clean name from endpoint path
   */
  extractEndpointName(endpoint) {
    // Remove query parameters and leading slash
    const path = endpoint.split('?')[0];
    const cleaned = path.replace(/^\//, '').replace(/\//g, '-');
    return cleaned || 'root';
  }

  /**
   * Encode parameters into filename-safe string
   */
  encodeParameters(parameters) {
    if (!parameters || Object.keys(parameters).length === 0) {
      return 'default';
    }

    const encoded = Object.entries(parameters)
      .filter(([key, value]) => value !== null && value !== undefined)
      .map(([key, value]) => {
        const cleanKey = this.sanitize(key);
        const cleanValue = this.sanitize(String(value));
        return `${cleanKey}-${cleanValue}`;
      })
      .join(this.config.paramSeparator);

    return encoded || 'default';
  }

  /**
   * Sanitize string for use in filename
   */
  sanitize(str) {
    if (!str) return '';

    return String(str)
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '') // Keep only alphanumeric, dots, and dashes
      .replace(/\.+/g, '.') // Collapse multiple dots
      .replace(/-+/g, '-') // Collapse multiple dashes
      .replace(/^[.-]+|[.-]+$/g, '') // Remove leading/trailing dots and dashes
      .substring(0, 50); // Limit individual component length
  }

  /**
   * Truncate filename if it exceeds maximum length
   */
  truncateIfNeeded(filename) {
    if (filename.length <= this.config.maxLength) {
      return filename;
    }

    const ext = filename.substring(filename.lastIndexOf('.'));
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const maxNameLength = this.config.maxLength - ext.length - 3; // Reserve space for "..."

    return nameWithoutExt.substring(0, maxNameLength) + '...' + ext;
  }

  /**
   * Parse filename to extract test information
   */
  parse(filename) {
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const extension = filename.substring(filename.lastIndexOf('.') + 1);

    const parts = nameWithoutExt.split(this.config.separator);

    if (parts.length < 4) {
      return null; // Invalid format
    }

    const [group, endpoint, parametersStr, timestamp] = parts;

    return {
      group,
      endpoint,
      parameters: this.decodeParameters(parametersStr),
      timestamp,
      extension
    };
  }

  /**
   * Decode parameters from filename string
   */
  decodeParameters(parametersStr) {
    if (!parametersStr || parametersStr === 'default') {
      return {};
    }

    const parameters = {};
    const pairs = parametersStr.split(this.config.paramSeparator);

    for (const pair of pairs) {
      const dashIndex = pair.indexOf('-');
      if (dashIndex > 0 && dashIndex < pair.length - 1) {
        const key = pair.substring(0, dashIndex);
        const value = pair.substring(dashIndex + 1);

        // Try to parse value as number or boolean
        if (value === 'true') {
          parameters[key] = true;
        } else if (value === 'false') {
          parameters[key] = false;
        } else if (!isNaN(value) && value !== '') {
          parameters[key] = Number(value);
        } else {
          parameters[key] = value;
        }
      }
    }

    return parameters;
  }

  /**
   * Generate filename for comparison/diff files
   */
  generateComparisonFilename(filename1, filename2, type = 'diff') {
    const name1 = filename1.substring(0, filename1.lastIndexOf('.'));
    const name2 = filename2.substring(0, filename2.lastIndexOf('.'));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/T/, '_').slice(0, -5);

    return `${type}_${name1}_vs_${name2}_${timestamp}.html`;
  }

  /**
   * Generate batch report filename
   */
  generateReportFilename(type = 'summary', format = 'html') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/T/, '_').slice(0, -5);
    return `${type}-report_${timestamp}.${format}`;
  }
}