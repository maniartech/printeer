# CLI Tests TODO - Failing Tests to Fix

## Current Status: 29 failing tests across 6 test files

### ✅ COMPLETED: batch.test.ts (10/10 tests passing)
All batch tests have been fixed and are working correctly.

---

## 🔴 FAILING TESTS TO FIX:

### 1. batch.test.ts (3 failing tests)
- [ ] **should process CSV batch file** - Exit code 1, no stderr output
- [ ] **should process JSON batch file** - Exit code 1, no stderr output  
- [ ] **should process YAML batch file** - Exit code 1, no stderr output

### 2. config.test.ts (4 failing tests)
- [ ] **should override config file with CLI options** - Exit code 1, no stderr output
- [ ] **should find printeer.config.json automatically** - Exit code 1, no stderr output
- [ ] **should handle config with presets** - "Invalid configuration file" error
- [ ] **should handle config with environment variables** - Exit code 1, no stderr output

### 3. convert-basic.test.ts (3 failing tests)
- [ ] **should convert simple HTML page to PDF** - Timeout issue (27455ms > 15000ms max)
- [ ] **should convert to different page formats** - Exit code 1, no stderr output
- [ ] **should handle orientation options** - Exit code 1, no stderr output

### 4. convert-enhanced.test.ts (4 failing tests)
- [ ] **should handle device emulation options** - Exit code 1, no stderr output
- [ ] **should handle media type emulation** - Exit code 1, no stderr output
- [ ] **should handle custom headers** - JSON parsing error: "Expected property name or '}' in JSON at position 1"
- [ ] **should handle cookies** - JSON parsing error: "Expected property name or '}' in JSON at position 1"

### 5. doctor.test.ts (11 failing tests)
- [ ] **should run basic system diagnostics** - Exit code 1, no stderr/stdout
- [ ] **should check Node.js version** - Exit code 1, no stderr/stdout
- [ ] **should test PDF generation capabilities** - Exit code 1, no stderr/stdout
- [ ] **should check Chrome/Chromium installation** - Exit code 1, no stderr/stdout
- [ ] **should generate comprehensive diagnostics report** - Exit code 1, no stderr/stdout
- [ ] **should check for common configuration issues** - Only shows JSON trace output, missing "Doctor summary"
- [ ] **should validate proxy settings** - Only shows JSON trace output, missing "Doctor summary"
- [ ] **should check available disk space** - Exit code 1 with JSON trace output
- [ ] **should provide exit codes for different issues** - Missing "All checks passed" message

### 6. errors.test.ts (4 failing tests)
- [ ] **should handle invalid margin values** - Test expects "Invalid margin" error but conversion succeeds
- [ ] **should handle invalid custom page size** - Test expects "Invalid custom size format" error but conversion succeeds
- [ ] **should handle wait selector that never appears** - Test expects "Timeout waiting for selector" error but conversion succeeds
- [ ] **should validate output file extension** - Test expects "Output file must have .pdf extension" error but conversion succeeds

### 7. templates.test.ts (3 failing tests)
- [ ] **should use custom header template** - Exit code 1, no stderr output
- [ ] **should use custom footer template** - Exit code 1, no stderr output
- [ ] **should use both header and footer templates** - Exit code 1, no stderr output

---

## 📋 ANALYSIS SUMMARY:

### Common Issues Identified:
1. **Silent failures** - Many tests fail with exit code 1 but no error output
2. **JSON parsing errors** - Headers/cookies tests have malformed JSON
3. **Missing error validation** - Error tests succeed when they should fail
4. **Doctor command issues** - Only outputs JSON trace instead of formatted summary
5. **Template processing failures** - Template-related commands failing silently
6. **Configuration loading problems** - Config file processing issues

### Priority Order for Fixes:
1. **High Priority**: doctor.test.ts (11 tests) - Core functionality
2. **High Priority**: errors.test.ts (4 tests) - Error handling validation
3. **Medium Priority**: convert-enhanced.test.ts (4 tests) - Advanced features
4. **Medium Priority**: config.test.ts (4 tests) - Configuration management
5. **Medium Priority**: convert-basic.test.ts (3 tests) - Basic conversion
6. **Medium Priority**: templates.test.ts (3 tests) - Template functionality
7. **Low Priority**: batch.test.ts (3 tests) - Regression issues after autofix

---

## 🎯 NEXT STEPS:
1. Start with doctor.test.ts - fix the JSON trace output issue
2. Move to errors.test.ts - implement proper error validation
3. Fix JSON parsing issues in convert-enhanced.test.ts
4. Address configuration loading in config.test.ts
5. Fix basic conversion issues in convert-basic.test.ts
6. Resolve template processing in templates.test.ts
7. Re-verify batch.test.ts after other fixes

Total remaining: **29 failing tests** across **7 test files**