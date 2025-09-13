# Enhanced Printing Mock Test Express Server

A local Express server you can run during development to provide a comprehensive set of test pages and APIs that exercise every major feature of the enhanced Printeer CLI and printing pipeline.

This server is documentation-first. It describes the structure, endpoints, and sample code to copy into `examples/mock-server.js` (or `.ts`) when you're ready. Per request, no repository code or configs are changed yet.

## Goals

- Cover all printing scenarios: page formats, margins, headers/footers, media type, viewport, scale, background, quality, clipping, and tagged-PDF-friendly structure.
- Exercise waiting strategies: timeouts, selectors, network idle, custom functions.
- Test authentication and headers: Basic, Bearer, form login, cookies, CSRF, custom headers.
- Validate batch processing: redirects, errors, flakes, slow resources, retries.
- Verify resource controls: blocklists, caching, compression, CSP, large assets, 404/500.
- Support template testing: header/footer/content variables and quick previews.
- Provide internationalization, RTL, web fonts, and print-specific CSS.

## Installation (dev-only)

Install dependencies as devDependencies (don’t commit yet if you’re only evaluating):

```bash
npm i -D express cookie-parser
# Optional extras for advanced scenarios (recommended):
npm i -D compression helmet cors
```

## Suggested file locations (no files created yet)

- `examples/mock-server.js` — Express app with all endpoints (ESM since the repo uses "type": "module").
- `examples/assets/` — Optional static assets (images, CSS, JS, fonts). You can generate most assets dynamically, but a static folder is convenient.

## How to run (once added)

1) Create `examples/mock-server.js` using the sample below.
2) Optionally add script to `package.json` (dev-only):

```jsonc
// scripts snippet
{
	"scripts": {
		"mock:server": "node examples/mock-server.js"
	}
}
```

3) Start the server:

```bash
npm run mock:server
```

The server defaults to http://localhost:4000 (configurable via `PORT`).

## Endpoint Catalog (by feature)

The endpoints are grouped to map 1:1 with CLI features and the design doc.

### 1) Basic pages and layout

- GET `/` — Landing page with navigation to all sections. Includes meta/title for filename generation.
- GET `/static/simple` — Simple semantic HTML, predictable title.
- GET `/static/long?pages=5` — Multi-page content (repeated sections) to validate pagination.
- GET `/static/rtl` — RTL language with Arabic/Hebrew sample text.
- GET `/static/fonts` — Loads a webfont (e.g., Google Fonts) and local fallback.
- GET `/static/images` — Grid of images (SVG + raster) to test background and quality.

### 2) Print CSS and page formatting

- GET `/print/css-default` — Has `@media print` with subtle differences from screen.
- GET `/print/no-print-elements` — Elements hidden with `.no-print` under `@media print`.
- GET `/print/page-breaks` — Explicit `page-break-before/after/inside` examples.
- GET `/print/margins?top=1in&right=1in&bottom=1in&left=1in` — Visual rulers to validate margins.
- GET `/print/header-footer-demo` — Static header/footer placeholders for template testing.

### 3) Dynamic/SPA and wait strategies

- GET `/spa/delay-content?ms=2000` — Injects key content after a delay to test `wait-for-selector`.
- GET `/spa/network-idle?requests=5` — Triggers a burst of XHR/fetch calls, then becomes idle.
- GET `/spa/title-late?ms=1000` — Changes `<title>` after delay to test filename-from-title.
- GET `/spa/interactive` — Loads content on click or IntersectionObserver visibility.

### 4) Authentication and headers

- GET `/auth/basic` — Requires HTTP Basic Auth (401 with `WWW-Authenticate` otherwise).
- GET `/auth/bearer` — Requires `Authorization: Bearer <token>`.
- POST `/auth/login` — Accepts form credentials, sets session cookie.
- GET `/auth/protected` — Requires a specific cookie (set by `/auth/login`).
- GET `/debug/headers` — Echoes request headers for verification.
- GET `/debug/cookies` — Echoes cookie values.

### 5) Redirects and navigation

- GET `/redirect/chain?n=3&to=/static/simple` — Produces a chain of `n` 302 redirects.
- GET `/redirect/loop` — Infinite redirect to test failure handling.
- GET `/redirect/delay?ms=1000&to=/static/simple` — Delayed redirect.

