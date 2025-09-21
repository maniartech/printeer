# Printeer Mock Test Cases - Technical Design Document

## Overview

This document defines the comprehensive testing framework for Printeer CLI commands using the mock server. The framework is designed for stdio-based testing that validates all Printeer parameters and features through controlled test scenarios, with organized output artifacts for manual verification.

## Architecture Overview

### Core Components

```
tests/mock-server-testing/
├── framework/                    # Testing framework core
│   ├── test-runner.js           # Main test orchestrator
│   ├── cli-executor.js          # Printeer CLI command executor
│   ├── output-verifier.js       # Output file verification utilities
│   ├── mock-server-client.js    # Mock server interaction client
│   └── utils/
│       ├── filename-generator.js # Descriptive filename creation
│       ├── parameter-builder.js  # CLI parameter construction
│       └── report-generator.js   # Test result reporting
├── test-suites/                 # Test case definitions
│   ├── basic/                   # Basic pages and layout tests
│   ├── print/                   # Print CSS & formatting tests
│   ├── dynamic/                 # SPA & wait strategy tests
│   ├── auth/                    # Authentication tests
│   ├── redirects/               # Redirect handling tests
│   ├── resources/               # Resource & performance tests
│   ├── errors/                  # Error handling tests
│   ├── i18n/                    # Internationalization tests
│   ├── media/                   # Media emulation tests
│   ├── templates/               # Template tests
│   ├── cache-csp/               # Cache & CSP tests
│   └── image/                   # Image capture tests
├── config/                      # Test configuration
│   ├── test-config.json         # Global test settings
│   ├── parameter-matrix.json    # Parameter combination matrices
│   └── mock-server-config.json  # Mock server configuration
├── output/                      # Generated test artifacts
│   ├── pdfs/                    # Generated PDF files
│   ├── images/                  # Generated PNG/JPEG files
│   ├── logs/                    # Test execution logs
│   └── reports/                 # Test result reports
└── scripts/                     # Utility scripts
    ├── run-all-tests.js         # Execute all test suites
    ├── run-suite.js             # Execute specific test suite
    └── clean-outputs.js         # Clean output directories
```

### Testing Philosophy

1. **Comprehensive Parameter Coverage**: Every Printeer CLI parameter is tested across multiple scenarios
2. **Stdio-Based Execution**: Tests execute Printeer CLI commands and analyze stdout/stderr/exit codes
3. **Organized Output Artifacts**: Generated files use descriptive names indicating test parameters
4. **Manual Verification Friendly**: Output structure enables easy manual inspection of results
5. **Future API Testing Ready**: Framework designed to extend to direct API testing

## Test Case Organization

### Test Suite Structure

Each test suite corresponds to a feature group in the mock server catalog:

```javascript
// Example: tests/test-suites/print/print-test-suite.js
export const printTestSuite = {
  name: 'Print CSS & Page Formatting',
  group: 'print',
  mockEndpoints: [
    '/print/css-default',
    '/print/margins?top=1in&right=1in&bottom=1in&left=1in',
    '/print/custom-size?width=210mm&height=99mm'
    // ... other endpoints
  ],
  testCases: [
    {
      name: 'basic-print-css',
      endpoint: '/print/css-default',
      parameters: {
        format: ['A4', 'Letter', 'A3'],
        orientation: ['portrait', 'landscape'],
        margins: ['1in', '2cm', 'none']
      },
      expectedOutputs: ['pdf']
    },
    {
      name: 'custom-margins',
      endpoint: '/print/margins',
      parameters: {
        margins: ['1in', '2cm,1in,2cm,1in', 'none'],
        format: ['A4', 'Letter']
      },
      expectedOutputs: ['pdf']
    }
    // ... more test cases
  ]
};
```

### Parameter Matrix Testing

The framework supports comprehensive parameter combination testing:

```javascript
// Example parameter matrix for print tests
{
  "print": {
    "format": ["A4", "Letter", "A3", "A5", "Legal"],
    "orientation": ["portrait", "landscape"],
    "margins": ["none", "1in", "2cm", "1in,2cm,1in,2cm"],
    "scale": [0.5, 1.0, 1.5, 2.0],
    "quality": ["low", "medium", "high"],
    "background": [true, false],
    "waitFor": ["selector:#content", "function:window.__ready", "timeout:5000"],
    "headers": [
      null,
      {"Authorization": "Bearer test123"},
      {"Custom-Header": "test-value"}
    ]
  }
}
```

