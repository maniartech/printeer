# Enhanced Printing Mock Test Express Server

A dedicated, standalone mock web server (own package) you can run during development to test every major feature of the enhanced Printeer CLI and printing pipeline.

It ships with:
- A grouped launcher homepage that links to all endpoints for easy navigation.
- A machine-readable catalog endpoint (`/__catalog.json`) for automated test discovery.
- Comprehensive routes covering print CSS, SPA/waits, auth, redirects, resources, errors, i18n, media, templates, and cache/CSP.

Additionally, all endpoint groups are designed to live as dedicated sub-packages, each with its own `templates/` directory so pages can be edited as HTML files rather than embedded as strings in JavaScript.

## Goals

- Cover all printing scenarios: page formats, margins, headers/footers, media type, viewport, scale, background, quality, clipping, and tagged-PDF-friendly structure.
- Exercise waiting strategies: timeouts, selectors, network idle, custom functions.
- Test authentication and headers: Basic, Bearer, form login, cookies, CSRF, custom headers.
- Validate batch processing: redirects, errors, flakes, slow resources, retries.
- Verify resource controls: blocklists, caching, compression, CSP, large assets, 404/500.
- Support template testing: header/footer/content variables and quick previews.
- Provide internationalization, RTL, web fonts, and print-specific CSS.

## Package layout (dedicated package)

```
mock-server/
	package.json         # standalone dev package (private)
	server.js            # Express app with grouped launcher and routes
	README.md            # Quick usage
	packages/            # (Recommended) one subpackage per feature group
		basic/
			package.json
			routes.js        # exports an Express.Router and group metadata
			templates/       # .html (and optional .css/.js) used by routes
		print/
			package.json
			routes.js
			templates/
		dynamic/
			...
		auth/
			...
		redirects/
			...
		resources/
			...
		errors/
			...
		i18n/
			...
		media/
			...
		templates-group/   # to avoid clash with folder name "templates"
			...
		cache-csp/
			...
```

This package is not published and is intended for local development/testing only.

## Install & run

```bash
cd mock-server
npm install
npm start
# Server runs at http://localhost:4000 (override with PORT)
```

Optional root convenience (no changes made by default):

```jsonc
// Add to repository root package.json if desired
{
	"scripts": {
		"mock:server": "npm --prefix ./mock-server start"
	}
}
```

## Launcher & catalog

- Homepage: `GET /` — Groups all endpoints by feature area with clickable links.
- Catalog: `GET /__catalog.json` — Returns `{ port, groups: [...] }` where each group contains `title` and `routes` (path, title, optional method). Use this in automated suites to iterate scenarios.

### Launcher UI (beautiful, searchable homepage)

The mock server includes a polished launcher you can open in a browser to manually explore and test every URL.

- Location: `GET /` (served from `mock-server/public/index.html`)
- Styling and behavior: `mock-server/public/styles.css`, `mock-server/public/launcher.js`
- Data source: `mock-server/catalog.json` (single source of truth for groups and routes)

Key features:
- Instant search by route name, path, or group
- Cards grouped by feature area (Basic, Print, Dynamic, Auth, Redirects, Resources, Errors, i18n, Media, Templates, Cache/CSP, Image)
- Per-route method badges and direct links (open in new tab)
- Quick links to Catalog JSON and Health endpoint

How it works:
1) The server serves `/__catalog.json`, derived from `mock-server/catalog.json`, enriched with `port` and `baseUrl`.
2) The launcher fetches `/__catalog.json` and renders groups and routes.
3) If a route is listed in the catalog but not yet implemented, a friendly placeholder page is shown instead of 404 (so you can still click and test URLs immediately).

Adding a route to the launcher:
- Edit `mock-server/catalog.json` and add an entry under the appropriate group, for example:

```jsonc
{
	"id": "print",
	"title": "Print CSS & Page Formatting",
	"routes": [
		{ "path": "/print/scale-markers", "title": "Scale markers" },
		{ "path": "/print/margins?top=1in&right=1in&bottom=1in&left=1in", "title": "Margins" }
	]
}
```

- The launcher updates automatically on refresh. Implement the actual route in your group sub-package (or temporarily rely on the placeholder until migration is done).

Environment variables:
- `PORT` — port to bind (default `4000`)
- `MOCK_BASE_URL` — override base URL in catalog (useful if reverse-proxying the server)