### 6) Resources and performance

- GET `/assets/slow.js?ms=1500` — JS that responds after delay.
- GET `/assets/slow.css?ms=1500` — CSS with delay.
- GET `/assets/large-image.svg?kb=1024` — Generates an SVG of target size.
- GET `/assets/random-image` — Returns a dynamically generated SVG rasterized via data URI.
- GET `/assets/missing` — 404 response for missing assets.

### 7) Errors and resilience

- GET `/error/500` — Always returns HTTP 500.
- GET `/error/timeout?ms=10000` — Holds the connection open to trigger client timeout.
- GET `/error/reset` — Abruptly terminates the socket.

### 8) Internationalization

- GET `/i18n/utf8` — Rich UTF-8 sample (accents, emoji).
- GET `/i18n/cjk` — CJK text blocks with headings.
- GET `/i18n/arabic` — Arabic sample (RTL), with proper `dir="rtl"`.

### 9) Media emulation and responsive

- GET `/media/print-vs-screen` — Visually different styles between screen and print.
- GET `/viewport/responsive` — Breakpoint grid; includes meta viewport.

### 10) Templates and variables

- GET `/template/header` — Simple header with query-driven variables (e.g., `?company=Acme&date=...`).
- GET `/template/footer` — Simple footer with variables (e.g., page number placeholders as text for visual reference).
- GET `/template/content` — Content page demonstrating interpolation (server-side) for preview.

### 11) Caching, compression, CSP (optional extras)

- GET `/cache/cacheable` — Sets `Cache-Control: public, max-age=…`.
- GET `/cache/no-store` — Sets `Cache-Control: no-store`.
- GET `/csp/strict` — Strong CSP header to test blocked resources (if using `helmet`).
- GET `/compress/text` — Returns large text (if using `compression`).

## Copy-paste server (ESM) — examples/mock-server.js

This example implements the representative endpoints above. You can start with this and expand.

```js
// examples/mock-server.js (ESM)
import express from 'express';
import cookieParser from 'cookie-parser';

// Optional extras if installed
// import compression from 'compression';
// import helmet from 'helmet';
// import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
// app.use(compression());
// app.use(helmet());
// app.use(cors());

// --- Helpers ---------------------------------------------------------------
const html = (title, body, opts = {}) => `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${title}</title>
	${opts.printCss || ''}
</head>
<body>
	<header><nav><a href="/">Home</a></nav></header>
	<main>${body}</main>
	<footer><small>Mock Server · ${new Date().toISOString()}</small></footer>
