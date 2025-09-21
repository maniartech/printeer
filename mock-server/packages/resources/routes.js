import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const group = {
  id: 'resources',
  title: 'Resources & Performance',
  routes: [
    { path: '/assets/slow.js?ms=1500', title: 'Slow JS' },
    { path: '/assets/slow.css?ms=1500', title: 'Slow CSS' },
    { path: '/assets/large-image.svg?kb=1024', title: 'Large SVG' },
    { path: '/assets/random-image', title: 'Random image' },
    { path: '/assets/missing', title: 'Missing asset' },
    { path: '/assets/huge-css?kb=256', title: 'Huge CSS' },
    { path: '/assets/huge-js?kb=512', title: 'Huge JS' }
  ]
};

export function createRouter() {
  const router = express.Router();

  // GET /assets/slow.js - Slow JavaScript response
  router.get('/assets/slow.js', (req, res) => {
    const delay = parseInt(req.query.ms) || 1500;
    
    setTimeout(() => {
      res.set('Content-Type', 'application/javascript');
      res.send(`
// Slow JavaScript file (${delay}ms delay)
console.log('Slow JavaScript loaded after ${delay}ms');
document.addEventListener('DOMContentLoaded', function() {
  const element = document.getElementById('slow-js-status');
  if (element) {
    element.textContent = 'Slow JavaScript loaded successfully';
    element.style.color = 'green';
  }
});
      `);
    }, delay);
  });

  // GET /assets/slow.css - Slow CSS response
  router.get('/assets/slow.css', (req, res) => {
    const delay = parseInt(req.query.ms) || 1500;
    
    setTimeout(() => {
      res.set('Content-Type', 'text/css');
      res.send(`
/* Slow CSS file (${delay}ms delay) */
.slow-css-loaded {
  background-color: #e8f5e8;
  border: 2px solid #4caf50;
  padding: 10px;
  border-radius: 4px;
}

.slow-css-loaded::before {
  content: "✓ Slow CSS loaded after ${delay}ms";
  color: #2e7d32;
  font-weight: bold;
}
      `);
    }, delay);
  });

  // GET /assets/large-image.svg - Generate large SVG
  router.get('/assets/large-image.svg', (req, res) => {
    const kb = parseInt(req.query.kb) || 1024;
    const targetBytes = kb * 1024;
    
    // Generate SVG content to reach target size
    const baseContent = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f0f0f0"/>
  <text x="50%" y="50%" text-anchor="middle" font-size="24" fill="#333">Large SVG (${kb}KB)</text>`;
    
    let content = baseContent;
    const filler = '<!-- ' + 'x'.repeat(100) + ' -->\n';
    
    while (content.length < targetBytes - 100) {
      content += filler;
    }
    
    content += '</svg>';
    
    res.set('Content-Type', 'image/svg+xml');
    res.send(content);
  });

  // GET /assets/random-image - Random generated image
  router.get('/assets/random-image', (req, res) => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomText = Math.random().toString(36).substring(7);
    
    const svg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${randomColor}"/>
  <text x="50%" y="50%" text-anchor="middle" font-size="16" fill="white">${randomText}</text>
</svg>`;
    
    res.set('Content-Type', 'image/svg+xml');
    res.send(svg);
  });

  // GET /assets/missing - Always returns 404
  router.get('/assets/missing', (req, res) => {
    res.status(404).send('Asset not found');
  });

  // GET /assets/huge-css - Generate huge CSS file
  router.get('/assets/huge-css', (req, res) => {
    const kb = parseInt(req.query.kb) || 256;
    const targetBytes = kb * 1024;
    
    let css = `/* Huge CSS file (${kb}KB) */\n`;
    
    // Generate repetitive CSS rules to reach target size
    let counter = 0;
    while (css.length < targetBytes) {
      css += `.generated-class-${counter} {
  background-color: #${Math.floor(Math.random()*16777215).toString(16)};
  padding: ${Math.floor(Math.random() * 20)}px;
  margin: ${Math.floor(Math.random() * 10)}px;
  border-radius: ${Math.floor(Math.random() * 15)}px;
}
`;
      counter++;
    }
    
    res.set('Content-Type', 'text/css');
    res.send(css);
  });

  // GET /assets/huge-js - Generate huge JavaScript file
  router.get('/assets/huge-js', (req, res) => {
    const kb = parseInt(req.query.kb) || 512;
    const targetBytes = kb * 1024;
    
    let js = `/* Huge JavaScript file (${kb}KB) */\n`;
    js += `console.log('Loading huge JavaScript file (${kb}KB)');\n`;
    
    // Generate repetitive JavaScript to reach target size
    let counter = 0;
    while (js.length < targetBytes) {
      js += `
function generatedFunction${counter}() {
  var data${counter} = {
    id: ${counter},
    name: 'generated_${counter}',
    value: Math.random() * ${counter + 1},
    timestamp: Date.now(),
    description: 'This is a generated function number ${counter} for testing large JavaScript files'
  };
  return data${counter};
}
`;
      counter++;
    }
    
    js += `\nconsole.log('Huge JavaScript file loaded with ${counter} functions');`;
    
    res.set('Content-Type', 'application/javascript');
    res.send(js);
  });

  return router;
}