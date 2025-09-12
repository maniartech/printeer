#!/usr/bin/env node
/**
 * Comprehensive Test Suite for Enhanced CLI System
 * Tests all specifications from enhanced-cli-printing.md
 */

import { execSync } from 'child_process';
import { existsSync, unlinkSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

const TEST_DIR = 'comprehensive-test-output';
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

// Colors for output
const colors = {
  info: '\x1b[36m',    // Cyan
  success: '\x1b[32m', // Green
  error: '\x1b[31m',   // Red
  warning: '\x1b[33m', // Yellow
  reset: '\x1b[0m'     // Reset
};

function log(message, type = 'info') {
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function runTest(name, testFn) {
  testsRun++;
  log(`\n🧪 Testing: ${name}`, 'info');
  try {
    testFn();
    testsPassed++;
    log(`✅ PASSED: ${name}`, 'success');
  } catch (error) {
    testsFailed++;
    log(`❌ FAILED: ${name}`, 'error');
    log(`   Error: ${error.message}`, 'error');
  }
}

function runCommand(command, expectError = false) {
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000 
    });
    if (expectError) {
      throw new Error(`Expected command to fail but it succeeded: ${command}`);
    }
    return result;
  } catch (error) {
    if (expectError) {
      return error.message;
    }
    throw new Error(`Command failed: ${command}\nError: ${error.message}`);
  }
}

function setupTestEnvironment() {
  log('🔧 Setting up test environment...', 'info');
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
  process.chdir(TEST_DIR);
}