</body>
</html>`;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Index ----------------------------------------------------------------
app.get('/', (req, res) => {
	const links = [
		['Static simple', '/static/simple'],
		['Long content', '/static/long?pages=5'],
		['RTL sample', '/static/rtl'],
		['Fonts', '/static/fonts'],
		['Images', '/static/images'],
		['Print CSS default', '/print/css-default'],
		['No-print elements', '/print/no-print-elements'],
		['Page breaks', '/print/page-breaks'],
		['Margins', '/print/margins?top=1in&right=1in&bottom=1in&left=1in'],
		['Header/Footer demo', '/print/header-footer-demo'],
		['SPA delay content', '/spa/delay-content?ms=1500'],
		['SPA network idle', '/spa/network-idle?requests=3'],
		['Title late', '/spa/title-late?ms=1000'],
		['Auth protected (Basic)', '/auth/basic'],
		['Auth protected (Bearer)', '/auth/bearer'],
		['Auth login (cookie)', '/auth/login'],
		['Protected via cookie', '/auth/protected'],
		['Redirect chain', '/redirect/chain?n=2&to=/static/simple'],
		['Slow JS', '/assets/slow.js?ms=1200'],
		['Large SVG', '/assets/large-image.svg?kb=256'],
		['500 error', '/error/500'],
		['UTF-8', '/i18n/utf8'],
		['CJK', '/i18n/cjk'],
		['Arabic', '/i18n/arabic'],
		['Media print vs screen', '/media/print-vs-screen'],
		['Responsive viewport', '/viewport/responsive'],
		['Template header', '/template/header?company=Acme&date=2025-09-12'],
		['Template footer', '/template/footer?company=Acme'],
	]
		.map(([t, u]) => `<li><a href="${u}">${t}</a></li>`)
		.join('');
	res.type('html').send(html('Printeer Mock', `<h1>Printeer Mock</h1><ul>${links}</ul>`));
});

// --- Static ---------------------------------------------------------------
app.get('/static/simple', (req, res) => {
	res.type('html').send(html('Simple Page', '<h1>Simple</h1><p>Hello, world.</p>'));
});

app.get('/static/long', (req, res) => {
	const pages = Number(req.query.pages ?? 5);
	const blocks = Array.from({ length: pages * 3 }, (_, i) => `<section><h2>Block ${i + 1}</h2><p>${'Lorem ipsum '.repeat(50)}</p></section>`).join('');
	res.type('html').send(html(`Long (${pages} pages)`, `<h1>Long Content</h1>${blocks}`));
});

app.get('/static/rtl', (req, res) => {
	const body = `<section dir="rtl" style="direction:rtl;text-align:right">
		<h1>نص عربي</h1>
		<p>هذا نص عربي لاختبار اتجاه الكتابة من اليمين إلى اليسار.</p>
	</section>`;
	res.type('html').send(html('RTL Sample', body));
});

app.get('/static/fonts', (req, res) => {
	const body = `
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;600&display=swap" rel="stylesheet">
	<style> .inter{font-family: 'Inter', system-ui, sans-serif;} </style>
	<h1 class="inter">Inter Webfont</h1>
	<p class="inter">This text uses a webfont to verify font embedding/printing.</p>`;
	res.type('html').send(html('Webfonts', body));
});

app.get('/static/images', (req, res) => {
	const img = (w, h, color) => `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><rect width='100%' height='100%' fill='${color}'/><text x='50%' y='50%' alignment-baseline='middle' text-anchor='middle' fill='white' font-size='24'>${w}x${h}</text></svg>`;
	const body = `<h1>Images</h1><div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px">${[
		[200, 150, 'tomato'], [300, 200, 'royalblue'], [400, 300, 'seagreen'],
	].map(([w,h,c]) => `<img src="${img(w,h,c)}" alt="${w}x${h}"/>`).join('')}</div>`;
	res.type('html').send(html('Images', body));
});

// --- Print CSS ------------------------------------------------------------
app.get('/print/css-default', (req, res) => {
	const css = `<style>
	@media print { body { background: white !important; } h1 { color: darkslateblue; } }
	</style>`;
	res.type('html').send(html('Print CSS Default', `<h1>Print me</h1><p>Check print media overrides.</p>`, { printCss: css }));
});

app.get('/print/no-print-elements', (req, res) => {
	const css = `<style>@media print { .no-print { display:none !important } }</style>`;
	const body = `<h1>Some parts hide on print</h1><p class="no-print">This should be hidden in print.</p>`;
	res.type('html').send(html('No-Print Elements', body, { printCss: css }));
});

app.get('/print/page-breaks', (req, res) => {
	const css = `<style>@media print { .page-break { page-break-before: always; } }</style>`;
	const body = `<h1>Page Breaks</h1><p>First page content</p><div class="page-break"></div><p>Second page content</p>`;
	res.type('html').send(html('Page Breaks', body, { printCss: css }));
});

app.get('/print/margins', (req, res) => {
	const { top='1in', right='1in', bottom='1in', left='1in' } = req.query;
	const css = `<style>@page { margin: ${top} ${right} ${bottom} ${left}; }</style>`;
	const body = `<h1>Margins</h1><p>Top:${top}, Right:${right}, Bottom:${bottom}, Left:${left}</p>`;
	res.type('html').send(html('Margins', body, { printCss: css }));
});

app.get('/print/header-footer-demo', (req, res) => {
	const body = `<h1>Header/Footer Demo</h1><p>Use your CLI header/footer template injection to replace or complement this.</p>`;
	res.type('html').send(html('Header Footer Demo', body));
});

// --- SPA / Dynamic --------------------------------------------------------
app.get('/spa/delay-content', async (req, res) => {
	const ms = Number(req.query.ms ?? 1500);
	const body = `
		<h1>Delayed Content</h1>
		<div id="holder">Waiting...</div>
		<script>setTimeout(()=>{ document.getElementById('holder').innerHTML = '<strong id="ready">READY</strong>'; }, ${ms});</script>
	`;
	res.type('html').send(html('Delay Content', body));
});

app.get('/spa/network-idle', (req, res) => {
	const requests = Number(req.query.requests ?? 3);
	const body = `
	<h1>Network Idle</h1>
	<script>
		let done = 0;
		for (let i=0;i<${requests};i++) {
			fetch('/assets/slow.js?ms=' + (300 + i*200)).then(()=>{ done++; if (done === ${requests}) { const x = document.createElement('div'); x.id='idle'; x.textContent='IDLE'; document.body.appendChild(x); } });
		}
	</script>`;
	res.type('html').send(html('Network Idle', body));
});

app.get('/spa/title-late', async (req, res) => {
	const ms = Number(req.query.ms ?? 1000);
	const body = `
	<h1>Title changes late</h1>
	<script>setTimeout(()=>{ document.title = 'Late Title ' + Date.now(); }, ${ms});</script>`;
	res.type('html').send(html('Initial Title', body));
});

// --- Auth -----------------------------------------------------------------
app.get('/auth/basic', (req, res) => {
	const auth = req.headers['authorization'];
	if (!auth || !auth.startsWith('Basic ')) {
		res.set('WWW-Authenticate', 'Basic realm="mock"');
		return res.status(401).send('Auth required');
	}
	res.type('html').send(html('Basic OK', '<h1>Basic Auth OK</h1>'));
});

app.get('/auth/bearer', (req, res) => {
	const token = (req.headers['authorization'] || '').toString().replace('Bearer ', '');
	if (token !== 'test-token') return res.status(401).send('Invalid token');
	res.type('html').send(html('Bearer OK', '<h1>Bearer OK</h1>'));
});

app.post('/auth/login', (req, res) => {
	const { username, password } = req.body;
	if (username === 'user' && password === 'pass') {
		res.cookie('session', 'mock-session', { httpOnly: true });
		return res.type('html').send(html('Logged In', '<h1>Logged In</h1>'));
	}
	res.status(401).type('html').send(html('Login Failed', '<h1>Login Failed</h1>'));
});

app.get('/auth/protected', (req, res) => {
	if (req.cookies.session !== 'mock-session') return res.status(401).send('Not logged in');
	res.type('html').send(html('Protected', '<h1>Protected Content</h1>'));
});

app.get('/debug/headers', (req, res) => {
	res.json({ headers: req.headers });
});

app.get('/debug/cookies', (req, res) => {
	res.json({ cookies: req.cookies });
});

// --- Redirects ------------------------------------------------------------
app.get('/redirect/chain', (req, res) => {
	const n = Number(req.query.n ?? 1);
	const to = (req.query.to || '/static/simple').toString();
	if (n <= 0) return res.redirect(to);
	res.redirect(`/redirect/chain?n=${n - 1}&to=${encodeURIComponent(to)}`);
});

app.get('/redirect/loop', (req, res) => {
	res.redirect('/redirect/loop');
});

app.get('/redirect/delay', async (req, res) => {
	const ms = Number(req.query.ms ?? 1000);
	const to = (req.query.to || '/static/simple').toString();
	await delay(ms);
	res.redirect(to);
});

// --- Assets / Resources ---------------------------------------------------
app.get('/assets/slow.js', async (req, res) => {
	const ms = Number(req.query.ms ?? 1000);
	await delay(ms);
	res.type('application/javascript').send(`console.log('slow js ${ms}ms loaded');`);
});

app.get('/assets/slow.css', async (req, res) => {
	const ms = Number(req.query.ms ?? 1000);
	await delay(ms);
	res.type('text/css').send(`body{outline:1px solid rgba(0,0,0,.05)}`);
});

app.get('/assets/large-image.svg', (req, res) => {
	const kb = Number(req.query.kb ?? 1024);
	const payload = 'A'.repeat(kb * 1024);
	res.type('image/svg+xml').send(`<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><text x='10' y='50'>${payload}</text></svg>`);
});

app.get('/assets/random-image', (req, res) => {
	const color = ['tomato','royalblue','seagreen','purple'][Math.floor(Math.random()*4)];
	res.type('image/svg+xml').send(`<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'><rect width='100%' height='100%' fill='${color}'/></svg>`);
});