## Output File Organization

### Filename Convention

Generated files use descriptive names that encode the test parameters:

```
Format: {group}_{endpoint}_{parameters}_{timestamp}.{ext}

Examples:
- print_css-default_A4-portrait-1in-margins_20250921-143022.pdf
- print_custom-size_210x99mm-landscape-high-quality_20250921-143045.pdf
- auth_bearer_A4-portrait-bearer-auth_20250921-143112.pdf
- dynamic_delay-content_Letter-2000ms-wait_20250921-143145.pdf
- errors_500_A4-portrait-retry-3x_20250921-143200.pdf
```

### Directory Structure

```
output/
├── pdfs/
│   ├── basic/                   # Basic page tests
│   │   ├── simple_A4-portrait-default_20250921-143022.pdf
│   │   └── long-content_A4-5pages-landscape_20250921-143045.pdf
│   ├── print/                   # Print formatting tests
│   │   ├── margins_A4-1in-all-sides_20250921-143112.pdf
│   │   └── custom-size_210x99mm-portrait_20250921-143145.pdf
│   ├── auth/                    # Authentication tests
│   │   ├── basic-auth_A4-portrait-success_20250921-143200.pdf
│   │   └── bearer-token_Letter-landscape-authorized_20250921-143235.pdf
│   └── errors/                  # Error handling tests
│       ├── 500-error_A4-portrait-fallback_20250921-143300.pdf
│       └── timeout_Letter-10s-timeout-retry_20250921-143335.pdf
├── images/                      # PNG/JPEG outputs
│   ├── image/
│   │   ├── clip-target_800x600-png-selector-clip_20250921-143400.png
│   │   └── quality-grid_1200x800-jpeg-90quality_20250921-143435.jpg
│   └── dynamic/
│       └── interactive_1024x768-png-wait-selector_20250921-143500.png
├── logs/                        # Execution logs
│   ├── test-run-20250921-143000.log
│   └── error-details-20250921-143000.log
└── reports/                     # Test reports
    ├── summary-20250921-143000.html
    ├── detailed-20250921-143000.json
    └── failed-tests-20250921-143000.txt
```

## Test Execution Framework

### CLI Command Construction

The framework builds Printeer CLI commands dynamically:

```javascript
// Example CLI command construction
class PrinteerCommandBuilder {
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

  // ... other parameter methods

  build() {
    const args = ['printeer'];

    Object.entries(this.params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (typeof value === 'boolean') {
          if (value) args.push(`--${key}`);
        } else {
          args.push(`--${key}`, String(value));
        }
      }
    });

    return args;
  }
}
```

### Test Execution Engine

```javascript
// Example test execution
class TestRunner {
  async runTest(testCase, parameters) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = this.generateFilename(testCase, parameters, timestamp);
    const outputPath = path.join(this.outputDir, testCase.group, filename);

    const command = new PrinteerCommandBuilder()
      .url(testCase.endpoint)
      .output(outputPath)
      .format(parameters.format)
      .orientation(parameters.orientation)
      // ... apply all parameters
      .build();

    const result = await this.executeCommand(command);

    return {
      testCase: testCase.name,
      parameters,
      command: command.join(' '),
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      outputFile: outputPath,
      fileExists: fs.existsSync(outputPath),
      fileSize: fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0,
      duration: result.duration
    };
  }
}
```

## Parameter Coverage Matrix

### Core Printeer Parameters

