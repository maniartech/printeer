# Enhanced CLI Demonstration

This document demonstrates the comprehensive enhanced CLI printing system implemented for Printeer.

## Features Implemented

### ✅ 1. Enhanced Configuration System
- **JSON/YAML Configuration Files**: Support for comprehensive configuration with schema validation
- **Environment-Specific Overrides**: Development, production, and custom environment configurations
- **Preset Management**: Built-in and custom presets for common use cases
- **Configuration Validation**: Schema-based validation with detailed error reporting

### ✅ 2. Flexible URL-Output Pairing
- **Multiple URL Processing**: Process multiple URLs in a single command
- **Intelligent Filename Generation**: Auto-generate filenames from webpage titles
- **Flexible Output Patterns**: Custom naming patterns with variables
- **Conflict Resolution**: Multiple strategies for handling existing files

### ✅ 3. Comprehensive Batch Processing
- **Multiple File Formats**: Support for CSV, JSON, and YAML batch files
- **Job Dependencies**: Define job execution order with dependency management
- **Variable Substitution**: Dynamic content generation with template variables
- **Progress Tracking**: Real-time progress monitoring and reporting

### ✅ 4. Professional Template System
- **Built-in Templates**: 8 professional templates for headers and footers
- **Variable Substitution**: Dynamic content with nested object support
- **Template Categories**: Corporate, simple, minimal, invoice, and report templates
- **Template Validation**: Syntax and structure validation

### ✅ 5. Bidirectional Configuration Mapping
- **CLI ↔ JSON Conversion**: Perfect compatibility between CLI options and JSON configs
- **Configuration Export**: Export CLI commands as JSON/YAML configurations
- **CLI Generation**: Generate CLI commands from JSON/YAML configurations
- **Equivalence Validation**: Verify CLI and JSON produce identical results

## Command Examples

### Basic Conversion
```bash
# Single URL with automatic filename
printeer convert --url https://example.com

# Multiple URLs with mixed outputs
printeer convert \
  --url https://example.com --output example.pdf \
  --url https://github.com \
  --url https://stackoverflow.com --output stack.png
```

### Advanced Configuration
```bash
# Use preset with CLI overrides
printeer convert \
  --url https://example.com \
  --preset high-quality \
  --scale 1.2 \
  --print-background \
  --header-template corporate-header
```

### Batch Processing
```bash
# Process CSV batch file
printeer batch examples/batch-jobs.csv --concurrency 3 --progress

# Process YAML batch with custom output
printeer batch examples/batch-jobs.yaml \
  --output-dir ./reports \
  --report-file batch-report.json
```

### Configuration Management
```bash
# Initialize configuration
printeer config init --template advanced --format yaml

# List available presets
printeer config presets

# Show resolved configuration
printeer config show --preset high-quality --env production

# Export CLI to JSON
printeer config export-from-cli \
  "printeer convert --format A4 --scale 0.8" \
  --output exported-config.json
```

### Template Management
```bash
# List available templates
printeer template list

# Show template content
printeer template show corporate-header \
  --variables '{"company":{"name":"Acme Corp"}}'
```

## Configuration Examples

### Basic Configuration (printeer.config.json)
```json
{
  "$schema": "./node_modules/printeer/schemas/config.schema.json",
  "defaults": {
    "page": {
      "format": "A4",
      "orientation": "portrait"
    },
    "pdf": {
      "printBackground": true,
      "scale": 0.8
    }
  }
}
```

### Advanced Configuration with Environments
```yaml
defaults: &defaults
  page:
    format: A4
    orientation: portrait
  pdf:
    printBackground: true
    scale: 0.8

environments:
  development:
    <<: *defaults
    performance:
      cacheEnabled: false
  
  production:
    <<: *defaults
    pdf:
      generateTaggedPDF: true
    performance:
      retryAttempts: 3

presets:
  invoice:
    pdf:
      headerTemplate: "invoice-header"
      displayHeaderFooter: true
```

## Batch File Examples

### CSV Format
```csv
id,url,output,preset,priority
invoice-001,https://example.com/invoice/1,invoices/invoice-001.pdf,invoice,1
screenshot-home,https://example.com,screenshots/homepage.png,screenshot,2
```

### YAML Format with Dependencies
```yaml
jobs:
  - id: "homepage"
    url: "https://example.com"
    output: "reports/homepage.pdf"
    preset: "web-article"
    priority: 1
  
  - id: "about-page"
    url: "https://example.com/about"
    output: "reports/about.pdf"
    dependencies: ["homepage"]
```

## Built-in Presets

1. **web-article**: Standard web page conversion
2. **mobile-responsive**: Mobile device emulation
3. **print-optimized**: Print media type optimization
4. **high-quality**: Maximum quality settings
5. **fast-batch**: Performance-optimized for batch processing

## Built-in Templates

1. **simple-header/footer**: Basic page information
2. **corporate-header/footer**: Professional business documents
3. **invoice-header**: Invoice-specific formatting
4. **report-header**: Report-specific formatting
5. **minimal-header/footer**: Minimal page information

## Architecture Benefits

### 🚀 Performance Optimizations
- **Resource-Aware Processing**: Dynamic concurrency based on system resources
- **Browser Pool Management**: Efficient browser instance reuse
- **Intelligent Cleanup**: Automatic temporary file and memory management

### 🔧 Developer Experience
- **100% CLI-JSON Compatibility**: Seamless conversion between formats
- **Comprehensive Validation**: Schema-based validation with helpful error messages
- **Flexible Configuration**: Multiple inheritance levels and override capabilities

### 📊 Enterprise Features
- **Batch Processing**: Handle hundreds of URLs efficiently
- **Progress Tracking**: Real-time monitoring and reporting
- **Error Handling**: Robust error recovery and retry mechanisms
- **Template System**: Professional document formatting

## Testing the Implementation

All features have been successfully implemented and tested:

1. ✅ Configuration system with validation
2. ✅ Multiple URL processing with intelligent naming
3. ✅ Batch processing with CSV/JSON/YAML support
4. ✅ Template system with 8 built-in templates
5. ✅ Bidirectional CLI-JSON mapping
6. ✅ Comprehensive CLI commands and options

The enhanced CLI system transforms Printeer into a professional-grade web-to-print solution suitable for enterprise use cases while maintaining backward compatibility with the existing simple CLI interface.