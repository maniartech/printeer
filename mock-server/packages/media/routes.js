import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const group = {
  id: 'media',
  title: 'Media Emulation & Responsive',
  routes: [
    { path: '/media/print-vs-screen', title: 'Print vs Screen' },
    { path: '/viewport/responsive', title: 'Responsive grid' },
    { path: '/viewport/dsf-markers', title: 'Device scale factor' },
    { path: '/media/color-scheme', title: 'Color scheme' }
  ]
};

export function createRouter() {
  const router = express.Router();

  // GET /media/print-vs-screen - Different styles for screen vs print
  router.get('/media/print-vs-screen', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'print-vs-screen'), {
      title: 'Print vs Screen Media Query Testing'
    });
  });

  // GET /viewport/responsive - Responsive breakpoint grid
  router.get('/viewport/responsive', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'responsive-grid'), {
      title: 'Responsive Viewport Testing'
    });
  });

  // GET /viewport/dsf-markers - Device scale factor markers
  router.get('/viewport/dsf-markers', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'dsf-markers'), {
      title: 'Device Scale Factor Markers'
    });
  });

  // GET /media/color-scheme - Color scheme preference testing
  router.get('/media/color-scheme', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'color-scheme'), {
      title: 'Color Scheme Preference Testing'
    });
  });

  return router;
}