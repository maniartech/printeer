import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const group = {
  id: 'cache-csp',
  title: 'Cache, Compression, CSP & Debug',
  routes: [
    { path: '/cache/cacheable', title: 'Cacheable' },
    { path: '/cache/no-store', title: 'No-store' },
    { path: '/csp/strict', title: 'Strict CSP' },
    { path: '/compress/text', title: 'Compression text' },
    { path: '/debug/console?error=1', title: 'Console errors' }
  ]
};

export function createRouter() {
  const router = express.Router();

  // GET /cache/cacheable - Sets cache headers
  router.get('/cache/cacheable', (req, res) => {
    const maxAge = parseInt(req.query.maxAge) || 3600; // 1 hour default
    
    res.set({
      'Cache-Control': `public, max-age=${maxAge}`,
      'ETag': `"${Date.now()}"`,
      'Last-Modified': new Date().toUTCString()
    });
    
    res.render(path.join(__dirname, 'templates', 'cacheable'), {
      title: 'Cacheable Content',
      maxAge,
      timestamp: new Date().toISOString(),
      etag: res.get('ETag')
    });
  });

  // GET /cache/no-store - Prevents caching
  router.get('/cache/no-store', (req, res) => {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.render(path.join(__dirname, 'templates', 'no-cache'), {
      title: 'Non-Cacheable Content',
      timestamp: new Date().toISOString(),
      randomId: Math.random().toString(36).substring(7)
    });
  });

  // GET /csp/strict - Strict Content Security Policy
  router.get('/csp/strict', (req, res) => {
    const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none';";
    
    res.set({
      'Content-Security-Policy': csp,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    });
    
    res.render(path.join(__dirname, 'templates', 'strict-csp'), {
      title: 'Strict CSP Testing',
      csp
    });
  });

  // GET /compress/text - Large text for compression testing
  router.get('/compress/text', (req, res) => {
    const kb = parseInt(req.query.kb) || 100;
    const targetBytes = kb * 1024;
    
    // Generate repetitive text content
    const baseText = 'This is a sample text for compression testing. It contains repeated patterns that should compress well. ';
    let content = '';
    
    while (content.length < targetBytes) {
      content += baseText;
    }
    
    res.render(path.join(__dirname, 'templates', 'compress-text'), {
      title: `Compression Test (${kb}KB)`,
      content: content.substring(0, targetBytes),
      originalSize: targetBytes,
      compressionRatio: 'Check response headers for actual compression'
    });
  });

  // GET /debug/console - Emit console messages
  router.get('/debug/console', (req, res) => {
    const errorCount = parseInt(req.query.error) || 0;
    const warnCount = parseInt(req.query.warn) || 0;
    const infoCount = parseInt(req.query.info) || 0;
    const logCount = parseInt(req.query.log) || 0;
    
    res.render(path.join(__dirname, 'templates', 'console-debug'), {
      title: 'Console Messages Debug',
      errorCount,
      warnCount,
      infoCount,
      logCount
    });
  });

  return router;
}