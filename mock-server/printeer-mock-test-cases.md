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

## Standard Test Commands

### Batch Testing Commands

The framework provides standardized commands for comprehensive batch testing and selective test execution:

#### 1. Complete Test Suite Execution

```bash
# Run all test suites with default parameters (auto-starts mock server if needed)
yarn mockserver-test:all

# Run all tests with custom mock server URL
yarn mockserver-test:all --server=http://localhost:3000

# Run all tests with specific output directory
yarn mockserver-test:all --output=./custom-output

# Run all tests with parallel execution
yarn mockserver-test:all --parallel=8 --timeout=60000
```

#### 2. Feature Group Testing

```bash
# Run specific test suite (auto-starts mock server if needed)
yarn mockserver-test:suite basic           # Basic pages and layout
yarn mockserver-test:suite print           # Print CSS & formatting
yarn mockserver-test:suite dynamic         # SPA & wait strategies
yarn mockserver-test:suite auth            # Authentication & headers
yarn mockserver-test:suite redirects       # Redirect handling
yarn mockserver-test:suite resources       # Resource & performance
yarn mockserver-test:suite errors          # Error handling
yarn mockserver-test:suite i18n            # Internationalization
yarn mockserver-test:suite media           # Media emulation
yarn mockserver-test:suite templates       # Templates & variables
yarn mockserver-test:suite cache-csp       # Cache & CSP
yarn mockserver-test:suite image           # Image capture

# Run multiple suites
yarn mockserver-test:suite print,auth,dynamic
```

#### 3. Parameter-Specific Testing

```bash
# Test specific formats across all suites (auto-starts mock server if needed)
yarn mockserver-test:format A4             # Test only A4 format
yarn mockserver-test:format Letter,A3      # Test Letter and A3 formats

# Test specific orientations
yarn mockserver-test:orientation landscape # Test only landscape orientation

# Test authentication scenarios
yarn mockserver-test:auth-only             # Run only authentication tests

# Test error scenarios
yarn mockserver-test:errors-only           # Run only error handling tests
```

#### 4. Single Test Execution

```bash
# Run single test case (auto-starts mock server if needed)
yarn mockserver-test:single basic/simple-html --format=A4 --orientation=portrait

# Run single endpoint with custom parameters
yarn mockserver-test:single print/margins --format=Letter --margins=2cm --scale=1.5

# Run single test with all parameter combinations
yarn mockserver-test:single auth/bearer --matrix

# Run single test with custom output filename
yarn mockserver-test:single dynamic/delay-content --output=custom-delay-test.pdf
```

### Command Implementation

#### package.json Scripts

```json
{
  "scripts": {
    "mockserver-test:all": "node scripts/run-all-tests.js",
    "mockserver-test:suite": "node scripts/run-suite.js",
    "mockserver-test:single": "node scripts/run-single-test.js",
    "mockserver-test:format": "node scripts/run-format-tests.js",
    "mockserver-test:orientation": "node scripts/run-orientation-tests.js",
    "mockserver-test:auth-only": "node scripts/run-suite.js auth",
    "mockserver-test:errors-only": "node scripts/run-suite.js errors",
    "mockserver-test:quick": "node scripts/run-quick-tests.js",
    "mockserver-test:smoke": "node scripts/run-smoke-tests.js",
    "mockserver-test:clean": "node scripts/clean-outputs.js",
    "mockserver-test:report": "node scripts/generate-report.js",
    "mockserver-test:verify": "node scripts/verify-mock-server.js",
    "mockserver:start": "cd mock-server && yarn start",
    "mockserver:health": "cd mock-server && yarn health-check"
  }
}
```

#### Command Line Interface

```javascript
// scripts/run-single-test.js
import { Command } from 'commander';
import { SingleTestRunner } from '../framework/single-test-runner.js';

const program = new Command();

program
  .name('printeer-single-test')
  .description('Run a single Printeer test case')
  .argument('<testCase>', 'Test case in format: group/test-name')
  .option('-s, --server <url>', 'Mock server URL', 'http://localhost:4000')
  .option('-o, --output <path>', 'Output file path (optional)')
  .option('-f, --format <format>', 'Page format', 'A4')
  .option('--orientation <orientation>', 'Page orientation', 'portrait')
  .option('--margins <margins>', 'Page margins', '1in')
  .option('--scale <scale>', 'Scale factor', '1.0')
  .option('--quality <quality>', 'Output quality', 'medium')
  .option('--background', 'Include background graphics')
  .option('--wait-for <strategy>', 'Wait strategy')
  .option('--timeout <ms>', 'Timeout in milliseconds', '30000')
  .option('--retries <count>', 'Retry count', '2')
  .option('--headers <headers>', 'Custom headers (JSON)')
  .option('--cookies <cookies>', 'Custom cookies (JSON)')
  .option('--matrix', 'Run all parameter combinations')
  .option('--verbose', 'Verbose output')
  .action(async (testCase, options) => {
    const runner = new SingleTestRunner(options);
    await runner.runTest(testCase, options);
  });

program.parse();
```

