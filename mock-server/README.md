# Printeer Mock Server

Standalone mock server to exercise the enhanced Printeer CLI. Provides grouped routes, a launcher page, and a JSON catalog for tooling.

## Quick start

```bash
cd mock-server
npm install
npm start
# Server at http://localhost:4000
```

## Features

- Launcher homepage grouping all endpoints by feature area
- Catalog endpoint: `GET /__catalog.json`
- Health endpoint: `GET /__health`
- Scenarios: static, print CSS, dynamic waits, auth, redirects, resources, errors, i18n, media, templates, cache/CSP/compression

## Launcher

- Open `http://localhost:4000/` in your browser.
- UI assets live in `public/index.html`, `public/styles.css`, and `public/launcher.js`.
- Data source is `catalog.json` → served at `/__catalog.json` (enriched with `port` and `baseUrl`).

Key features:
- Search by route/group/path
- Grouped cards by feature area
- Method badges and direct links
- Quick links to the catalog and health endpoints

## Support endpoints

- `GET /__health` → `{ ok: true, uptime: number, timestamp: string }`
- `GET /__catalog.json` → machine-readable list of groups and routes (see contract below)

## Catalog JSON contract (summary)

- Root fields:
	- `port: number`, `baseUrl: string`, `groups: Group[]`
- Group fields:
	- `id: string`, `title: string`, `routes: RouteEntry[]`
- RouteEntry fields:
	- `path: string`, `title: string`, `method?: "GET"|"POST"`, `tags?: string[]`, `notes?: string`, `implemented?: boolean`

Example:

```json
{
	"port": 4000,
	"baseUrl": "http://localhost:4000",
	"groups": [
		{ "id": "print", "title": "Print CSS & Page Formatting", "routes": [
			{ "path": "/print/scale-markers", "title": "Scale markers" }
		]}
	]
}
```

For the complete catalog and endpoint list, see `docs/enhanced-priting-mock-test-server.md`.

## Adding routes

1) Add a route entry to `catalog.json` under the right group.
2) Implement the handler (see Auto-discovery below). Until then, the server will render a friendly placeholder for catalog-listed paths.

## Templating policy (no inline HTML)

- Do NOT embed HTML strings in route handlers.
- Use file-based templates instead (EJS is configured).
- Shared placeholder template: `templates/placeholder.ejs` (receives `{ baseUrl, pathname, entries, method, query }`).

## Auto-discovery (recommended)

Structure group sub-packages under `packages/<group>` exporting metadata and a router:

```ts
// packages/<group>/routes.js
export const group = { id: 'print', title: 'Print CSS & Page Formatting', routes: [
	{ path: '/print/css-default', title: 'Print CSS overrides' }
] };
export function createRouter() { /* return Express.Router() with endpoints */ }
```

The root server mounts discovered routers and merges their `group` metadata into `/__catalog.json` and the launcher.

## Configuration

Environment variables:

- `PORT` — port to bind (default `4000`)
- `MOCK_BASE_URL` — override base URL in the catalog (useful behind a proxy)

## Notes

- This package is dev-only and not published.
- Extend `server.js` or add sub-packages under `packages/` as features evolve.

## PR checklist

- [ ] No HTML embedded in JS — render from `templates/`
- [ ] Route implemented in the correct `packages/<group>` sub-package
- [ ] Template(s) added/updated under that group’s `templates/` (or shared `templates/`)
- [ ] Catalog entry added/updated; launcher shows it under the right group
- [ ] `/__health` and `/__catalog.json` behave as expected

For deeper guidance and the full endpoint catalog, read: `docs/enhanced-priting-mock-test-server.md`.
