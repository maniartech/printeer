#!/usr/bin/env node
/**
 * Minimal post-upgrade smoke test used by update-puppeteer.mjs `verify()`.
 * Starts a localhost page, converts it to PDF via the *built* library, and
 * asserts a valid PDF was produced. Exits non-zero on any failure.
 */

import { createServer } from 'http';
import { readFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { pathToFileURL, fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<!doctype html><html><body><h1>smoke</h1></body></html>');
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const out = join(tmpdir(), `printeer-puppeteer-smoke-${process.pid}.pdf`);

process.env.PRINTEER_BUNDLED_ONLY = '1';
process.env.PRINTEER_SILENT = '1';

let code = 0;
try {
  const mod = await import(pathToFileURL(join(ROOT, 'dist', 'lib', 'index.js')).href);
  const printeer = mod.default;
  await printeer(`http://127.0.0.1:${port}/`, out, 'pdf', {});
  const buf = readFileSync(out);
  if (!buf.subarray(0, 5).toString('latin1').startsWith('%PDF-') || buf.length < 1000) {
    throw new Error('smoke conversion did not produce a valid PDF');
  }
  console.log('[smoke] ✓ valid PDF produced');
} catch (e) {
  console.error('[smoke] ✗', e.message);
  code = 1;
} finally {
  try { rmSync(out, { force: true }); } catch { /* ignore */ }
  server.close();
}
process.exit(code);
