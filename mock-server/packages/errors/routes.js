import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const group = {
  id: 'errors',
  title: 'Errors & Resilience',
  routes: [
    { path: '/error/500', title: 'HTTP 500' },
    { path: '/error/timeout?ms=10000', title: 'Timeout/Hang' },
    { path: '/error/reset', title: 'Connection reset' },
    { path: '/error/flaky?fail=2', title: 'Flaky (retry)' }
  ]
};

// Store flaky request counters
const flakyCounters = new Map();

export function createRouter() {
  const router = express.Router();

  // GET /error/500 - Always returns HTTP 500
  router.get('/error/500', (req, res) => {
    res.status(500).render(path.join(__dirname, 'templates', 'error-500'), {
      title: 'Internal Server Error',
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substring(7)
    });
  });

  // GET /error/timeout - Holds connection open to trigger timeout
  router.get('/error/timeout', (req, res) => {
    const delay = parseInt(req.query.ms) || 10000;
    
    // Set a very long timeout but don't actually respond
    setTimeout(() => {
      // This will likely never execute due to client timeout
      res.status(408).send('Request Timeout (if you see this, your timeout is too long)');
    }, delay);
    
    // Don't call res.send() or res.end() - leave connection hanging
  });

  // GET /error/reset - Abruptly terminate the socket
  router.get('/error/reset', (req, res) => {
    // Destroy the socket connection immediately
    req.socket.destroy();
  });

  // GET /error/flaky - Fails first N requests, then succeeds
  router.get('/error/flaky', (req, res) => {
    const failCount = parseInt(req.query.fail) || 2;
    const key = req.ip + req.get('User-Agent'); // Use IP + UA as key
    
    let currentCount = flakyCounters.get(key) || 0;
    currentCount++;
    flakyCounters.set(key, currentCount);
    
    if (currentCount <= failCount) {
      // Fail with different error types
      const errorTypes = [
        { status: 500, message: 'Internal Server Error' },
        { status: 503, message: 'Service Unavailable' },
        { status: 502, message: 'Bad Gateway' }
      ];
      
      const errorType = errorTypes[(currentCount - 1) % errorTypes.length];
      
      return res.status(errorType.status).render(path.join(__dirname, 'templates', 'flaky-error'), {
        title: `Flaky Error (Attempt ${currentCount}/${failCount})`,
        attempt: currentCount,
        maxAttempts: failCount,
        errorStatus: errorType.status,
        errorMessage: errorType.message,
        willSucceed: currentCount >= failCount
      });
    }
    
    // Success after failing the required number of times
    res.render(path.join(__dirname, 'templates', 'flaky-success'), {
      title: 'Flaky Request Success',
      attempt: currentCount,
      failedAttempts: failCount,
      message: `Success after ${failCount} failed attempts`
    });
  });

  // Reset flaky counters endpoint (for testing)
  router.post('/error/flaky/reset', (req, res) => {
    flakyCounters.clear();
    res.json({ message: 'Flaky counters reset', timestamp: new Date().toISOString() });
  });

  return router;
}