| Parameter | Test Values | Test Groups |
|-----------|-------------|-------------|
| `--format` | A4, Letter, A3, A5, Legal, custom | All |
| `--orientation` | portrait, landscape | All |
| `--margins` | none, 1in, 2cm, 1in,2cm,1in,2cm | print, basic |
| `--scale` | 0.5, 1.0, 1.5, 2.0 | print, image |
| `--quality` | low, medium, high | All PDF |
| `--background` | true, false | print, image |
| `--output` | pdf, png, jpeg | All |
| `--viewport` | 1920x1080, 1024x768, 800x600 | dynamic, media |
| `--wait-for` | timeout, selector, function, networkidle | dynamic |
| `--timeout` | 5000, 10000, 30000 | dynamic, errors |
| `--headers` | auth, custom, none | auth, resources |
| `--cookies` | session, auth, none | auth |
| `--retries` | 0, 1, 3, 5 | errors, resources |
| `--user-agent` | desktop, mobile, custom | basic, media |

### Wait Strategy Testing

```javascript
const waitStrategies = [
  { type: 'timeout', value: '5000' },
  { type: 'selector', value: '#content' },
  { type: 'function', value: 'window.__ready' },
  { type: 'networkidle', value: '2' }
];
```

### Authentication Testing

```javascript
const authScenarios = [
  { type: 'basic', credentials: 'user:pass' },
  { type: 'bearer', token: 'test-token-123' },
  { type: 'cookie', sessionId: 'session123' },
  { type: 'header', custom: 'X-API-Key: secret' }
];
```

## Test Case Definitions

### 1. Basic Pages Test Suite

```javascript
export const basicTestSuite = {
  name: 'Basic Pages and Layout',
  group: 'basic',
  testCases: [
    {
      name: 'simple-html',
      endpoint: '/static/simple',
      parameterMatrix: {
        format: ['A4', 'Letter'],
        orientation: ['portrait', 'landscape'],
        margins: ['1in', 'none']
      },
      expectedBehavior: 'success',
      manualChecks: [
        'Text is properly rendered',
        'Margins are correctly applied',
        'Page orientation is correct'
      ]
    },
    {
      name: 'long-content',
      endpoint: '/static/long?pages=5',
      parameterMatrix: {
        format: ['A4', 'Letter'],
        pageRanges: ['1-3', '2-4', 'all']
      },
      expectedBehavior: 'success',
      manualChecks: [
        'Page breaks are clean',
        'Page ranges are respected',
        'Content flows correctly'
      ]
    }
  ]
};
```

### 2. Print Formatting Test Suite

```javascript
export const printTestSuite = {
  name: 'Print CSS & Page Formatting',
  group: 'print',
  testCases: [
    {
      name: 'margins-validation',
      endpoint: '/print/margins?top=1in&right=1in&bottom=1in&left=1in',
      parameterMatrix: {
        margins: ['1in', '2cm', '1in,2cm,1in,2cm', 'none'],
        format: ['A4', 'Letter', 'A3']
      },
      expectedBehavior: 'success',
      manualChecks: [
        'Margin rulers show correct measurements',
        'Content is not clipped by margins',
        'Print vs screen CSS differences are applied'
      ]
    },
    {
      name: 'page-breaks',
      endpoint: '/print/page-breaks',
      parameterMatrix: {
        format: ['A4', 'Letter'],
        scale: [1.0, 1.5]
      },
      expectedBehavior: 'success',
      manualChecks: [
        'Page breaks occur at intended locations',
        'No orphaned content',
        'Headers/footers respect page breaks'
      ]
    }
  ]
};
```

### 3. Dynamic Content Test Suite

```javascript
export const dynamicTestSuite = {
  name: 'Dynamic/SPA & Wait Strategies',
  group: 'dynamic',
  testCases: [
    {
      name: 'wait-for-selector',
      endpoint: '/spa/delay-content?ms=2000',
      parameterMatrix: {
        waitFor: ['selector:#delayed-content', 'timeout:3000'],
        timeout: [5000, 10000]
      },
      expectedBehavior: 'success',
      manualChecks: [
        'Delayed content is present in output',
        'Wait strategy completed successfully',
        'No premature capture occurred'
      ]
    },
    {
      name: 'network-idle',
      endpoint: '/spa/network-idle?requests=5',
      parameterMatrix: {
        waitFor: ['networkidle0', 'networkidle2'],
        timeout: [10000, 15000]
      },
      expectedBehavior: 'success',
      manualChecks: [
        'All network requests completed',
        'Dynamic content fully loaded',
        'No loading indicators visible'
      ]
    }
  ]
};
```

