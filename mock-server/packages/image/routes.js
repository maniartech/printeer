import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const group = {
  id: 'image',
  title: 'Image Capture & Clipping',
  routes: [
    { path: '/image/clip-target', title: 'Clip target' },
    { path: '/image/transparent-bg', title: 'Transparent background' },
    { path: '/image/quality-grid', title: 'Quality grid' }
  ]
};

export function createRouter() {
  const router = express.Router();

  // GET /image/clip-target - Page with marked rectangle for clipping
  router.get('/image/clip-target', (req, res) => {
    const x = parseInt(req.query.x) || 100;
    const y = parseInt(req.query.y) || 100;
    const width = parseInt(req.query.width) || 400;
    const height = parseInt(req.query.height) || 300;
    
    res.render(path.join(__dirname, 'templates', 'clip-target'), {
      title: 'Image Clipping Target',
      clipRegion: { x, y, width, height }
    });
  });

  // GET /image/transparent-bg - Transparent background for PNG/WebP testing
  router.get('/image/transparent-bg', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'transparent-bg'), {
      title: 'Transparent Background Testing'
    });
  });

  // GET /image/quality-grid - Gradients and details for quality testing
  router.get('/image/quality-grid', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'quality-grid'), {
      title: 'Image Quality Testing Grid'
    });
  });

  return router;
}