#### Batch Test Runner Implementation

```javascript
// scripts/run-all-tests.js
import { Command } from 'commander';
import { BatchTestRunner } from '../framework/batch-test-runner.js';
import { MockServerClient } from '../framework/mock-server-client.js';

const program = new Command();

program
  .name('printeer-batch-tests')
  .description('Run comprehensive Printeer test suite')
  .option('-s, --server <url>', 'Mock server URL', 'http://localhost:4000')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-p, --parallel <count>', 'Parallel execution count', '4')
  .option('-t, --timeout <ms>', 'Test timeout', '30000')
  .option('-r, --retries <count>', 'Retry count', '2')
  .option('--suites <suites>', 'Comma-separated suite names')
  .option('--skip-suites <suites>', 'Comma-separated suites to skip')
  .option('--formats <formats>', 'Comma-separated formats to test')
  .option('--quick', 'Run quick test subset')
  .option('--smoke', 'Run smoke tests only')
  .option('--continue-on-error', 'Continue testing after failures')
  .option('--no-cleanup', 'Keep temporary files')
  .option('--verbose', 'Verbose output')
  .action(async (options) => {
    // Auto-start mock server if needed
    const mockServerManager = new MockServerManager();
    await mockServerManager.ensureServerRunning(options.server);

    console.log(`✅ Mock server is ready at ${options.server}`);

    const runner = new BatchTestRunner(options);
    const results = await runner.runBatchTests();    console.log(`\n📊 Test Results:`);
    console.log(`   Total: ${results.total}`);
    console.log(`   Passed: ${results.passed}`);
    console.log(`   Failed: ${results.failed}`);
    console.log(`   Duration: ${results.duration}ms`);

    if (results.failed > 0) {
      console.log(`\n❌ ${results.failed} tests failed. See detailed report.`);
      process.exit(1);
    } else {
      console.log(`\n✅ All tests passed!`);
    }
  });

program.parse();
```

#### Suite-Specific Runner

```javascript
// scripts/run-suite.js
import { Command } from 'commander';
import { SuiteTestRunner } from '../framework/suite-test-runner.js';

const program = new Command();

program
  .name('printeer-suite-tests')
  .description('Run specific Printeer test suite(s)')
  .argument('<suites>', 'Comma-separated suite names')
  .option('-s, --server <url>', 'Mock server URL', 'http://localhost:4000')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-p, --parallel <count>', 'Parallel execution', '2')
  .option('--formats <formats>', 'Test specific formats only')
  .option('--orientations <orientations>', 'Test specific orientations')
  .option('--quick', 'Run reduced parameter matrix')
  .option('--verbose', 'Verbose output')
  .action(async (suites, options) => {
    const suiteNames = suites.split(',').map(s => s.trim());
    const runner = new SuiteTestRunner(options);

    for (const suiteName of suiteNames) {
      console.log(`\n🧪 Running ${suiteName} test suite...`);
      const results = await runner.runSuite(suiteName);
      console.log(`   ${suiteName}: ${results.passed}/${results.total} passed`);
    }
  });

program.parse();
```

### Quick Test Modes

#### Smoke Tests (Fast Validation)

```bash
# Run essential tests only (1-2 tests per suite) - auto-starts mock server
yarn mockserver-test:smoke

# Quick validation of mock server endpoints
yarn mockserver-test:smoke --endpoints-only

# Verify basic functionality across all groups
yarn mockserver-test:smoke --all-groups
```

```javascript
// Smoke test configuration
const smokeTests = {
  basic: ['simple-html'],
  print: ['css-default', 'margins'],
  dynamic: ['delay-content'],
  auth: ['basic-auth'],
  errors: ['http-500']
};
```

#### Quick Tests (Reduced Matrix)

```bash
# Run tests with reduced parameter combinations - auto-starts mock server
yarn mockserver-test:quick

# Quick test with specific parameters
yarn mockserver-test:quick --format=A4 --orientation=portrait

# Fast validation of core functionality
yarn mockserver-test:quick --core-only
```

### Test Execution Examples

#### Example 1: Complete Test Suite

```bash
# Run complete test suite (automatically starts mock server if needed)
cd tests/mock-server-testing
yarn mockserver-test:all

# Or manually start mock server first (optional)
cd mock-server && yarn start
cd tests/mock-server-testing
yarn mockserver-test:all

# Generated outputs:
# output/pdfs/basic/simple-html_A4-portrait-1in_20250921-143022.pdf
# output/pdfs/print/margins_Letter-landscape-2cm_20250921-143045.pdf
# output/reports/test-results-20250921-143000.html
```

#### Example 2: Single Test Case

```bash
# Test specific endpoint with custom parameters (auto-starts mock server if needed)
yarn mockserver-test:single print/margins \
  --format=A3 \
  --orientation=landscape \
  --margins=2cm \
  --scale=1.5 \
  --output=custom-margins-test.pdf

# Generated: output/pdfs/print/custom-margins-test.pdf
```

#### Example 3: Authentication Testing

