#!/bin/bash

# Enhanced CLI Test Script
# Comprehensive testing of the enhanced Printeer CLI system

echo "🎯 Testing Enhanced Printeer CLI System"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_exit_code="${3:-0}"
    
    echo -e "\n${BLUE}Testing: $test_name${NC}"
    echo "Command: $command"
    
    if eval "$command" > /dev/null 2>&1; then
        local exit_code=$?
        if [ $exit_code -eq $expected_exit_code ]; then
            echo -e "${GREEN}✓ PASSED${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${RED}✗ FAILED (exit code: $exit_code, expected: $expected_exit_code)${NC}"
            ((TESTS_FAILED++))
        fi
    else
        echo -e "${RED}✗ FAILED (command execution error)${NC}"
        ((TESTS_FAILED++))
    fi
}

# Function to run test with output check
run_test_with_output() {
    local test_name="$1"
    local command="$2"
    local expected_pattern="$3"
    
    echo -e "\n${BLUE}Testing: $test_name${NC}"
    echo "Command: $command"
    
    local output=$(eval "$command" 2>&1)
    if echo "$output" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED (output doesn't match pattern: $expected_pattern)${NC}"
        echo "Actual output: $output"
        ((TESTS_FAILED++))
    fi
}

# Create test directory
mkdir -p test-output
cd test-output

echo -e "\n${YELLOW}1. Configuration Management Tests${NC}"
echo "================================="

# Test configuration initialization
run_test "Config Init - Basic JSON" \
    "node ../dist/bin/cli.js config init --template basic --output basic-config.json --overwrite"

run_test "Config Init - Advanced YAML" \
    "node ../dist/bin/cli.js config init --template advanced --format yaml --output advanced-config.yaml --overwrite"

# Test configuration validation
run_test "Config Validation - Valid file" \
    "node ../dist/bin/cli.js config validate basic-config.json"

# Test preset listing
run_test_with_output "Config Presets - List built-in" \
    "node ../dist/bin/cli.js config presets --built-in" \
    "web-article.*built-in"

# Test configuration show
run_test_with_output "Config Show - Default preset" \
    "node ../dist/bin/cli.js config show --preset web-article --format json" \
    "networkidle0"

echo -e "\n${YELLOW}2. Template Management Tests${NC}"
echo "============================"

# Test template listing
run_test_with_output "Template List - All templates" \
    "node ../dist/bin/cli.js template list" \
    "simple-header.*built-in"

# Test template show
run_test_with_output "Template Show - Corporate header" \
    "node ../dist/bin/cli.js template show corporate-header" \
    "company.name"

echo -e "\n${YELLOW}3. CLI-JSON Bidirectional Mapping Tests${NC}"
echo "========================================"

# Test CLI to JSON export
run_test "CLI Export - Basic options" \
    "node ../dist/bin/cli.js config export-from-cli 'printeer convert --format A4 --scale 0.8' --output cli-export.json"

# Test JSON to CLI generation
run_test_with_output "CLI Generation - From JSON" \
    "node ../dist/bin/cli.js config generate-cli basic-config.json --url https://example.com" \
    "printeer convert"

echo -e "\n${YELLOW}4. Enhanced Convert Command Tests${NC}"
echo "=================================="

# Test single URL dry run
run_test "Convert - Single URL dry run" \
    "node ../dist/bin/cli.js convert --url https://example.com --output test.pdf --dry-run"

# Test multiple URLs dry run
run_test "Convert - Multiple URLs dry run" \
    "node ../dist/bin/cli.js convert --url https://example.com --url https://httpbin.org/html --output-dir ./multi-test --dry-run"

# Test with preset
run_test "Convert - With preset dry run" \
    "node ../dist/bin/cli.js convert --url https://example.com --preset high-quality --dry-run"

# Test with comprehensive options
run_test "Convert - Comprehensive options dry run" \
    "node ../dist/bin/cli.js convert --url https://example.com --format A4 --orientation landscape --scale 0.8 --print-background --wait-until networkidle0 --dry-run"

echo -e "\n${YELLOW}5. Batch Processing Tests${NC}"
echo "========================="

# Create test batch files
cat > test-batch.csv << EOF
id,url,output,preset
test1,https://example.com,example.pdf,web-article
test2,https://httpbin.org/html,httpbin.pdf,web-article
EOF

cat > test-batch.json << EOF
{
  "jobs": [
    {
      "id": "json-test-1",
      "url": "https://example.com",
      "output": "json-example.pdf"
    },
    {
      "id": "json-test-2", 
      "url": "https://httpbin.org/html",
      "output": "json-httpbin.pdf"
    }
  ]
}
EOF

cat > test-batch.yaml << EOF
jobs:
  - id: "yaml-test-1"
    url: "https://example.com"
    output: "yaml-example.pdf"
  - id: "yaml-test-2"
    url: "https://httpbin.org/html"
    output: "yaml-httpbin.pdf"
    dependencies: ["yaml-test-1"]
EOF

# Test batch processing
run_test "Batch - CSV dry run" \
    "node ../dist/bin/cli.js batch test-batch.csv --dry-run"

run_test "Batch - JSON dry run" \
    "node ../dist/bin/cli.js batch test-batch.json --dry-run"

run_test "Batch - YAML dry run" \
    "node ../dist/bin/cli.js batch test-batch.yaml --dry-run"

# Test batch with options
run_test "Batch - With options dry run" \
    "node ../dist/bin/cli.js batch test-batch.csv --concurrency 2 --retry 3 --continue-on-error --dry-run"

echo -e "\n${YELLOW}6. Error Handling Tests${NC}"
echo "======================="

# Test invalid URL count
run_test "Error - Too many outputs" \
    "node ../dist/bin/cli.js convert --url https://example.com --output file1.pdf --output file2.pdf" \
    1

# Test invalid batch file
run_test "Error - Invalid batch file" \
    "node ../dist/bin/cli.js batch nonexistent.csv" \
    1

# Test invalid configuration - use a config file with invalid structure
echo '{"defaults": {"page": {"format": "INVALID_FORMAT"}}}' > invalid-config.json
run_test "Error - Invalid config validation" \
    "node ../dist/bin/cli.js config validate invalid-config.json" \
    1

echo -e "\n${YELLOW}7. Help and Documentation Tests${NC}"
echo "==============================="

# Test help commands
run_test "Help - Main help" \
    "node ../dist/bin/cli.js --help"

run_test "Help - Convert help" \
    "node ../dist/bin/cli.js convert --help"

run_test "Help - Config help" \
    "node ../dist/bin/cli.js config --help"

run_test "Help - Batch help" \
    "node ../dist/bin/cli.js batch --help"

run_test "Help - Template help" \
    "node ../dist/bin/cli.js template --help"

# Cleanup
cd ..
rm -rf test-output

# Final results
echo -e "\n${YELLOW}Test Results Summary${NC}"
echo "===================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Enhanced CLI system is working correctly.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please review the output above.${NC}"
    exit 1
fi