app.get('/assets/missing', (req, res) => {
	res.status(404).send('Not Found');
});

// --- Errors ---------------------------------------------------------------
app.get('/error/500', (req, res) => res.status(500).send('Server error'));
app.get('/error/timeout', async (req, res) => { const ms = Number(req.query.ms ?? 10000); await delay(ms); res.send('Late'); });
app.get('/error/reset', (req, res) => { req.socket.destroy(); });

// --- I18N -----------------------------------------------------------------
app.get('/i18n/utf8', (req, res) => {
	res.type('html').send(html('UTF-8', '<h1>UTF-8 ✓</h1><p>Zażółć gęślą jaźń — café — naïve — résumé — emojis 😄🚀.</p>'));
});

app.get('/i18n/cjk', (req, res) => {
	res.type('html').send(html('CJK', '<h1>中文/日本語/한국어</h1><p>漢字かな交じり文。ひらがな、カタカナ、漢字。한글 테스트.</p>'));
});

app.get('/i18n/arabic', (req, res) => {
	const body = `<section dir="rtl" style="direction:rtl;text-align:right"><h1>العربية</h1><p>مثال للنص العربي مع اتجاه من اليمين إلى اليسار.</p></section>`;
	res.type('html').send(html('Arabic', body));
});

// --- Media / Responsive ---------------------------------------------------
app.get('/media/print-vs-screen', (req, res) => {
	const css = `<style>@media print { body { background: #fff; } h1 { color: firebrick; } } @media screen { h1 { color: seagreen; } }</style>`;
	res.type('html').send(html('Media Demo', '<h1>Media differences</h1>', { printCss: css }));
});

