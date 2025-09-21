#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PORT = 4000;
const BASE_URL = process.env.MOCK_BASE_URL || `http://localhost:${DEFAULT_PORT}`;

// Routes that are expected to fail (error pages)
const EXPECTED_ERROR_ROUTES = new Set([
  '/error/500',
  '/error/timeout',
  '/error/reset',
  '/error/flaky',
  '/assets/missing'
]);

// Routes that are expected to return authentication errors (401/403)
const EXPECTED_AUTH_ERROR_ROUTES = new Set([
  '/auth/basic',
  '/auth/bearer',
  '/auth/login',
  '/auth/protected'
]);

// Routes that are expected to fail due to connection issues (infinite redirects, etc.)
const EXPECTED_CONNECTION_ERROR_ROUTES = new Set([
  '/redirect/loop'
]);

// Routes that are not yet implemented (missing templates/routes) - should return 500
const UNIMPLEMENTED_ROUTES = new Set([
  // All previously unimplemented routes now have templates and should work
  // Add any new unimplemented routes here as needed
]);// Routes that might be slow (increase timeout)
const SLOW_ROUTES = new Set([
  '/error/timeout',
  '/spa/delay-content',
  '/spa/network-idle',
  '/spa/custom-ready',
  '/assets/slow.js',
  '/assets/slow.css',
  '/redirect/delay'
]);

async function loadCatalog() {
  try {
    const catalogPath = path.join(__dirname, '..', 'catalog.json');
    const catalogData = fs.readFileSync(catalogPath, 'utf-8');
    return JSON.parse(catalogData);
  } catch (error) {
    console.error('❌ Failed to load catalog.json:', error.message);
    process.exit(1);
  }
}

async function checkServerHealth() {
  try {
    const response = await fetch(`${BASE_URL}/__health`, {
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
    }

    const health = await response.json();
    console.log(`✅ Server health check passed (port: ${health.port})`);
    return true;
  } catch (error) {
    console.error(`❌ Server health check failed:`, error.message);
    return false;
  }
}

async function testRoute(route, group) {
  const fullUrl = `${BASE_URL}${route.path}`;
  const routePath = new URL(route.path, 'http://localhost').pathname;
  const isExpectedError = EXPECTED_ERROR_ROUTES.has(routePath) || route.path.includes('/error/');
  const isExpectedAuthError = EXPECTED_AUTH_ERROR_ROUTES.has(routePath);
  const isExpectedConnectionError = EXPECTED_CONNECTION_ERROR_ROUTES.has(routePath);
  const isUnimplemented = UNIMPLEMENTED_ROUTES.has(routePath);
  const isSlowRoute = SLOW_ROUTES.has(routePath) || route.path.includes('slow') || route.path.includes('delay');

  const timeout = isSlowRoute ? 15000 : 5000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(fullUrl, {
      signal: controller.signal,
      method: route.method || 'GET',
      headers: {
        'User-Agent': 'Printeer-HealthCheck/1.0'
      }
    });

    clearTimeout(timeoutId);

    if (isExpectedError) {
      if (response.status >= 400) {
        console.log(`✅ ${route.title} (${route.path}) - Expected error: ${response.status}`);
        return { success: true, expected: true, status: response.status };
      } else {
        console.log(`⚠️  ${route.title} (${route.path}) - Expected error but got: ${response.status}`);
        return { success: false, expected: true, status: response.status, message: 'Expected error but request succeeded' };
      }
    }

    if (isExpectedAuthError) {
      if (response.status === 401 || response.status === 403) {
        console.log(`✅ ${route.title} (${route.path}) - Expected auth error: ${response.status}`);
        return { success: true, expected: true, status: response.status };
      } else {
        console.log(`⚠️  ${route.title} (${route.path}) - Expected auth error but got: ${response.status}`);
        return { success: false, expected: true, status: response.status, message: 'Expected auth error but request succeeded' };
      }
    }

    if (isUnimplemented) {
      if (response.status === 500) {
        console.log(`✅ ${route.title} (${route.path}) - Expected 500 (unimplemented): ${response.status}`);
        return { success: true, expected: true, status: response.status };
      } else {
        console.log(`⚠️  ${route.title} (${route.path}) - Expected 500 but got: ${response.status}`);
        return { success: false, expected: true, status: response.status, message: 'Expected 500 but request succeeded' };
      }
    }

    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      const isHtml = contentType.includes('text/html');
      const isJson = contentType.includes('application/json');

      // Basic content validation for HTML pages
      if (isHtml) {
        const text = await response.text();
        if (text.length < 50) {
          console.log(`⚠️  ${route.title} (${route.path}) - HTML content seems too short (${text.length} chars)`);
          return { success: false, status: response.status, message: 'HTML content too short' };
        }
      }

      console.log(`✅ ${route.title} (${route.path}) - Status: ${response.status} (${contentType})`);
      return { success: true, status: response.status };
    } else {
      console.log(`❌ ${route.title} (${route.path}) - Status: ${response.status} ${response.statusText}`);
      return { success: false, status: response.status, message: response.statusText };
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`⏱️  ${route.title} (${route.path}) - Timeout after ${timeout}ms`);
      return { success: false, message: 'Timeout', timeout: true };
    }

    if ((isExpectedError || isExpectedConnectionError) && (error.code === 'ECONNRESET' || error.message.includes('reset') || error.message.includes('fetch failed'))) {
      console.log(`✅ ${route.title} (${route.path}) - Expected connection error: ${error.message}`);
      return { success: true, expected: true };
    }

    console.log(`❌ ${route.title} (${route.path}) - Error: ${error.message}`);
    return { success: false, message: error.message };
  }
}