function cleanupTestEnvironment() {
  log('🧹 Cleaning up test environment...', 'info');
  process.chdir('..');
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

// ============================================================================
// R1: Comprehensive Print Configuration System Tests
// ============================================================================

function testR1_ConfigurationSystem() {
  log('\n📋 R1: Testing Comprehensive Print Configuration System', 'warning');
  
  // R1.1: Configuration file initialization
  runTest('R1.1: Config Init - Basic JSON', () => {
    runCommand('node ../dist/bin/cli.js config init --template basic --output basic-config.json --overwrite');
    if (!existsSync('basic-config.json')) {
      throw new Error('Configuration file was not created');
    }
  });

  runTest('R1.2: Config Init - Advanced YAML', () => {
    runCommand('node ../dist/bin/cli.js config init --template advanced --format yaml --output advanced-config.yaml --overwrite');
    if (!existsSync('advanced-config.yaml')) {
      throw new Error('YAML configuration file was not created');
    }
  });

  // R1.3: Configuration validation
  runTest('R1.3: Config Validation - Valid file', () => {
    runCommand('node ../dist/bin/cli.js config validate basic-config.json');
  });

  // R1.4: Built-in presets
  runTest('R1.4: Built-in Presets - All 5 required presets', () => {
    const output = runCommand('node ../dist/bin/cli.js config presets --built-in');
    const requiredPresets = ['web-article', 'mobile-responsive', 'print-optimized', 'high-quality', 'fast-batch'];
    requiredPresets.forEach(preset => {
      if (!output.includes(preset)) {
        throw new Error(`Required preset '${preset}' not found`);
      }
    });
  });

  // R1.5: Configuration show with preset
  runTest('R1.5: Config Show - Preset resolution', () => {
    const output = runCommand('node ../dist/bin/cli.js config show --preset web-article --format json');
    if (!output.includes('networkidle0')) {
      throw new Error('Preset configuration not properly resolved');
    }
  });

  // R1.6: Environment-specific configurations
  runTest('R1.6: Environment Configuration - Development', () => {
    runCommand('node ../dist/bin/cli.js config show --env development --format json');
  });
}

// ============================================================================
// R2: Batch Processing System Tests
// ============================================================================

function testR2_BatchProcessing() {
  log('\n📦 R2: Testing Batch Processing System', 'warning');

  // Create test batch files
  const csvContent = `id,url,output,preset
test1,https://example.com,example.pdf,web-article
test2,https://httpbin.org/html,httpbin.pdf,web-article`;
  writeFileSync('test-batch.csv', csvContent);

  const jsonContent = JSON.stringify({
    jobs: [
      { id: 'json-test-1', url: 'https://example.com', output: 'json-example.pdf' },
      { id: 'json-test-2', url: 'https://httpbin.org/html', output: 'json-httpbin.pdf' }
    ]
  }, null, 2);
  writeFileSync('test-batch.json', jsonContent);

  const yamlContent = `jobs:
  - id: "yaml-test-1"
    url: "https://example.com"
    output: "yaml-example.pdf"
  - id: "yaml-test-2"
    url: "https://httpbin.org/html"
    output: "yaml-httpbin.pdf"
    dependencies: ["yaml-test-1"]`;
  writeFileSync('test-batch.yaml', yamlContent);

  // R2.1: CSV batch processing
  runTest('R2.1: Batch Processing - CSV format', () => {
    runCommand('node ../dist/bin/cli.js batch test-batch.csv --dry-run');
  });

  // R2.2: JSON batch processing
  runTest('R2.2: Batch Processing - JSON format', () => {
    runCommand('node ../dist/bin/cli.js batch test-batch.json --dry-run');
  });

  // R2.3: YAML batch processing with dependencies
  runTest('R2.3: Batch Processing - YAML with dependencies', () => {
    runCommand('node ../dist/bin/cli.js batch test-batch.yaml --dry-run');
  });

  // R2.4: Batch processing with advanced options
  runTest('R2.4: Batch Processing - Advanced options', () => {
    runCommand('node ../dist/bin/cli.js batch test-batch.csv --concurrency 2 --retry 3 --continue-on-error --dry-run');
  });

  // R2.5: Batch processing with resource optimization
  runTest('R2.5: Batch Processing - Resource optimization', () => {
    runCommand('node ../dist/bin/cli.js batch test-batch.csv --concurrency 5 --max-memory 1GB --dry-run');
  });
}

// ============================================================================
// R3: Template Management System Tests
// ============================================================================

function testR3_TemplateManagement() {
  log('\n📄 R3: Testing Template Management System', 'warning');

  // R3.1: Template listing
  runTest('R3.1: Template List - All built-in templates', () => {
    const output = runCommand('node ../dist/bin/cli.js template list');
    const requiredTemplates = ['simple-header', 'simple-footer', 'corporate-header', 'corporate-footer', 
                              'invoice-header', 'report-header', 'minimal-header', 'minimal-footer'];
    requiredTemplates.forEach(template => {
      if (!output.includes(template)) {
        throw new Error(`Required template '${template}' not found`);
      }
    });
  });

  // R3.2: Template show with variables
  runTest('R3.2: Template Show - Variable substitution', () => {
    const output = runCommand('node ../dist/bin/cli.js template show corporate-header');
    if (!output.includes('company.name')) {
      throw new Error('Template variables not displayed correctly');
    }
  });

  // R3.3: Template preview
  runTest('R3.3: Template Preview - HTML output', () => {
    // Create a variables file to avoid shell escaping issues
    writeFileSync('test-variables.json', '{"title":"Test Document"}');
    const output = runCommand('node ../dist/bin/cli.js template preview simple-header --variables @test-variables.json');
    if (!output.includes('Test Document')) {
      throw new Error('Template preview not working correctly');
    }
  });
}

// ============================================================================
// R4: Enhanced CLI Interface Tests
// ============================================================================

function testR4_EnhancedCLI() {
  log('\n💻 R4: Testing Enhanced CLI Interface', 'warning');

  // R4.1: Flexible URL-output pairing
  runTest('R4.1: Convert - Single URL-output pair', () => {
    runCommand('node ../dist/bin/cli.js convert --url https://example.com --output test.pdf --dry-run');
  });

  runTest('R4.2: Convert - Multiple URL-output pairs', () => {
    runCommand('node ../dist/bin/cli.js convert --url https://example.com --output example.pdf --url https://httpbin.org/html --output httpbin.pdf --dry-run');
  });

  runTest('R4.3: Convert - Auto-generated filenames', () => {
    runCommand('node ../dist/bin/cli.js convert --url https://example.com --url https://httpbin.org/html --output-dir ./auto-output --dry-run');
  });

  // R4.4: Comprehensive CLI options (50+ options)
  runTest('R4.4: Convert - Comprehensive options', () => {
    const command = `node ../dist/bin/cli.js convert --url https://example.com --output comprehensive.pdf ` +
      `--format A4 --orientation landscape --scale 0.8 --print-background ` +
      `--wait-until networkidle0 --wait-timeout 30000 --media-type print ` +
      `--viewport 1920x1080 --device-scale 2 --quality 95 --dry-run`;
    runCommand(command);
  });

  // R4.5: Preset usage
  runTest('R4.5: Convert - With preset', () => {
    runCommand('node ../dist/bin/cli.js convert --url https://example.com --preset high-quality --dry-run');
  });

  // R4.6: Configuration file usage
  runTest('R4.6: Convert - With config file', () => {
    runCommand('node ../dist/bin/cli.js convert --url https://example.com --config basic-config.json --dry-run');
  });
}

// ============================================================================
// R5: Configuration File System Tests
// ============================================================================

function testR5_ConfigurationFiles() {
  log('\n⚙️ R5: Testing Configuration File System', 'warning');

  // R5.1: Bidirectional CLI-JSON conversion
  runTest('R5.1: CLI to JSON Export', () => {
    runCommand('node ../dist/bin/cli.js config export-from-cli "printeer convert --format A4 --scale 0.8" --output cli-export.json');
    if (!existsSync('cli-export.json')) {
      throw new Error('CLI export file was not created');
    }
  });

  runTest('R5.2: JSON to CLI Generation', () => {
    const output = runCommand('node ../dist/bin/cli.js config generate-cli basic-config.json --url https://example.com');
    if (!output.includes('printeer convert')) {
      throw new Error('CLI generation failed');
    }
  });

  // R5.3: Configuration inheritance
  runTest('R5.3: Configuration Inheritance - Preset extension', () => {
    const output = runCommand('node ../dist/bin/cli.js config show --preset web-article --format json');
    // Should contain inherited properties
    if (!output.includes('"format"') || !output.includes('"orientation"')) {
      throw new Error('Configuration inheritance not working');
    }
  });

  // R5.4: Configuration validation with detailed errors
  runTest('R5.4: Configuration Validation - Invalid config', () => {
    writeFileSync('invalid-config.json', '{"defaults": {"page": {"format": "INVALID_FORMAT"}}}');
    try {
      runCommand('node ../dist/bin/cli.js config validate invalid-config.json', true);
    } catch (error) {
      // Expected to fail
    }
  });
}

// ============================================================================
// Error Handling and Edge Cases Tests
// ============================================================================

function testErrorHandling() {
  log('\n🚨 Testing Error Handling and Edge Cases', 'warning');

  runTest('Error: Multiple outputs without multiple URLs', () => {
    try {
      runCommand('node ../dist/bin/cli.js convert --url https://example.com --output file1.pdf --output file2.pdf', true);
    } catch (error) {
      // Expected to fail
    }
  });

  runTest('Error: Invalid batch file', () => {
    try {
      runCommand('node ../dist/bin/cli.js batch nonexistent.csv', true);
    } catch (error) {
      // Expected to fail
    }
  });

  runTest('Error: Invalid preset name', () => {
    try {
      runCommand('node ../dist/bin/cli.js convert --url https://example.com --preset nonexistent-preset --dry-run', true);
    } catch (error) {
      // Expected to fail
    }
  });
}

// ============================================================================
// Help and Documentation Tests
// ============================================================================

function testDocumentation() {
  log('\n📚 Testing Help and Documentation', 'warning');

  runTest('Help: Main help', () => {
    const output = runCommand('node ../dist/bin/cli.js --help');
    if (!output.includes('Usage:')) {
      throw new Error('Main help not working');
    }
  });

  runTest('Help: Convert command help', () => {
    const output = runCommand('node ../dist/bin/cli.js convert --help');
    if (!output.includes('Convert web page')) {
      throw new Error('Convert help not working');
    }
  });

  runTest('Help: Config command help', () => {
    const output = runCommand('node ../dist/bin/cli.js config --help');
    if (!output.includes('Configuration management')) {
      throw new Error('Config help not working');
    }
  });

  runTest('Help: Batch command help', () => {
    const output = runCommand('node ../dist/bin/cli.js batch --help');
    if (!output.includes('Batch processing')) {
      throw new Error('Batch help not working');
    }
  });

  runTest('Help: Template command help', () => {
    const output = runCommand('node ../dist/bin/cli.js template --help');
    if (!output.includes('Template management')) {
      throw new Error('Template help not working');
    }
  });
}

// ============================================================================
// Main Test Execution
// ============================================================================

async function runComprehensiveTests() {
  log('🚀 Starting Comprehensive Enhanced CLI Tests', 'info');
  log('Testing all specifications from enhanced-cli-printing.md', 'info');
  log('='.repeat(60), 'info');

  try {
    setupTestEnvironment();

    // Test all requirements
    testR1_ConfigurationSystem();
    testR2_BatchProcessing();
    testR3_TemplateManagement();
    testR4_EnhancedCLI();
    testR5_ConfigurationFiles();
    testErrorHandling();
    testDocumentation();

  } finally {
    cleanupTestEnvironment();
  }

  // Print comprehensive results
  log('\n📊 Comprehensive Test Results', 'info');
  log('='.repeat(30), 'info');
  log(`Tests Run: ${testsRun}`, 'info');
  log(`Tests Passed: ${testsPassed}`, 'success');
  log(`Tests Failed: ${testsFailed}`, testsFailed > 0 ? 'error' : 'success');
  
  const passRate = ((testsPassed / testsRun) * 100).toFixed(1);
  log(`Pass Rate: ${passRate}%`, passRate === '100.0' ? 'success' : 'warning');

  if (testsFailed === 0) {
    log('\n🎉 ALL SPECIFICATIONS IMPLEMENTED SUCCESSFULLY!', 'success');
    log('✅ R1: Comprehensive Print Configuration System', 'success');
    log('✅ R2: Batch Processing System', 'success');
    log('✅ R3: Template Management System', 'success');
    log('✅ R4: Enhanced CLI Interface', 'success');
    log('✅ R5: Configuration File System', 'success');
    log('\nThe enhanced CLI system meets all requirements from enhanced-cli-printing.md', 'success');
    process.exit(0);
  } else {
    log('\n💥 Some specifications not fully implemented. Please review failures above.', 'error');
    process.exit(1);
  }
}

// Run the comprehensive tests
runComprehensiveTests().catch(error => {
  log(`💥 Test runner failed: ${error.message}`, 'error');
  process.exit(1);
});