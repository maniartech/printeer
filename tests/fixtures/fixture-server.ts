/**
 * Self-contained, dependency-free fixture HTTP server for e2e tests.
 *
 * Uses only Node's built-in `http` module so the e2e suite never depends on
 * the heavier Express-based `mock-server/` package or on the public internet.
 * Every route is deterministic so PDF/PNG output and timing are reproducible.
 *
 * Usage:
 *   const server = new FixtureServer();
 *   const base = await server.start();   // e.g. http://127.0.0.1:53124
 *   // ... drive the CLI / library against `${base}/static` ...
 *   await server.stop();
 */

import { createServer, IncomingMessage, ServerResponse, Server } from 'http';
import { AddressInfo } from 'net';

const STATIC_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Fixture Static</title>
<style>body{font-family:sans-serif;margin:40px}h1{color:#c0392b}</style></head>
<body><h1 id="title">Printeer Fixture</h1>
<p id="ready">The quick brown fox jumps over the lazy dog.</p></body></html>`;

const TALL_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Fixture Tall</title></head>
<body style="margin:0"><div style="height:3000px;background:linear-gradient(#fff,#2980b9)">
<h1 style="padding:40px">Tall page for full-page capture</h1></div>
<div id="bottom" style="padding:40px">BOTTOM MARKER</div></body></html>`;

// A page whose visible content only appears after a JS-driven delay + selector.
const DELAYED_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Fixture Delayed</title></head>
<body><div id="app">loading…</div>
<script>
  setTimeout(function(){
    var d=document.createElement('div');
    d.id='loaded'; d.textContent='CONTENT READY';
    document.body.appendChild(d);
  }, 400);
</script></body></html>`;

export interface FixtureServerOptions {
  /** Optional fixed port; default 0 = let the OS pick a free port (parallel-safe). */
  port?: number;
}

export class FixtureServer {
  private server?: Server;
  private host = '127.0.0.1';
  private requestedPort: number;
  /** Number of requests served per pathname, for assertions (e.g. retry counts). */
  public readonly hits = new Map<string, number>();
  /** Pathnames that should fail N times before succeeding (for retry tests). */
  private readonly flaky = new Map<string, { failuresLeft: number }>();

  constructor(opts: FixtureServerOptions = {}) {
    this.requestedPort = opts.port ?? 0;
  }

  /** Configure a path to return 503 for the first `failures` requests, then 200. */
  setFlaky(pathname: string, failures: number): void {
    this.flaky.set(pathname, { failuresLeft: failures });
  }

  get baseUrl(): string {
    if (!this.server) throw new Error('FixtureServer not started');
    const { port } = this.server.address() as AddressInfo;
    return `http://${this.host}:${port}`;
  }

  start(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => this.handle(req, res));
      this.server.on('error', reject);
      this.server.listen(this.requestedPort, this.host, () => resolve(this.baseUrl));
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) return resolve();
      this.server.close(() => resolve());
    });
  }

  private handle(req: IncomingMessage, res: ServerResponse): void {
    const url = new URL(req.url || '/', this.baseUrl);
    const path = url.pathname;
    this.hits.set(path, (this.hits.get(path) || 0) + 1);

    const send = (status: number, body: string, type = 'text/html') => {
      res.writeHead(status, { 'Content-Type': type });
      res.end(body);
    };

    // Flaky endpoint: fail first N times, then succeed (for retry tests).
    const flaky = this.flaky.get(path);
    if (flaky && flaky.failuresLeft > 0) {
      flaky.failuresLeft -= 1;
      return send(503, 'Service Unavailable (flaky)');
    }

    switch (path) {
      case '/__health':
        return send(200, 'ok', 'text/plain');
      case '/':
      case '/static':
        return send(200, STATIC_HTML);
      case '/tall':
        return send(200, TALL_HTML);
      case '/delayed':
        return send(200, DELAYED_HTML);
      case '/echo-headers':
        return send(200, `<pre id="headers">${JSON.stringify(req.headers)}</pre>`);
      case '/status/404':
        return send(404, '<h1>Not Found</h1>');
      case '/status/500':
        return send(500, '<h1>Server Error</h1>');
      case '/retry':
        return send(200, '<h1 id="ok">RETRY OK</h1>');
      default:
        return send(404, '<h1>Unknown fixture route</h1>');
    }
  }
}