async function testAllRoutes() {
  console.log(`🔍 Starting health check for ${BASE_URL}\n`);

  // Check server health first
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    console.error('\n❌ Server is not responding. Make sure the mock server is running.');
    process.exit(1);
  }

  console.log(''); // Empty line for readability

  const catalog = await loadCatalog();
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    expectedErrors: 0,
    groups: {}
  };

  // Test basic routes first
  console.log('🏠 Testing basic routes:');
  const basicRoutes = [
    { path: '/', title: 'Launcher Home' },
    { path: '/__catalog.json', title: 'Catalog JSON' },
    { path: '/__health', title: 'Health Endpoint' }
  ];

  for (const route of basicRoutes) {
    const result = await testRoute(route, { id: 'system', title: 'System' });
    results.total++;
    if (result.success) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  console.log(''); // Empty line

  // Test all catalog routes by group
  for (const group of catalog.groups || []) {
    console.log(`📂 Testing ${group.title} (${group.id}):`);

    results.groups[group.id] = {
      title: group.title,
      total: 0,
      passed: 0,
      failed: 0,
      expectedErrors: 0
    };

    for (const route of group.routes || []) {
      const result = await testRoute(route, group);

      results.total++;
      results.groups[group.id].total++;

      if (result.success) {
        results.passed++;
        results.groups[group.id].passed++;

        if (result.expected) {
          results.expectedErrors++;
          results.groups[group.id].expectedErrors++;
        }
      } else {
        results.failed++;
        results.groups[group.id].failed++;
      }
    }

    console.log(''); // Empty line between groups
  }

  return results;
}

function printSummary(results) {
  console.log('📊 HEALTH CHECK SUMMARY');
  console.log('========================');
  console.log(`Total routes tested: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Expected errors: ${results.expectedErrors}`);

  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  console.log(`📈 Success rate: ${successRate}%`);

  console.log('\n📂 BY GROUP:');
  for (const [groupId, groupStats] of Object.entries(results.groups)) {
    const groupSuccessRate = groupStats.total > 0 ?
      ((groupStats.passed / groupStats.total) * 100).toFixed(1) : '0.0';
    console.log(`   ${groupStats.title}: ${groupStats.passed}/${groupStats.total} (${groupSuccessRate}%) - ${groupStats.expectedErrors} expected errors`);
  }

  console.log(''); // Empty line

  if (results.failed > results.expectedErrors) {
    console.log('❌ HEALTH CHECK FAILED - Some routes are broken');
    process.exit(1);
  } else {
    console.log('✅ HEALTH CHECK PASSED - All routes working as expected');
    process.exit(0);
  }
}

// Main execution
async function main() {
  try {
    const results = await testAllRoutes();
    printSummary(results);
  } catch (error) {
    console.error('💥 Health check failed with error:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Health check interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Health check terminated');
  process.exit(1);
});

main();