Optional enhancements (future):
- “Copy printeer command” button next to each route to prefill CLI examples
- Filters for method (GET/POST) or tag-based filtering per route
- Collapsible groups with remembered state

### Auto-discovery (recommended)

- The root server can auto-discover group sub-packages under `mock-server/packages/*` and mount their exported routers.
- Each sub-package should export a small metadata object used to populate the launcher and catalog. Example shape:

```ts
// packages/<group>/routes.js
export const group = {
	id: 'print',
	title: 'Print CSS & Page Formatting',
	routes: [
		{ path: '/print/css-default', title: 'Print CSS overrides' },
		// ...
	],
};

export function createRouter() { /* return Express.Router() with endpoints */ }
```

The root server can combine all `group` objects into a single catalog and render the grouped launcher automatically.

## Endpoint Catalog (by feature)

The endpoints are grouped to map 1:1 with CLI features and the design doc.

### 1) Basic pages and layout

- GET `/` — Landing page with navigation to all sections. Includes meta/title for filename generation.
- GET `/static/simple` — Simple semantic HTML, predictable title.
- GET `/static/long?pages=5` — Multi-page content (repeated sections) to validate pagination.
- GET `/static/rtl` — RTL language with Arabic/Hebrew sample text.
- GET `/static/fonts` — Loads a webfont (e.g., Google Fonts) and local fallback.
- GET `/static/images` — Grid of images (SVG + raster) to test background and quality.
- GET `/debug/ua` — Echoes user agent and device info derived from request headers.
- GET `/debug/echo` — Echos method, query, and body (useful for testing POST data and headers).

### 2) Print CSS and page formatting

- GET `/print/css-default` — Has `@media print` with subtle differences from screen.
- GET `/print/no-print-elements` — Elements hidden with `.no-print` under `@media print`.
- GET `/print/page-breaks` — Explicit `page-break-before/after/inside` examples.
- GET `/print/margins?top=1in&right=1in&bottom=1in&left=1in` — Visual rulers to validate margins.
- GET `/print/header-footer-demo` — Static header/footer placeholders for template testing.
- GET `/print/custom-size?width=210mm&height=99mm` — Visual guides for testing custom page sizes.
- GET `/print/orientation?landscape=true` — Content aligned to verify landscape vs portrait.
- GET `/print/scale-markers` — Millimeter/inch rulers and grids to validate `--scale`.
- GET `/print/css-page-size` — Uses `@page size: A5;` to validate `--prefer-css-page-size`.
- GET `/pdf/tagged-structure` — Landmark roles and semantic tags to test tagged-PDF friendliness.
- GET `/print/page-ranges-demo?pages=10` — Long document with labeled page numbers to test `--page-ranges`.

### 3) Dynamic/SPA and wait strategies

- GET `/spa/delay-content?ms=2000` — Injects key content after a delay to test `wait-for-selector`.
- GET `/spa/network-idle?requests=5` — Triggers a burst of XHR/fetch calls, then becomes idle.
- GET `/spa/title-late?ms=1000` — Changes `<title>` after delay to test filename-from-title.
- GET `/spa/interactive` — Loads content on click or IntersectionObserver visibility.
- GET `/spa/custom-ready?ms=2000` — Sets `window.__ready = true` after delay to test `--wait-for-function`.

### 4) Authentication and headers

- GET `/auth/basic` — Requires HTTP Basic Auth (401 with `WWW-Authenticate` otherwise).
- GET `/auth/bearer` — Requires `Authorization: Bearer <token>`.
- POST `/auth/login` — Accepts form credentials, sets session cookie.
- GET `/auth/protected` — Requires a specific cookie (set by `/auth/login`).
- GET `/auth/csrf-login` — GET serves form with CSRF token (cookie + hidden field), POST validates and sets session.
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
- GET `/assets/huge-css?kb=256` — Large CSS payload to exercise bandwidth and compression.
- GET `/assets/huge-js?kb=512` — Large JS payload to stress resource loading and blocking.

### 7) Errors and resilience

- GET `/error/500` — Always returns HTTP 500.
- GET `/error/timeout?ms=10000` — Holds the connection open to trigger client timeout.
- GET `/error/reset` — Abruptly terminates the socket.
- GET `/error/flaky?fail=2` — Deterministically fails the first N requests, then succeeds (to test retries).

