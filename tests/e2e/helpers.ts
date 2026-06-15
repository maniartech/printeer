/**
 * Shared helpers for end-to-end tests that drive the *built* CLI
 * (`dist/bin/cli.js`) and the *built* library (`dist/lib/index.js`)
 * against the {@link FixtureServer}.
 *
 * Dependency-free output validation: we assert on raw bytes (PDF header/EOF,
 * PNG signature + IHDR dimensions) rather than pulling in a PDF parser, so the
 * suite stays fast and has no extra install surface.
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';

export const REPO_ROOT = resolve(__dirname, '..', '..');
export const CLI_PATH = join(REPO_ROOT, 'dist', 'bin', 'cli.js');
export const LIB_PATH = join(REPO_ROOT, 'dist', 'lib', 'index.js');

export interface CliResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Run the built CLI as a child process and capture stdout/stderr/exit code.
 * The child gets a clean-ish env: we strip vitest's forced overrides so the
 * CLI behaves like a real user invocation unless the caller opts in via `env`.
 */
export function runCli(
  args: string[],
  opts: { env?: Record<string, string>; cwd?: string; timeoutMs?: number } = {}
): Promise<CliResult> {
  if (!existsSync(CLI_PATH)) {
    throw new Error(`Built CLI not found at ${CLI_PATH}. Run \`npm run build\` first.`);
  }
  return new Promise((resolvePromise, reject) => {
    const baseEnv: Record<string, string> = { ...(process.env as Record<string, string>) };
    // Remove the vitest-injected *behavioral forcing* (pool sizing, strategy,
    // CLI-mode marker, NODE_ENV) so the CLI exercises its real defaults.
    //
    // Do NOT strip the *infrastructure* flags PRINTEER_BUNDLED_ONLY /
    // PRINTEER_NO_SANDBOX: on CI Linux the bundled Chromium only launches
    // reliably with the sandbox disabled, and bundled-only is what points the
    // CLI at the downloaded Chromium in the first place. Stripping them makes
    // the spawned CLI fail to launch a browser (empty output / timeout) — which
    // is exactly how this surfaced on the first real CI run. (BUG-019)
    for (const k of [
      'NODE_ENV',
      'PRINTEER_BROWSER_STRATEGY',
      'PRINTEER_CLI_MODE',
      'PRINTEER_BROWSER_POOL_MIN',
      'PRINTEER_BROWSER_POOL_MAX',
      'PRINTEER_BROWSER_TIMEOUT',
    ]) {
      delete baseEnv[k];
    }
    const child = spawn(process.execPath, [CLI_PATH, ...args], {
      cwd: opts.cwd ?? REPO_ROOT,
      env: { ...baseEnv, ...(opts.env ?? {}) },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`CLI timed out after ${opts.timeoutMs ?? 60000}ms\nstdout:${stdout}\nstderr:${stderr}`));
    }, opts.timeoutMs ?? 60000);
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolvePromise({ code, stdout, stderr });
    });
  });
}

/** Create a unique temp dir for test outputs; returns dir + a cleanup fn. */
export function tempDir(prefix = 'printeer-e2e-'): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

export function assertValidPdf(path: string): void {
  if (!existsSync(path)) throw new Error(`Expected PDF at ${path}, but it does not exist`);
  const buf = readFileSync(path);
  if (buf.length < 1000) throw new Error(`PDF at ${path} is suspiciously small (${buf.length} bytes)`);
  const head = buf.subarray(0, 5).toString('latin1');
  if (!head.startsWith('%PDF-')) throw new Error(`File at ${path} is not a PDF (header: ${head})`);
  const tail = buf.subarray(Math.max(0, buf.length - 1024)).toString('latin1');
  if (!tail.includes('%%EOF')) throw new Error(`PDF at ${path} is missing %%EOF trailer`);
}

/** Parse a PNG's IHDR for width/height (bytes 16..24). Validates the signature. */
export function readPngSize(path: string): { width: number; height: number } {
  if (!existsSync(path)) throw new Error(`Expected PNG at ${path}, but it does not exist`);
  const buf = readFileSync(path);
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < sig.length; i++) {
    if (buf[i] !== sig[i]) throw new Error(`File at ${path} is not a PNG`);
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

export function assertValidPng(path: string): void {
  const { width, height } = readPngSize(path);
  if (width < 1 || height < 1) throw new Error(`PNG at ${path} has invalid dimensions ${width}x${height}`);
}
