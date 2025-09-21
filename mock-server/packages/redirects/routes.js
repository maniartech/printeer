import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const group = {
  id: 'redirects',
  title: 'Redirects & Navigation',
  routes: [
    { path: '/redirect/chain?n=3&to=/static/simple', title: 'Redirect chain' },
    { path: '/redirect/loop', title: 'Infinite redirect' },
    { path: '/redirect/delay?ms=1000&to=/static/simple', title: 'Delayed redirect' }
  ]
};

export function createRouter() {
  const router = express.Router();

  // GET /redirect/chain - Chain of redirects
  router.get('/redirect/chain', (req, res) => {
    const n = parseInt(req.query.n) || 3;
    const to = req.query.to || '/static/simple';
    const current = parseInt(req.query.current) || 1;

    if (current >= n) {
      // Final redirect to destination
      return res.redirect(302, to);
    }

    // Redirect to next in chain
    const nextUrl = `/redirect/chain?n=${n}&to=${encodeURIComponent(to)}&current=${current + 1}`;
    res.redirect(302, nextUrl);
  });

  // GET /redirect/loop - Infinite redirect loop
  router.get('/redirect/loop', (req, res) => {
    const step = parseInt(req.query.step) || 1;
    
    if (step > 10) {
      // Safety valve to prevent infinite loops in testing
      return res.status(508).send('Loop Detected - Safety valve triggered after 10 redirects');
    }

    const nextStep = step === 3 ? 1 : step + 1; // Create a 3-step loop
    res.redirect(302, `/redirect/loop?step=${nextStep}`);
  });

  // GET /redirect/delay - Delayed redirect
  router.get('/redirect/delay', (req, res) => {
    const delay = parseInt(req.query.ms) || 1000;
    const to = req.query.to || '/static/simple';

    setTimeout(() => {
      res.redirect(302, to);
    }, delay);
  });

  return router;
}