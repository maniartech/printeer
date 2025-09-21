import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const group = {
  id: 'templates',
  title: 'Templates & Variables',
  routes: [
    { path: '/template/header', title: 'Header template' },
    { path: '/template/footer', title: 'Footer template' },
    { path: '/template/content', title: 'Content template' },
    { path: '/template/header-variables', title: 'Header variables' },
    { path: '/template/footer-variables', title: 'Footer variables' }
  ]
};

export function createRouter() {
  const router = express.Router();

  // GET /template/header - Header template with variables
  router.get('/template/header', (req, res) => {
    const variables = {
      company: req.query.company || 'Acme Corporation',
      date: req.query.date || new Date().toLocaleDateString(),
      title: req.query.title || 'Document Title',
      author: req.query.author || 'John Doe'
    };
    
    res.render(path.join(__dirname, 'templates', 'header-demo'), {
      title: 'Header Template Demo',
      variables
    });
  });

  // GET /template/footer - Footer template with variables
  router.get('/template/footer', (req, res) => {
    const variables = {
      company: req.query.company || 'Acme Corporation',
      website: req.query.website || 'www.acme.com',
      phone: req.query.phone || '+1 (555) 123-4567',
      copyright: req.query.copyright || new Date().getFullYear()
    };
    
    res.render(path.join(__dirname, 'templates', 'footer-demo'), {
      title: 'Footer Template Demo',
      variables
    });
  });

  // GET /template/content - Content template with interpolation
  router.get('/template/content', (req, res) => {
    const variables = {
      customerName: req.query.customerName || 'Jane Smith',
      invoiceNumber: req.query.invoiceNumber || 'INV-2024-001',
      amount: req.query.amount || '$1,234.56',
      dueDate: req.query.dueDate || '2024-12-31'
    };
    
    res.render(path.join(__dirname, 'templates', 'content-demo'), {
      title: 'Content Template Demo',
      variables
    });
  });

  // GET /template/header-variables - All supported header variables
  router.get('/template/header-variables', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'header-variables'), {
      title: 'Header Template Variables Reference'
    });
  });

  // GET /template/footer-variables - All supported footer variables
  router.get('/template/footer-variables', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'footer-variables'), {
      title: 'Footer Template Variables Reference'
    });
  });

  return router;
}