### 8) Internationalization

- GET `/i18n/utf8` — Rich UTF-8 sample (accents, emoji).
- GET `/i18n/cjk` — CJK text blocks with headings.
- GET `/i18n/arabic` — Arabic sample (RTL), with proper `dir="rtl"`.
- GET `/debug/intl` — Echo page showing Intl-formatted date/number for current locale/timezone.

### 9) Media emulation and responsive

- GET `/media/print-vs-screen` — Visually different styles between screen and print.
- GET `/viewport/responsive` — Breakpoint grid; includes meta viewport.
- GET `/viewport/dsf-markers` — CSS pixel vs device pixel markers for validating device scale factor.
- GET `/media/color-scheme` — Adapts styles based on `prefers-color-scheme` (light/dark) to verify emulation.

### 10) Templates and variables

- GET `/template/header` — Simple header with query-driven variables (e.g., `?company=Acme&date=...`).
- GET `/template/footer` — Simple footer with variables (e.g., page number placeholders as text for visual reference).
- GET `/template/content` — Content page demonstrating interpolation (server-side) for preview.
- GET `/template/header-variables` — Demonstrates all supported header variables and placeholders.
- GET `/template/footer-variables` — Demonstrates all supported footer variables and placeholders.

### 11) Caching, compression, CSP (optional extras)

- GET `/cache/cacheable` — Sets `Cache-Control: public, max-age=…`.
- GET `/cache/no-store` — Sets `Cache-Control: no-store`.
- GET `/csp/strict` — Strong CSP header to test blocked resources (if using `helmet`).
- GET `/compress/text` — Returns large text (if using `compression`).
- GET `/debug/console` — Emits console messages based on query (e.g., `?error=1&warn=2`).

### 12) Image capture and clipping

- GET `/image/clip-target` — Page with a clearly marked rectangle and coordinates to validate `--clip` options.
- GET `/image/transparent-bg` — Transparent background canvas to test `--omit-background` and PNG/WebP alpha.
- GET `/image/quality-grid` — Gradients and fine details to assess `--quality` for JPEG/WebP outputs.

---

## Comprehensive URL coverage matrix (CLI feature → endpoint)

Use this list to ensure every CLI option has at least one deterministic target URL.

- Page format (A4/A3/Letter/Legal): any long page; prefer `/static/long?pages=5` or `/print/margins`.
- Custom page size: `/print/custom-size?width=210mm&height=99mm`.
- Orientation (landscape/portrait): `/print/orientation?landscape=true`.
- Margins (unified/per-side): `/print/margins?top=1in&right=0.5in&bottom=1in&left=0.5in`.
- Prefer CSS page size: `/print/css-page-size`.
- Scale: `/print/scale-markers`.
- Print background: `/static/images` or `/media/print-vs-screen`.
- Headers/Footers (template files): content from `/static/long?pages=4` + template previews at `/template/header`, `/template/footer`, `/template/header-variables`, `/template/footer-variables`.
- Tagged PDFs: `/pdf/tagged-structure`.
- Viewport size: `/viewport/responsive`.
- Device emulation (mobile/DSF): `/viewport/responsive` (verify with `/debug/ua`).
- Device scale factor: `/viewport/dsf-markers`.
- Media type emulation (screen/print): `/media/print-vs-screen`.
- Image outputs (PNG/JPEG/WebP): `/static/images`, `/image/quality-grid`.
- Image quality (JPEG/WebP): `/image/quality-grid`.
- Screenshot clipping: `/image/clip-target`.
- Full-page screenshot: `/static/long?pages=3`.
- Wait for selector: `/spa/delay-content?ms=2000` (e.g., `#ready`).
- Wait for network idle: `/spa/network-idle?requests=5`.
- Wait for function: `/spa/custom-ready?ms=2000` with predicate `() => window.__ready === true`.
- Wait fixed time: any endpoint (e.g., `/static/simple`) using CLI `--wait-for-time`.
- Wait-until load/DOMContentLoaded: `/static/simple` (use CLI `--wait-until load|domcontentloaded`).
- Disable JavaScript: `/spa/delay-content?ms=2000` (content remains missing when JS is disabled).
- Title-based filename: `/spa/title-late?ms=1000` and `/static/simple`.
- Basic Auth: `/auth/basic`.
- Bearer token: `/auth/bearer`.
- Cookie login flow: `/auth/login` → `/auth/protected`.
- CSRF login flow: `/auth/csrf-login` (GET then POST), then `/auth/protected`.
- Custom headers: `/debug/headers`.
- Cookies echo/verify: `/debug/cookies`.
- Locale & timezone: `/debug/intl`.
- Resource blocklist (image,font,media): `/static/images`, `/static/fonts` (use CLI `--block-resources`).
- Redirect chain: `/redirect/chain?n=3&to=/static/simple`.
- Redirect loop: `/redirect/loop`.
- Delayed redirect: `/redirect/delay?ms=1000&to=/static/simple`.
- Slow resources (JS/CSS): `/assets/slow.js?ms=1500`, `/assets/slow.css?ms=1500`.
- Large assets: `/assets/large-image.svg?kb=1024`, `/assets/huge-css?kb=256`, `/assets/huge-js?kb=512`.
- Missing resources: `/assets/missing`.
- Server error: `/error/500`.
- Flaky error with retries: `/error/flaky?fail=2`.
- Timeout (hang): `/error/timeout?ms=10000`.
- Connection reset: `/error/reset`.
- I18N UTF-8: `/i18n/utf8`.
- I18N CJK: `/i18n/cjk`.
- I18N RTL: `/i18n/arabic`.
- Web fonts: `/static/fonts`.
- No-print elements: `/print/no-print-elements`.
- Page breaks: `/print/page-breaks`.
- Page ranges: `/print/page-ranges-demo?pages=10` (use CLI `--page-ranges`).
- Caching: `/cache/cacheable`, `/cache/no-store`.
- CSP: `/csp/strict`.
- Compression: `/compress/text`.
- User agent/device verification: `/debug/ua`.
- Bypass cache/disable cache: `/cache/cacheable` (run with and without CLI cache bypass).
- HTTP method & POST data: `/debug/echo` with `--method POST --post-data`.
- Console error detection (fail on console): `/debug/console?error=1`.

