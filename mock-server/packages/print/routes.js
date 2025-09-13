import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const group = {
  id: 'print',
  title: 'Print CSS & Page Formatting',
  routes: [
    { path: '/print/css-default', title: '@media print overrides' },
    { path: '/print/no-print-elements', title: 'No-print elements' },
    { path: '/print/page-breaks', title: 'Page breaks' },
    { path: '/print/margins?top=1in&right=1in&bottom=1in&left=1in', title: 'Margins' },
    { path: '/print/header-footer-demo', title: 'Header/Footer demo' },
    { path: '/print/custom-size?width=210mm&height=99mm', title: 'Custom page size' },
    { path: '/print/orientation?landscape=true', title: 'Landscape orientation' },
    { path: '/print/scale-markers', title: 'Scale markers' },
    { path: '/print/css-page-size', title: 'CSS @page size' },
    { path: '/pdf/tagged-structure', title: 'Tagged structure' },
    { path: '/print/page-ranges-demo?pages=10', title: 'Page ranges demo' }
  ]
};

export function createRouter() {
  const router = express.Router();

  // GET /print/css-default - @media print CSS overrides
  router.get('/print/css-default', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'css-default'), {
      title: 'Print CSS Media Query Testing'
    });
  });

  // GET /print/no-print-elements - Elements hidden in print
  router.get('/print/no-print-elements', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'no-print-elements'), {
      title: 'No-Print Elements Testing'
    });
  });

  // GET /print/page-breaks - Page break controls
  router.get('/print/page-breaks', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'page-breaks'), {
      title: 'Page Break Controls Testing'
    });
  });

  // GET /print/margins - Margin testing with visual rulers
  router.get('/print/margins', (req, res) => {
    const margins = {
      top: req.query.top || '1in',
      right: req.query.right || '1in',
      bottom: req.query.bottom || '1in',
      left: req.query.left || '1in'
    };

    res.render(path.join(__dirname, 'templates', 'margins'), {
      title: `Margin Testing (${margins.top}, ${margins.right}, ${margins.bottom}, ${margins.left})`,
      margins
    });
  });

  // GET /print/header-footer-demo - Header/footer placeholders
  router.get('/print/header-footer-demo', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'header-footer-demo'), {
      title: 'Header and Footer Template Demo'
    });
  });

  // GET /print/custom-size - Custom page size testing
  router.get('/print/custom-size', (req, res) => {
    const width = req.query.width || '210mm';
    const height = req.query.height || '297mm';

    res.render(path.join(__dirname, 'templates', 'custom-size'), {
      title: `Custom Page Size (${width} × ${height})`,
      width,
      height
    });
  });

  // GET /print/orientation - Landscape/portrait testing
  router.get('/print/orientation', (req, res) => {
    const landscape = req.query.landscape === 'true';

    res.render(path.join(__dirname, 'templates', 'orientation'), {
      title: `Page Orientation (${landscape ? 'Landscape' : 'Portrait'})`,
      landscape
    });
  });

  // GET /print/scale-markers - Scale validation rulers
  router.get('/print/scale-markers', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'scale-markers'), {
      title: 'Scale Markers and Rulers'
    });
  });

  // GET /print/css-page-size - CSS @page size directive
  router.get('/print/css-page-size', (req, res) => {
    const pageSize = req.query.size || 'A4';

    res.render(path.join(__dirname, 'templates', 'css-page-size'), {
      title: `CSS @page Size (${pageSize})`,
      pageSize
    });
  });

  // GET /pdf/tagged-structure - Semantic structure for tagged PDFs
  router.get('/pdf/tagged-structure', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'tagged-structure'), {
      title: 'Tagged PDF Structure Testing'
    });
  });

  // GET /print/page-ranges-demo - Long document for page range testing
  router.get('/print/page-ranges-demo', (req, res) => {
    const pages = parseInt(req.query.pages) || 10;
    const pageData = Array.from({ length: pages }, (_, i) => ({
      number: i + 1,
      title: `Page ${i + 1}`,
      content: `This is the content for page ${i + 1}. `.repeat(30)
    }));

    res.render(path.join(__dirname, 'templates', 'page-ranges-demo'), {
      title: `Page Ranges Demo (${pages} pages)`,
      pages: pageData,
      totalPages: pages
    });
  });

  return router;
}