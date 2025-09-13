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
- JSON catalog: `GET /__catalog.json`
- Scenarios: static, print CSS, dynamic waits, auth, redirects, resources, errors, i18n, media, templates, cache/CSP/compression

## Customization

Set `PORT=xxxx` to change the port.

## Notes

- This package is dev-only and not published.
- Extend `server.js` with additional routes as features evolve.
