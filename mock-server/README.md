# Printeer Mock Test Server

A comprehensive mock web server for testing all features of the enhanced Printeer CLI system. This server provides endpoints covering every major printing scenario, authentication method, and edge case.

## Quick Start

```bash
cd mock-server
npm install
npm start
```

Server runs at http://localhost:4000 (override with `PORT` environment variable)

## Features

- **Grouped Launcher Homepage** - Navigate all endpoints by feature area
- **Machine-Readable Catalog** - `/__catalog.json` for automated testing
- **Modular Architecture** - Each feature group is a separate package
- **File-Based Templates** - No HTML embedded in JavaScript
- **Comprehensive Coverage** - Tests every CLI option and scenario

## Architecture

```
mock-server/
├── server.js              # Main Express app with auto-discovery
├── catalog.json           # Single source of truth for routes
├── public/                # Launcher UI assets
├── templates/             # Shared templates (placeholders)
└── packages/              # Feature group packages
    ├── basic/             # Basic pages and layout
    ├── print/             # Print CSS & page formatting
    ├── dynamic/           # SPA & wait strategies
    ├── auth/              # Authentication & headers
    ├── redirects/         # Redirects & navigation
    ├── resources/         # Resources & performance
    ├── errors/            # Errors & resilience
    ├── i18n/              # Internationalization
    ├── media/             # Media emulation & responsive
    ├── templates-group/   # Templates & variables
    ├── cache-csp/         # Cache, compression, CSP
    └── image/             # Image capture & clipping
```

Each package contains:
- `routes.js` - Express router and metadata
- `templates/` - EJS template files

## CLI Testing Examples

### Basic Conversion
```bash
printeer convert --url http://localhost:4000/static/simple --output simple.pdf
```

### Wait Strategies
```bash
# Wait for selector
printeer convert --url "http://localhost:4000/spa/delay-content?ms=2000" \
  --wait-for-selector "#ready" --output delayed.pdf

# Network idle
printeer convert --url "http://localhost:4000/spa/network-idle?requests=5" \
  --wait-until networkidle0 --output network-idle.pdf
```

### Authentication
```bash
# Basic auth
printeer convert --url http://localhost:4000/auth/basic \
  --basic-auth user:pass --output auth-basic.pdf

# Bearer token
printeer convert --url http://localhost:4000/auth/bearer \
  --header "Authorization: Bearer test-token" --output auth-bearer.pdf
```

### Print Options
```bash
# Margins and backgrounds
printeer convert --url "http://localhost:4000/print/margins?top=1in&right=0.5in" \
  --print-background --output margins.pdf

# Scale testing
printeer convert --url http://localhost:4000/print/scale-markers \
  --scale 0.8 --output scale-test.pdf
```

## Development

### Adding New Endpoints

1. Create or edit a package in `packages/[group]/`
2. Add routes to `routes.js`
3. Create templates in `templates/`
4. Update `catalog.json` if needed
5. Restart server - routes auto-mount

### Package Structure
```javascript
// packages/[group]/routes.js
export const group = {
  id: 'group-name',
  title: 'Group Title',
  routes: [
    { path: '/path', title: 'Route Title' }
  ]
};

export function createRouter() {
  const router = express.Router();
  // Add routes...
  return router;
}
```

Visit http://localhost:4000 for the interactive launcher and full documentation.