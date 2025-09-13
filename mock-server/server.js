import express from 'express';
import fs from 'fs';
import path from 'path';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets for the launcher UI
app.use('/assets', express.static(path.join(__dirname, 'public')));

// View engine for file-based templates (no HTML embedded in JS)
app.set('views', path.join(__dirname, 'templates'));
app.set('view engine', 'ejs');

// Auto-discover and mount package routers
async function mountPackageRouters() {
  const packagesDir = path.join(__dirname, 'packages');
  
  if (!fs.existsSync(packagesDir)) {
    console.log('No packages directory found, skipping package auto-discovery');
    return;
  }

  const packageDirs = fs.readdirSync(packagesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const packageName of packageDirs) {
    try {
      const routesPath = path.join(packagesDir, packageName, 'routes.js');
      
      if (fs.existsSync(routesPath)) {
        const { createRouter } = await import(`./packages/${packageName}/routes.js`);
        const router = createRouter();
        
        app.use('/', router);
        console.log(`✓ Mounted ${packageName} package routes`);
      }
    } catch (error) {
      console.warn(`⚠️  Failed to mount ${packageName} package:`, error.message);
    }
  }
}

// Mount package routers
await mountPackageRouters();

// Load catalog from disk (single source of truth for launcher)
const catalogPath = path.join(__dirname, 'catalog.json');
function loadCatalog() {
  try {
    const raw = fs.readFileSync(catalogPath, 'utf-8');
    const data = JSON.parse(raw);
    // Fill runtime details
    const baseUrl = process.env.MOCK_BASE_URL || `http://localhost:${PORT}`;
    return { ...data, port: PORT, baseUrl };
  } catch (e) {
    return { name: 'Printeer Mock Server', port: PORT, baseUrl: `http://localhost:${PORT}`, groups: [] };
  }
}

app.get('/__catalog.json', (_req, res) => {
  res.json(loadCatalog());
});

app.get('/__health', (_req, res) => {
  res.json({ ok: true, port: PORT, ts: Date.now() });
});

// Launcher page
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Placeholder router for catalog-listed routes that aren't implemented yet
function buildRouteIndex(catalog) {
  const index = new Map();
  for (const group of catalog.groups || []) {
    for (const route of group.routes || []) {
      try {
        const u = new URL(route.path, 'http://localhost');
        const key = u.pathname;
        if (!index.has(key)) index.set(key, []);
        index.get(key).push({ group: group.title || group.id, ...route, pathname: u.pathname, search: u.search });
      } catch {}
    }
  }
  return index;
}

// Render placeholder using file-based template
function renderPlaceholder(res, baseUrl, pathname, entries, req) {
  const title = entries[0]?.title || pathname;
  const queryString = Object.entries(req.query || {})
    .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : v}`)
    .join('&');
  res.render('placeholder', {
    baseUrl,
    pathname,
    entries,
    title,
    method: req.method,
    queryString
  });
}

app.use((req, res, next) => {
  // Skip if static/known routes
  if (req.path === '/' || req.path.startsWith('/__') || req.path.startsWith('/assets')) return next();
  const catalog = loadCatalog();
  const idx = buildRouteIndex(catalog);
  if (idx.has(req.path)) {
    renderPlaceholder(res, catalog.baseUrl, req.path, idx.get(req.path), req);
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`Printeer mock launcher running at http://localhost:${PORT}`);
});