### 4. Authentication Test Suite

```javascript
export const authTestSuite = {
  name: 'Authentication & Headers',
  group: 'auth',
  testCases: [
    {
      name: 'basic-auth-success',
      endpoint: '/auth/basic',
      parameterMatrix: {
        headers: ['Basic dXNlcjpwYXNz'], // user:pass base64
        format: ['A4']
      },
      expectedBehavior: 'success',
      manualChecks: [
        'Authenticated content is visible',
        'No login prompts in output',
        'Protected content rendered correctly'
      ]
    },
    {
      name: 'bearer-token',
      endpoint: '/auth/bearer',
      parameterMatrix: {
        headers: ['Bearer test-token-123'],
        format: ['A4', 'Letter']
      },
      expectedBehavior: 'success',
      manualChecks: [
        'Token-protected content accessible',
        'Authorization header processed correctly'
      ]
    }
  ]
};
```

### 5. Error Handling Test Suite

```javascript
export const errorTestSuite = {
  name: 'Errors & Resilience',
  group: 'errors',
  testCases: [
    {
      name: 'http-500-handling',
      endpoint: '/error/500',
      parameterMatrix: {
        retries: [0, 1, 3],
        timeout: [5000, 10000]
      },
      expectedBehavior: 'error',
      expectedExitCode: 1,
      manualChecks: [
        'Error is properly reported in stderr',
        'Retry attempts are made as configured',
        'No partial output files created'
      ]
    },
    {
      name: 'timeout-handling',
      endpoint: '/error/timeout?ms=10000',
      parameterMatrix: {
        timeout: [3000, 5000],
        retries: [1, 2]
      },
      expectedBehavior: 'timeout',
      expectedExitCode: 1,
      manualChecks: [
        'Timeout occurs within expected timeframe',
        'Proper error message provided',
        'Resources cleaned up correctly'
      ]
    }
  ]
};
```

## Test Execution and Reporting

### Test Runner Implementation

```javascript
class ComprehensiveTestRunner {
  constructor(config) {
    this.config = config;
    this.mockServerUrl = config.mockServerUrl || 'http://localhost:4000';
    this.outputDir = config.outputDir || './output';
    this.results = [];
  }

  async runAllSuites() {
    const suites = [
      basicTestSuite,
      printTestSuite,
      dynamicTestSuite,
      authTestSuite,
      errorTestSuite
      // ... other suites
    ];

    for (const suite of suites) {
      await this.runSuite(suite);
    }

    await this.generateReport();
  }

  async runSuite(suite) {
    console.log(`Running test suite: ${suite.name}`);

    for (const testCase of suite.testCases) {
      const parameterCombinations = this.generateParameterCombinations(
        testCase.parameterMatrix
      );

      for (const parameters of parameterCombinations) {
        const result = await this.runTest(testCase, parameters);
        this.results.push(result);

        await this.logTestResult(result);
      }
    }
  }

  generateFilename(testCase, parameters, timestamp, extension) {
    const paramStr = Object.entries(parameters)
      .map(([k, v]) => `${k}-${String(v).replace(/[^a-zA-Z0-9]/g, '')}`)
      .join('-');

    return `${testCase.group}_${testCase.name}_${paramStr}_${timestamp}.${extension}`;
  }
}
```

### Report Generation

The framework generates multiple report formats:

1. **HTML Summary Report**: Visual overview with thumbnails and pass/fail status
2. **JSON Detail Report**: Complete test results for programmatic analysis
3. **CSV Export**: Tabular data for spreadsheet analysis
4. **Failed Tests Report**: Focus on failures for debugging