```bash
# Test all authentication scenarios (auto-starts mock server if needed)
yarn mockserver-test:suite auth

# Test specific auth method
yarn mockserver-test:single auth/bearer \
  --headers='{"Authorization": "Bearer test-token-123"}' \
  --format=Letter

# Generated: output/pdfs/auth/bearer_Letter-portrait-bearer-token_20250921-143112.pdf
```

#### Example 4: Error Handling Tests

```bash
# Test error resilience (auto-starts mock server if needed)
yarn mockserver-test:suite errors --retries=3 --timeout=10000

# Test specific error scenario
yarn mockserver-test:single errors/timeout \
  --timeout=5000 \
  --retries=2

# Expected: Test should fail gracefully with proper error reporting
```

### Test Output Organization

Each command generates organized outputs:

```
output/
├── pdfs/
│   ├── basic/
│   │   ├── simple-html_A4-portrait-1in_20250921-143022.pdf
│   │   └── long-content_Letter-landscape-5pages_20250921-143045.pdf
│   ├── print/
│   │   ├── margins_A4-1in-all-sides_20250921-143112.pdf
│   │   └── custom-size_210x99mm-portrait_20250921-143145.pdf
│   └── auth/
│       ├── basic-auth_A4-portrait-credentials_20250921-143200.pdf
│       └── bearer-token_Letter-landscape-authorized_20250921-143235.pdf
├── logs/
│   ├── batch-test-20250921-143000.log
│   ├── single-test-20250921-143500.log
│   └── error-details-20250921-143000.log
└── reports/
    ├── summary-20250921-143000.html
    ├── detailed-results-20250921-143000.json
    └── failed-tests-20250921-143000.txt
```

### Mock Server Integration

#### Automatic Server Management

```javascript
// Auto-start and manage mock server for testing
class MockServerManager {
  constructor() {
    this.serverProcess = null;
    this.isStarting = false;
  }

  async ensureServerRunning(serverUrl = 'http://localhost:4000') {
    const client = new MockServerClient(serverUrl);

    // Check if already running
    if (await client.checkHealth()) {
      console.log('✅ Mock server is already running');
      return true;
    }

    // Prevent multiple startup attempts
    if (this.isStarting) {
      console.log('⏳ Mock server is starting...');
      return this.waitForServer(client);
    }

    this.isStarting = true;

    try {
      console.log('🚀 Starting mock server automatically...');

      // Start the mock server in background
      const { spawn } = require('child_process');
      const path = require('path');

      const mockServerPath = path.resolve(__dirname, '../../mock-server');

      this.serverProcess = spawn('yarn', ['start'], {
        cwd: mockServerPath,
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Handle server process events
      this.serverProcess.on('error', (error) => {
        console.error('❌ Failed to start mock server:', error.message);
        this.isStarting = false;
      });

      // Wait for server to be ready with timeout
      const success = await this.waitForServer(client, 30000);

      if (success) {
        console.log('✅ Mock server started successfully');

        // Cleanup on process exit
        process.on('exit', () => this.cleanup());
        process.on('SIGINT', () => this.cleanup());
        process.on('SIGTERM', () => this.cleanup());

        return true;
      } else {
        throw new Error('Mock server failed to start within timeout period');
      }
    } catch (error) {
      this.isStarting = false;
      console.error('❌ Error starting mock server:', error.message);
      console.log('💡 You can manually start it: cd mock-server && yarn start');
      throw error;
    }
  }

  async waitForServer(client, timeoutMs = 30000) {
    const startTime = Date.now();
    const checkInterval = 1000;

    while (Date.now() - startTime < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));

      if (await client.checkHealth()) {
        this.isStarting = false;
        return true;
      }
    }

    this.isStarting = false;
    return false;
  }

  cleanup() {
    if (this.serverProcess) {
      console.log('🧹 Cleaning up mock server process...');
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
    }
  }
}

// Enhanced MockServerClient with better error handling
class MockServerClient {
  constructor(baseUrl = 'http://localhost:4000') {
    this.baseUrl = baseUrl;
  }

  async checkHealth(retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`${this.baseUrl}/__health`, {
          method: 'GET',
          timeout: 5000
        });

        if (response.ok) {
          const health = await response.json();
          return health.ok === true;
        }
      } catch (error) {
        // Network error, server not running
        if (i === retries - 1) {
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return false;
  }

  async getCatalog() {
    try {
      const response = await fetch(`${this.baseUrl}/__catalog.json`);
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch catalog: ${error.message}`);
    }
  }
}
```## Implementation Roadmap

1. **Phase 1**: Core framework and batch testing commands
2. **Phase 2**: Single test execution and parameter matrix testing
3. **Phase 3**: Advanced reporting and verification tools
4. **Phase 4**: CI/CD integration and automation
5. **Phase 5**: API testing extension and performance testing

This framework provides comprehensive coverage of Printeer functionality with flexible execution modes, from quick smoke tests to exhaustive parameter matrix validation, while maintaining clear organization for manual verification and future extension to direct API testing.
