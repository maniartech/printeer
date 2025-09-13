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

function renderPlaceholderHTML(baseUrl, pathname, entries, req) {
  const title = entries[0]?.title || pathname;
  const items = entries
    .map(e => `<li><code>${e.method || 'GET'}</code> <a href="${baseUrl}${e.path}">${e.title || e.path}</a></li>`) // e.path may include query
    .join('');
  const query = Object.entries(req.query || {})
    .map(([k,v]) => `${k}=${Array.isArray(v)?v.join(','):v}`)
    .join('&');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title} – Placeholder</title>
  <link rel="stylesheet" href="/assets/styles.css"/>
  <style>.placeholder{padding:24px}.placeholder h1{margin-top:0}.kv{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:#a9b7ff}</style>
  </head>
<body>
  <div class="placeholder">
    <p><a class="button" href="/">← Back to Launcher</a></p>
    <h1>${title}</h1>
    <p>This endpoint is listed in the catalog but not yet implemented. Use it to verify CLI flags and URLs for now.</p>
    <h3>Catalog variants</h3>
    <ul>${items}</ul>
    <h3>Request</h3>
    <div class="kv">${req.method} ${pathname}${query?('?'+query):''}</div>
  </div>
</body>
</html>`;
}

app.use((req, res, next) => {
  // Skip if static/known routes
  if (req.path === '/' || req.path.startsWith('/__') || req.path.startsWith('/assets')) return next();
  const catalog = loadCatalog();
  const idx = buildRouteIndex(catalog);
  if (idx.has(req.path)) {
    const html = renderPlaceholderHTML(catalog.baseUrl, req.path, idx.get(req.path), req);
    res.status(200).send(html);
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`Printeer mock launcher running at http://localhost:${PORT}`);
});
