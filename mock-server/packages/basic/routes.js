import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const group = {
  id: 'basic',
  title: 'Basic pages and layout',
  routes: [
    { path: '/static/simple', title: 'Simple HTML' },
    { path: '/static/long?pages=5', title: 'Multi-page long content' },
    { path: '/static/rtl', title: 'RTL sample' },
    { path: '/static/fonts', title: 'Web fonts' },
    { path: '/static/images', title: 'Image grid' },
    { path: '/debug/ua', title: 'User agent' },
    { path: '/debug/echo', title: 'Echo request' }
  ]
};

export function createRouter() {
  const router = express.Router();

  // Set up view engine for this group's templates
  router.use((req, res, next) => {
    res.locals.templatePath = path.join(__dirname, 'templates');
    next();
  });

  // GET /static/simple - Simple semantic HTML with predictable title
  router.get('/static/simple', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'simple'), {
      title: 'Simple Example Page',
      timestamp: new Date().toISOString()
    });
  });

  // GET /static/long - Multi-page content for pagination testing
  router.get('/static/long', (req, res) => {
    const pages = parseInt(req.query.pages) || 5;
    const sections = Array.from({ length: pages }, (_, i) => ({
      number: i + 1,
      title: `Section ${i + 1}`,
      content: `This is the content for section ${i + 1}. `.repeat(50)
    }));

    res.render(path.join(__dirname, 'templates', 'long'), {
      title: `Multi-Page Document (${pages} sections)`,
      sections,
      totalPages: pages
    });
  });

  // GET /static/rtl - RTL language sample
  router.get('/static/rtl', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'rtl'), {
      title: 'RTL Language Sample - عينة اللغة العربية'
    });
  });

  // GET /static/fonts - Web fonts testing
  router.get('/static/fonts', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'fonts'), {
      title: 'Web Fonts Testing Page'
    });
  });

  // GET /static/images - Image grid for testing
  router.get('/static/images', (req, res) => {
    const images = [
      { type: 'SVG', src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmY2NjAwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk9yYW5nZSBTVkc8L3RleHQ+PC9zdmc+' },
      { type: 'PNG', src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' },
      { type: 'JPEG', src: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA8=' }
    ];

    res.render(path.join(__dirname, 'templates', 'images'), {
      title: 'Image Grid Testing',
      images
    });
  });

  // GET /debug/ua - User agent and device info
  router.get('/debug/ua', (req, res) => {
    const userAgent = req.get('User-Agent') || 'Unknown';
    const acceptLanguage = req.get('Accept-Language') || 'Unknown';
    const acceptEncoding = req.get('Accept-Encoding') || 'Unknown';
    
    res.render(path.join(__dirname, 'templates', 'debug-ua'), {
      title: 'User Agent Debug Information',
      userAgent,
      acceptLanguage,
      acceptEncoding,
      headers: req.headers
    });
  });

  // GET /debug/echo - Echo request details
  router.get('/debug/echo', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'debug-echo'), {
      title: 'Request Echo Debug',
      method: req.method,
      url: req.url,
      query: req.query,
      headers: req.headers,
      body: req.body,
      timestamp: new Date().toISOString()
    });
  });

  // POST /debug/echo - Echo POST data
  router.post('/debug/echo', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'debug-echo'), {
      title: 'POST Request Echo Debug',
      method: req.method,
      url: req.url,
      query: req.query,
      headers: req.headers,
      body: req.body,
      timestamp: new Date().toISOString()
    });
  });

  return router;
}