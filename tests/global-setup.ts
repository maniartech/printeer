
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync, writeFileSync } from 'fs';

export const MOCK_SERVER_PORT = 4000;
const MOCK_SERVER_URL = `http://localhost:${MOCK_SERVER_PORT}`;

// Store the PID file path to share with teardown
const PID_FILE = join(process.cwd(), 'tests', '.mock-server-pid');

export async function setup() {
  console.log('Starting global setup...');

  // Start the mock server
  const mockServerDir = join(process.cwd(), 'mock-server');
  const serverPath = join(mockServerDir, 'server.js');

  if (!existsSync(serverPath)) {
    console.warn('⚠️ Mock server not found at', serverPath);
    return;
  }

  console.log('🚀 Starting mock server...');
  const serverProcess = spawn('node', [serverPath], {
    cwd: mockServerDir,
    stdio: 'ignore', // 'inherit' for debugging
    env: {
      ...process.env,
      PORT: MOCK_SERVER_PORT.toString()
    },
    detached: true // Allow it to run independently if needed, but we kill it via PID
  });

  serverProcess.unref(); // Don't let it keep the parent process alive

  if (serverProcess.pid) {
    writeFileSync(PID_FILE, serverProcess.pid.toString());
    console.log(`Mock server started with PID ${serverProcess.pid}`);
  }

  // Wait for server to be ready
  let ready = false;
  let retries = 0;
  const maxRetries = 20;

  while (!ready && retries < maxRetries) {
    try {
      const response = await fetch(`${MOCK_SERVER_URL}/__health`);
      if (response.ok) {
        ready = true;
      }
    } catch (e) {
      await new Promise(resolve => setTimeout(resolve, 500));
      retries++;
    }
  }

  if (ready) {
    console.log('✅ Mock server is ready');
  } else {
    console.error('❌ Failed to start mock server');
    // We don't throw, to allow other tests to try running?
    // But CLI tests will likely fail.
  }
}

export async function teardown() {
  // This is global teardown function exported from here if using default export?
  // Vitest supports `export default function setup() { return teardown }` or `export const setup` and `export const teardown`?
  // Actually, vitest expects `export const setup` or `export default`.
  // If `setup` is exported, it can return a function for teardown.
  // But we have `globalTeardown` configured separately in vitest.config.ts
}