app.get('/viewport/responsive', (req, res) => {
	const body = `<style>
		.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
		.card{background:#eee;padding:10px;border-radius:6px}
	</style>
	<h1>Responsive Grid</h1>
	<div class="grid">${Array.from({length:12},(_,i)=>`<div class="card">Item ${i+1}</div>`).join('')}</div>`;
	res.type('html').send(html('Responsive', body));
});

// --- Templates ------------------------------------------------------------
app.get('/template/header', (req, res) => {
	const company = (req.query.company || 'Company').toString();
	const date = (req.query.date || new Date().toISOString()).toString();
	const body = `<div style="font-family:Arial, sans-serif; border-bottom:1px solid #ccc; padding:8px 0;">
		<strong>${company}</strong> · <span>${date}</span>
	</div>`;
	res.type('html').send(html('Header Template', body));
});

app.get('/template/footer', (req, res) => {
	const company = (req.query.company || 'Company').toString();
	const body = `<div style="font-family:Arial, sans-serif; border-top:1px solid #ccc; padding:8px 0; text-align:center; font-size:12px; color:#666;">
		${company} · Page {{pageNumber}} of {{totalPages}}
	</div>`;
	res.type('html').send(html('Footer Template', body));
});

app.get('/template/content', (req, res) => {
	const name = (req.query.name || 'Customer').toString();
	const body = `<h1>Content Template</h1><p>Hello, ${name}.</p>`;
	res.type('html').send(html('Content Template', body));
});

