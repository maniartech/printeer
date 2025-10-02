#!/usr/bin/env node

import { Command } from 'commander';
import { MockServerClient } from '../framework/mock-server-client.js';

const program = new Command();

program
  .name('printeer-verify-server')
  .description('Verify mock server is running and accessible')
  .option('-s, --server <url>', 'Mock server URL', 'http://localhost:4000')
  .option('--check-catalog', 'Verify catalog endpoint is accessible')
  .option('--check-routes', 'Test sample routes from catalog')
  .option('--verbose', 'Verbose output with detailed checks')
  .action(async (options) => {
    try {
      console.log(`🔍 Verifying mock server at ${options.server}`);

      const client = new MockServerClient(options.server);

      // Health check
      console.log('🏥 Checking server health...');
      const isHealthy = await client.checkHealth();

      if (!isHealthy) {
        console.log('❌ Server health check failed');
        console.log('💡 Make sure the mock server is running: cd mock-server && yarn start');
        process.exit(1);
      }

      console.log('✅ Server is healthy');

      // Catalog check
      if (options.checkCatalog) {
        console.log('📋 Checking catalog endpoint...');
        try {
          const catalog = await client.getCatalog();
          console.log(`✅ Catalog loaded with ${catalog.groups?.length || 0} groups`);

          if (options.verbose && catalog.groups) {
            catalog.groups.forEach(group => {
              console.log(`   📂 ${group.title} (${group.routes?.length || 0} routes)`);
            });
          }
        } catch (error) {
          console.log('❌ Catalog check failed:', error.message);
          process.exit(1);
        }
      }

      // Route checks
      if (options.checkRoutes) {
        console.log('🛣️  Testing sample routes...');
        try {
          const catalog = await client.getCatalog();
          const sampleRoutes = [
            '/static/simple',
            '/print/css-default',
            '/debug/ua'
          ];

          for (const route of sampleRoutes) {
            const isValid = await client.validateEndpoint(route);
            const status = isValid ? '✅' : '❌';
            console.log(`   ${status} ${route}`);
          }
        } catch (error) {
          console.log('❌ Route validation failed:', error.message);
          process.exit(1);
        }
      }

      console.log('🎉 Mock server verification completed successfully');

    } catch (error) {
      console.error('❌ Server verification failed:', error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse();