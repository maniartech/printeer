import fetch from 'node-fetch';

/**
 * Enhanced MockServerClient with better error handling
 */
export class MockServerClient {
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
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch catalog: ${error.message}`);
    }
  }

  async validateEndpoint(endpoint) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'HEAD',
        timeout: 10000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Auto-start and manage mock server for testing
 */
export class MockServerManager {
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
      const { spawn } = await import('child_process');
      const path = await import('path');
      const { fileURLToPath } = await import('url');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const mockServerPath = path.resolve(__dirname, '../../../mock-server');

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