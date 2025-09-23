# Printeer Mock Server Testing Framework

A comprehensive testing framework for Printeer CLI commands using a dedicated mock server. This framework provides stdio-based testing that validates all Printeer parameters and features through controlled test scenarios, with organized output artifacts for manual verification.

## 🚀 Quick Start

### Prerequisites

1. **Node.js 18+** - Required for running the test framework
2. **Printeer CLI** - The CLI tool being tested (ensure it's in your PATH)
3. **Mock Server** - The Printeer mock server must be running

### Installation

```bash
# Navigate to the testing framework directory
cd tests/mock-server-testing

# Install dependencies
yarn install
```

### Basic Usage

```bash
# Start the mock server (in a separate terminal)
yarn mockserver:start

# Run all tests
yarn mockserver-test:all

# Run specific test suite
yarn mockserver-test:suite basic

# Run single test case
yarn mockserver-test:single basic/simple-html --format=A4 --orientation=portrait

# Run smoke tests (fastest validation)
yarn mockserver-test:smoke
```

## 📋 Available Commands

### Batch Testing Commands

```bash
# Complete test suite execution
yarn mockserver-test:all                    # All tests with default parameters
yarn mockserver-test:all --quick           # Reduced parameter matrix
yarn mockserver-test:all --smoke           # Essential tests only
yarn mockserver-test:all --parallel=8      # Custom parallelism

# Feature group testing
yarn mockserver-test:suite basic           # Basic pages and layout
yarn mockserver-test:suite print           # Print CSS & formatting
yarn mockserver-test:suite dynamic         # SPA & wait strategies
yarn mockserver-test:suite auth            # Authentication & headers
yarn mockserver-test:suite errors          # Error handling
yarn mockserver-test:suite print,auth      # Multiple suites

# Parameter-specific testing
yarn mockserver-test:format A4,Letter      # Test specific formats
yarn mockserver-test:auth-only             # Authentication tests only
yarn mockserver-test:errors-only           # Error handling tests only
```

### Single Test Execution

```bash
# Basic single test
yarn mockserver-test:single basic/simple-html

# With custom parameters
yarn mockserver-test:single print/margins \\
  --format=A3 \\
  --orientation=landscape \\
  --margins=2cm \\
  --scale=1.5

# With authentication
yarn mockserver-test:single auth/bearer \\
  --headers='{"Authorization": "Bearer test-token-123"}' \\
  --format=Letter

# Run all parameter combinations for one test
yarn mockserver-test:single basic/simple-html --matrix
```

### Utility Commands

```bash
# Mock server management
yarn mockserver:start                       # Start mock server
yarn mockserver:health                      # Check server health
yarn mockserver-test:verify                # Verify server and routes

# Cleanup and maintenance
yarn mockserver-test:clean                 # Clean old output files
yarn clean:dry                             # Preview cleanup (dry run)
```

## 📊 Test Suites

The framework includes comprehensive test suites covering all Printeer functionality:

### 1. **Basic Pages** (`basic`)
- Simple HTML rendering
- Long multi-page content
- RTL text support
- Web fonts loading
- Image grids
- User agent handling

### 2. **Print Formatting** (`print`)
- CSS @media print rules
- Page margins and sizing
- Custom page dimensions
- Page breaks and pagination
- Headers and footers
- Print-specific styling

### 3. **Dynamic Content** (`dynamic`)
- SPA content loading
- Wait strategies (timeout, selector, function, network idle)
- JavaScript execution
- DOM mutations
- Async data loading

### 4. **Authentication** (`auth`)
- HTTP Basic authentication
- Bearer token authentication
- Custom headers
- Cookie-based authentication
- CSRF protection

### 5. **Error Handling** (`errors`)
- HTTP error codes (500, 404, etc.)
- Timeout handling
- Connection issues
- Retry logic
- Resource failures

### 6. **Internationalization** (`i18n`)
- UTF-8 character support
- CJK characters (Chinese, Japanese, Korean)
- Arabic RTL text
- Unicode handling

### 7. **Media Queries** (`media`)
- Responsive design
- Viewport size handling
- Print vs screen media
- Color scheme detection

### 8. **Templates** (`templates`)
- Header templates with variables
- Footer templates with page numbers
- Variable substitution

### 9. **Cache & Security** (`cache-csp`)
- Cache headers
- Content Security Policy
- Compression handling

### 10. **Image Capture** (`image`)
- PNG/JPEG output
- Element clipping
- Transparent backgrounds
- Quality settings

### 11. **Redirects** (`redirects`)
- HTTP redirect chains
- Delayed redirects
- Redirect loop detection

### 12. **Resources** (`resources`)
- Slow loading resources
- Large files
- Missing resources (404s)
- Performance testing

## 📁 Output Organization

Generated files use descriptive names that encode test parameters:

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
├── images/                  # PNG/JPEG outputs
├── logs/                    # Test execution logs
└── reports/                 # Test result reports
    ├── summary-report_20250921-143000.html
    ├── detailed-results_20250921-143000.json
    └── failed-tests_20250921-143000.md
```

## ⚙️ Configuration

### Test Configuration (`config/test-config.json`)

```json
{
  "mockServer": {
    "url": "http://localhost:4000",
    "healthCheckTimeout": 5000
  },
  "execution": {
    "parallelism": 4,
    "timeout": 30000,
    "retries": 2
  },
  "output": {
    "baseDir": "./output",
    "keepArtifacts": true
  }
}
```

### Parameter Matrix (`config/parameter-matrix.json`)

Defines parameter combinations for each test suite:

```json
{
  "basic": {
    "format": ["A4", "Letter", "A3"],
    "orientation": ["portrait", "landscape"],
    "margins": ["1in", "2cm", "none"]
  },
  "print": {
    "format": ["A4", "Letter", "A3", "A5", "Legal"],
    "scale": [0.5, 1.0, 1.5, 2.0],
    "quality": ["low", "medium", "high"]
  }
}
```

## 📈 Reports

The framework generates multiple report formats:

### HTML Report
Visual dashboard with test results, grouped by feature, with pass/fail status and links to generated files.

### JSON Report
Machine-readable format for programmatic analysis and CI/CD integration.

### CSV Report
Tabular data suitable for spreadsheet analysis and data processing.

### Failed Tests Report
Markdown report focusing on failures with recommendations for fixes.

## 🔧 Advanced Usage

### Custom Test Parameters

```bash
# Test specific formats across all suites
yarn mockserver-test:format A4,Letter

# Test with custom server URL
yarn mockserver-test:all --server=http://localhost:3000

# Continue testing after failures
yarn mockserver-test:all --continue-on-error

# Verbose output with detailed logging
yarn mockserver-test:all --verbose
```

### Parallel Execution

```bash
# Increase parallelism for faster execution
yarn mockserver-test:all --parallel=8

# Reduce parallelism for resource-constrained systems
yarn mockserver-test:all --parallel=2
```

### Custom Wait Strategies

```bash
# Wait for specific element
yarn mockserver-test:single dynamic/delay-content --wait-for="selector:#content"

# Wait for network idle
yarn mockserver-test:single dynamic/network-idle --wait-for="networkidle2"

# Custom timeout
yarn mockserver-test:single basic/simple-html --timeout=60000
```

### Authentication Testing

```bash
# Basic authentication
yarn mockserver-test:single auth/basic \\
  --headers='{"Authorization": "Basic dXNlcjpwYXNz"}'

# Bearer token
yarn mockserver-test:single auth/bearer \\
  --headers='{"Authorization": "Bearer abc123"}'

# Custom headers
yarn mockserver-test:single auth/custom \\
  --headers='{"X-API-Key": "secret", "X-Version": "1.0"}'
```

## 🚨 Troubleshooting

### Mock Server Not Running
```bash
# Verify server status
yarn mockserver-test:verify

# Start server manually
yarn mockserver:start

# Check health
yarn mockserver:health
```

### Test Failures
```bash
# Run with verbose output for debugging
yarn mockserver-test:single basic/simple-html --verbose

# Check failed tests report
cat output/reports/failed-tests-*.md

# Clean old outputs that might cause conflicts
yarn clean
```

### Performance Issues
```bash
# Reduce parallelism
yarn mockserver-test:all --parallel=1

# Use quick mode for faster testing
yarn mockserver-test:all --quick

# Run smoke tests only
yarn mockserver-test:smoke
```

## 🤝 Contributing

### Adding New Test Cases

1. **Create test case** in appropriate test suite file:
```javascript
// test-suites/basic/basic-test-suite.js
{
  name: 'new-test-case',
  endpoint: '/new/endpoint',
  parameterMatrix: {
    format: ['A4', 'Letter'],
    quality: ['medium', 'high']
  },
  expectedBehavior: 'success',
  manualChecks: [
    'Feature works correctly',
    'Output is properly formatted'
  ]
}
```

2. **Add parameters** to matrix configuration:
```json
// config/parameter-matrix.json
{
  "basic": {
    "newParameter": ["value1", "value2"]
  }
}
```

3. **Test the new case**:
```bash
yarn mockserver-test:single basic/new-test-case
```

### Framework Development

The framework is built with a modular architecture:

- **`framework/`** - Core testing engine
- **`test-suites/`** - Test case definitions
- **`scripts/`** - Command-line interfaces
- **`config/`** - Configuration files
- **`output/`** - Generated test artifacts

## 📄 License

This testing framework is part of the Printeer project and follows the same license terms.

## 🔗 Links

- [Printeer Project](https://github.com/maniartech/printeer)
- [Mock Server Documentation](../mock-server/README.md)
- [Test Case Design Document](../mock-server/printeer-mock-test-cases.md)