// --- Cache / CSP / Compression (if extras installed) ----------------------
app.get('/cache/cacheable', (req, res) => { res.set('Cache-Control','public, max-age=86400'); res.send('cacheable'); });
app.get('/cache/no-store', (req, res) => { res.set('Cache-Control','no-store'); res.send('no-store'); });
app.get('/csp/strict', (req, res) => { res.set('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'" ); res.type('html').send(html('CSP Strict', '<h1>CSP Strict</h1><img src="/assets/random-image"/>')); });
app.get('/compress/text', (req, res) => { const big = 'Line\n'.repeat(5000); res.type('text/plain').send(big); });

app.listen(PORT, () => {
	console.log(`Mock server listening on http://localhost:${PORT}`);
});
```

## Mapping endpoints to CLI options

Below are representative CLI invocations (adjust paths/flags to your environment). Use `npm run printeer --` to pass args to your existing dev runner, or `node scripts/run-cli.js` directly.

Note: Commands assume the server is on http://localhost:4000.

### Page size, margins, background, print CSS

```bash
npm run printeer -- convert \
	--url http://localhost:4000/print/margins?top=1in&right=0.5in&bottom=1in&left=0.5in \
	--format A4 \
	--print-background \
	--output ./out/margins-a4.pdf
```

### Wait for selector (dynamic content)

```bash
npm run printeer -- convert \
	--url "http://localhost:4000/spa/delay-content?ms=2000" \
	--wait-for-selector "#ready" \
	--output ./out/wait-selector.pdf
```

### Wait for network idle

```bash
npm run printeer -- convert \
	--url "http://localhost:4000/spa/network-idle?requests=5" \
	--wait-until networkidle \
	--output ./out/network-idle.pdf
```

### Auth: Basic

```bash
npm run printeer -- convert \
	--url http://localhost:4000/auth/basic \
	--basic-auth user:pass \
	--output ./out/auth-basic.pdf
```

### Auth: Bearer

```bash
npm run printeer -- convert \
	--url http://localhost:4000/auth/bearer \
	--header "Authorization: Bearer test-token" \
	--output ./out/auth-bearer.pdf
```

### Auth: Cookie flow

```bash
# 1) Log in to set cookie
curl -X POST -d "username=user&password=pass" http://localhost:4000/auth/login -c cookies.txt

# 2) Use cookie for protected page
npm run printeer -- convert \
	--url http://localhost:4000/auth/protected \
	--cookie-file ./cookies.txt \
	--output ./out/auth-cookie.pdf
```

### Redirect handling

```bash
npm run printeer -- convert \
	--url "http://localhost:4000/redirect/chain?n=3&to=/static/simple" \
	--output ./out/redirect-chain.pdf
```

### Resource blocking and quality

```bash
npm run printeer -- convert \
	--url http://localhost:4000/static/images \
	--block-resources "image,font" \
	--output ./out/blocked.pdf
```

### Header/Footer template testing

```bash
npm run printeer -- convert \
	--url http://localhost:4000/static/long?pages=4 \
	--header-template-file ./templates/header.html \
	--footer-template-file ./templates/footer.html \
	--output ./out/templates.pdf
```

### Title-based filename generation

```bash
npm run printeer -- convert \
	--url http://localhost:4000/spa/title-late?ms=1000 \
	--output-dir ./out \
	--title-fallback
```

## Scenario checklist for regression/batch suites

Use this as a guide to build automated or manual runs:

- Multi-URL convert with mixed outputs (PDF/PNG/WebP) using `/static/simple`, `/static/images`, and `/media/print-vs-screen`.
- Batch with redirects and one error (`/redirect/chain`, `/error/500`). Ensure retry works as expected.
- Dynamic waits: `/spa/delay-content` with `--wait-for-selector`, `/spa/network-idle` with `--wait-until networkidle`.
- Auth matrix: `basic`, `bearer`, and `cookie` flow; verify headers/cookies using `/debug/headers` and `/debug/cookies`.
- Page layout: margins (`/print/margins`), page breaks (`/print/page-breaks`), no-print elements (`/print/no-print-elements`).
- I18N/RTL: `/i18n/utf8`, `/i18n/cjk`, `/i18n/arabic`.
- Resource stress: `/assets/slow.js`, `/assets/large-image.svg`, `/assets/missing`.
- CSP/compression/cache (if extras installed): `/csp/strict`, `/compress/text`, `/cache/*`.

## Notes

- Keep the mock server deterministic where possible (timestamps can vary). For reproducible tests, prefer explicit titles and seeded content.
- You can parameterize nearly every endpoint via query strings to avoid creating many distinct routes.
- If you need true static assets, mount `express.static` on `/static-assets` pointing to a local folder.
- For unit tests, consider spinning up the server programmatically on an ephemeral port and tearing it down in `beforeAll/afterAll`.

---

When you’re ready, copy the server into `examples/mock-server.js`, install devDependencies, and add the `mock:server` script. This gives you a stable playground to validate every CLI feature end-to-end.
