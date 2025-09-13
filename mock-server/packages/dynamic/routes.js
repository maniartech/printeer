import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const group = {
  id: 'dynamic',
  title: 'Dynamic/SPA & Wait Strategies',
  routes: [
    { path: '/spa/delay-content?ms=2000', title: 'Wait for selector' },
    { path: '/spa/network-idle?requests=5', title: 'Wait for network idle' },
    { path: '/spa/title-late?ms=1000', title: 'Late title change' },
    { path: '/spa/interactive', title: 'Interactive content' },
    { path: '/spa/custom-ready?ms=2000', title: 'Wait for function (window.__ready)' }
  ]
};

export function createRouter() {
  const router = express.Router();

  // GET /spa/delay-content - Content appears after delay (test wait-for-selector)
  router.get('/spa/delay-content', (req, res) => {
    const delay = parseInt(req.query.ms) || 2000;
    
    res.render(path.join(__dirname, 'templates', 'delay-content'), {
      title: `Delayed Content (${delay}ms delay)`,
      delay
    });
  });

  // GET /spa/network-idle - Burst of network requests then idle
  router.get('/spa/network-idle', (req, res) => {
    const requests = parseInt(req.query.requests) || 5;
    
    res.render(path.join(__dirname, 'templates', 'network-idle'), {
      title: `Network Idle Test (${requests} requests)`,
      requests
    });
  });

  // GET /spa/title-late - Title changes after delay (test filename generation)
  router.get('/spa/title-late', (req, res) => {
    const delay = parseInt(req.query.ms) || 1000;
    
    res.render(path.join(__dirname, 'templates', 'title-late'), {
      title: 'Initial Title (Will Change)',
      delay,
      finalTitle: 'Updated Title After Delay'
    });
  });

  // GET /spa/interactive - Content loads on user interaction
  router.get('/spa/interactive', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'interactive'), {
      title: 'Interactive Content Loading'
    });
  });

  // GET /spa/custom-ready - Sets window.__ready after delay
  router.get('/spa/custom-ready', (req, res) => {
    const delay = parseInt(req.query.ms) || 2000;
    
    res.render(path.join(__dirname, 'templates', 'custom-ready'), {
      title: 'Custom Ready Function Test',
      delay
    });
  });

  return router;
}