```javascript
class ReportGenerator {
  generateHTMLReport(results) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Printeer Test Results - ${new Date().toISOString()}</title>
      <style>
        /* Modern report styling */
      </style>
    </head>
    <body>
      <h1>Printeer Mock Server Test Results</h1>
      <div class="summary">
        <div class="stat">Total Tests: ${results.length}</div>
        <div class="stat">Passed: ${results.filter(r => r.success).length}</div>
        <div class="stat">Failed: ${results.filter(r => !r.success).length}</div>
      </div>

      <div class="test-groups">
        ${this.generateGroupSections(results)}
      </div>
    </body>
    </html>`;
  }

  generateGroupSections(results) {
    const groups = this.groupResultsByFeature(results);

    return Object.entries(groups).map(([groupName, groupResults]) => `
      <div class="group">
        <h2>${groupName}</h2>
        <div class="test-grid">
          ${groupResults.map(result => this.generateTestCard(result)).join('')}
        </div>
      </div>
    `).join('');
  }

  generateTestCard(result) {
    return `
      <div class="test-card ${result.success ? 'success' : 'failure'}">
        <h3>${result.testCase}</h3>
        <p>Parameters: ${JSON.stringify(result.parameters)}</p>
        <p>Duration: ${result.duration}ms</p>
        <p>Output: <a href="${result.outputFile}">${path.basename(result.outputFile)}</a></p>
        ${result.success ? '' : `<p class="error">Error: ${result.stderr}</p>`}
      </div>
    `;
  }
}
```

## Manual Verification Workflow

### Verification Checklist System

Each test case includes specific manual verification points:

```javascript
const verificationChecklists = {
  'print-margins': [
    'Margin rulers show correct measurements',
    'Content is not clipped by margins',
    'Print CSS overrides are applied',
    'Page size matches specified format'
  ],
  'auth-basic': [
    'Protected content is visible',
    'No authentication prompts in PDF',
    'Headers were properly sent',
    'Session state maintained if required'
  ],
  'dynamic-wait': [
    'Delayed content is present',
    'Wait condition was satisfied',
    'No loading indicators visible',
    'JavaScript execution completed'
  ]
};
```

### Output Organization for Review

```
output/
├── review/                      # Organized for manual review
│   ├── by-feature/              # Grouped by test feature
│   │   ├── basic-pages/
│   │   ├── print-formatting/
│   │   └── authentication/
│   ├── by-parameters/           # Grouped by parameter combinations
│   │   ├── A4-portrait/
│   │   ├── Letter-landscape/
│   │   └── custom-sizes/
│   └── quick-compare/           # Side-by-side comparisons
│       ├── format-comparison.html
│       └── orientation-comparison.html
```

## Continuous Integration Integration

### CI Pipeline Integration

```yaml
# .github/workflows/printeer-tests.yml
name: Printeer Mock Server Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          npm install
          cd mock-server && npm install

      - name: Start mock server
        run: |
          cd mock-server
          npm start &
          sleep 5

      - name: Run Printeer tests
        run: |
          cd tests/mock-server-testing
          npm run test:all

      - name: Upload test artifacts
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: printeer-test-outputs
          path: tests/mock-server-testing/output/
```

## Future API Testing Extension

The framework is designed to easily extend to direct API testing:

```javascript
// Future: Direct API testing capability
class PrinteerAPITester extends TestRunner {
  async runAPITest(testCase, parameters) {
    // Direct API calls instead of CLI execution
    const printeer = new PrinteerAPI();

    const result = await printeer.generatePDF({
      url: `${this.mockServerUrl}${testCase.endpoint}`,
      ...parameters
    });

    return this.validateAPIResult(result, testCase);
  }
}
```

## Configuration Management

### Test Configuration Schema

```json
{
  "mockServer": {
    "url": "http://localhost:4000",
    "healthCheckTimeout": 5000,
    "startupDelay": 2000
  },
  "output": {
    "baseDir": "./output",
    "keepArtifacts": true,
    "maxArtifactAge": "7d"
  },
  "execution": {
    "parallelism": 4,
    "timeout": 30000,
    "retries": 2
  },
  "reporting": {
    "formats": ["html", "json", "csv"],
    "includeThumbnails": true,
    "generateComparisons": true
  }
}
```

## Implementation Roadmap

1. **Phase 1**: Core framework and basic test suites
2. **Phase 2**: Advanced parameter matrix testing
3. **Phase 3**: Comprehensive reporting and verification tools
4. **Phase 4**: CI/CD integration
5. **Phase 5**: API testing extension

This framework provides comprehensive coverage of Printeer functionality while maintaining clear organization for manual verification and future extension to direct API testing.