Notes:
- Unless otherwise noted, query params are optional and exist to vary test scenarios without adding new routes.
- Some endpoints may be “planned” and implemented in their respective sub-packages during the migration from the monolithic server. They are listed here to guarantee full coverage.

## Implementation location

- Current: implemented in `mock-server/server.js` (monolithic) with a grouped launcher and comprehensive endpoints.
- Target architecture: migrate each group into a dedicated sub-package under `mock-server/packages/<group>` with its own `routes.js` and `templates/` directory. The root server should auto-mount these packages and build the launcher/catalog from their metadata. See `mock-server/README.md` for a quick start.

## Templates over inline HTML

To make pages easy to author, review, and share:

- Avoid embedding large HTML strings in JavaScript. Prefer serving `.html` files from each group’s `templates/` directory.
- If variables are needed, prefer a lightweight template engine (e.g., EJS, Nunjucks, or Handlebars) or a minimal placeholder replacement step. Keep it dev-only.
- Suggested folder structure per group:

```
packages/<group>/
	package.json
	routes.js
	templates/
		index.html
		*.html          # page templates (header/footer demos, print CSS demos, etc.)
	public/           # optional static assets for that group
```

- Routes should render these templates and pass values from query parameters for quick variation (`?ms=2000`, `?pages=5`, etc.).

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

## Maintenance: groups, naming, and adding endpoints

- Classification: keep endpoints grouped by feature area (basic, print, dynamic, auth, redirects, resources, errors, i18n, media, templates, cache/csp). This mirrors the design doc and makes exploration intuitive.
- Dedicated sub-packages: each group must be its own sub-package under `mock-server/packages/`, with `routes.js` and a `templates/` directory. This keeps boundaries clean and maintenance localized.
- Templates: serve HTML from `templates/` rather than embedding strings in JS. Keep any associated CSS/JS either in the same folder or `public/`.
- Naming: use short, intention-revealing titles and stable paths. Prefer query parameters for variants (e.g., `?ms=2000`, `?pages=5`).
- Launcher & catalog: the root server should assemble entries from each sub-package’s exported metadata so additions automatically appear on `/` and `/__catalog.json`.
- Determinism: where possible, make content predictable (use fixed titles, seeded content) to improve snapshot diffs and filename generation.

If you need root-level scripts or CI wiring to start/stop the server during tests, we can add them without changing production code paths.
