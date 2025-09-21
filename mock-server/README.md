# Printeer Mock Test Server

A comprehensive mock web server for testing all features of the enhanced Printeer CLI and printing pipeline.

## Quick Start

```bash
cd mock-server
npm install
npm start
```

The server will start at `http://localhost:4000` with a beautiful launcher interface.

## Features

- **🚀 Launcher Interface**: Beautiful homepage with searchable endpoint catalog
- **📋 Comprehensive Coverage**: Tests all CLI features and printing scenarios
- **🔧 Modular Architecture**: Organized into feature-specific packages
- **📝 File-based Templates**: No HTML embedded in JavaScript
- **🌐 Internationalization**: UTF-8, CJK, RTL, and locale testing
- **🔒 Authentication**: Basic, Bearer, Cookie, and CSRF testing
- **📊 Batch Processing**: Error handling, retries, and flaky endpoints
- **🎨 Print CSS**: Media queries, page breaks, margins, and formatting
- **⚡ Dynamic Content**: SPA testing with various wait strategies

## Endpoint Groups

### 1. Basic Pages (`/static/*`, `/debug/*`)
- Simple HTML pages with predictable titles
- Multi-page content for pagination testing
- RTL language samples
- Web font loading
- Image grids for quality testing
- User agent and request debugging

### 2. Print CSS & Formatting (`/print/*`, `/pdf/*`)
- Media query testing (screen vs print)
- Page break controls
- Margin validation with visual rulers
- Header/footer template demos
- Custom page sizes
- Scale markers and measurement guides
- Tagged PDF structure testing

### 3. Dynamic/SPA Content (`/spa/*`)
- Delayed content loading
- Network idle detection
- Title changes for filename testing
- Interactive content (click, intersection observer)
- Custom ready state functions

### 4. Authentication (`/auth/*`)
- HTTP Basic authentication
- Bearer token authentication
- Form-based login with cookies
- CSRF protection testing
- Header and cookie debugging

### 5. Redirects (`/redirect/*`)
- Redirect chains
- Infinite redirect loops (with safety valve)
- Delayed redirects

### 6. Resources & Performance (`/assets/*`)
- Slow-loading JavaScript and CSS
- Large file generation (SVG, CSS, JS)
- Missing resources (404 testing)
- Random image generation

### 7. Errors & Resilience (`/error/*`)
- HTTP 500 errors
- Connection timeouts
- Socket resets
- Flaky endpoints (fail N times, then succeed)

### 8. Internationalization (`/i18n/*`)
- UTF-8 character testing
- CJK (Chinese, Japanese, Korean) samples
- Arabic RTL text
- Locale and timezone debugging

### 9. Media Emulation (`/media/*`, `/viewport/*`)
- Print vs screen media type differences
- Responsive viewport testing
- Device scale factor markers
- Color scheme preferences

### 10. Templates & Variables (`/template/*`)
- Header template demos with variables
- Footer template examples
- Content template interpolation
- Variable reference guides

### 11. Cache, CSP & Debug (`/cache/*`, `/csp/*`, `/debug/*`)
- Cacheable content with proper headers
- No-cache directives
- Content Security Policy testing
- Large text for compression testing
- Console message generation

### 12. Image Capture (`/image/*`)
- Clipping target with coordinates
- Transparent backgrounds
- Quality testing grids

## CLI Testing Examples

### Basic Conversion
```bash
printeer convert --url http://localhost:4000/static/simple --output test.pdf
```

### Print CSS Testing
```bash
printeer convert \
  --url "http://localhost:4000/print/margins?top=1in&right=0.5in" \
  --media-type print \
  --print-background \
  --output margins.pdf
```

### Authentication Testing
```bash
printeer convert \
  --url http://localhost:4000/auth/basic \
  --basic-auth user:pass \
  --output auth-test.pdf
```

### Dynamic Content Testing
```bash
printeer convert \
  --url "http://localhost:4000/spa/delay-content?ms=2000" \
  --wait-for-selector "#ready" \
  --output dynamic.pdf
```

### Batch Processing
```bash
printeer batch batch-jobs.json --concurrency 3 --retry 2
```

## Configuration

### Environment Variables
- `PORT` - Server port (default: 4000)
- `MOCK_BASE_URL` - Override base URL for catalog

### Batch File Example
```json
{
  "jobs": [
    {
      "id": "basic-test",
      "url": "http://localhost:4000/static/simple",
      "output": "basic.pdf"
    },
    {
      "id": "auth-test", 
      "url": "http://localhost:4000/auth/basic",
      "output": "auth.pdf",
      "config": {
        "auth": {
          "basic": {"username": "user", "password": "pass"}
        }
      }
    }
  ]
}
```

## Development

### Adding New Endpoints

1. Create a new package under `packages/`:
```
packages/my-feature/
  routes.js
  templates/
    my-template.ejs
```

2. Export router and metadata in `routes.js`:
```javascript
export const group = {
  id: 'my-feature',
  title: 'My Feature Testing',
  routes: [
    { path: '/my-feature/test', title: 'Test endpoint' }
  ]
};

export function createRouter() {
  const router = express.Router();
  // Add routes...
  return router;
}
```

3. The server will auto-discover and mount the package.

### Template Guidelines

- Use EJS templates in `templates/` directories
- No HTML embedded in JavaScript
- Pass minimal data from routes to templates
- Use query parameters for variations

### Testing Checklist

- [ ] All endpoints return proper HTTP status codes
- [ ] Templates render without errors
- [ ] Authentication flows work correctly
- [ ] Error conditions are handled properly
- [ ] Internationalization displays correctly
- [ ] Print CSS produces expected differences
- [ ] Dynamic content loads as expected

## API Reference

### Catalog Endpoint
`GET /__catalog.json` - Returns machine-readable endpoint catalog

### Health Check
`GET /__health` - Returns server health status

### Launcher
`GET /` - Interactive endpoint browser and testing interface

## Troubleshooting

### Common Issues

1. **Port already in use**: Change PORT environment variable
2. **Templates not found**: Ensure templates/ directories exist
3. **Routes not loading**: Check package exports in routes.js
4. **Authentication failing**: Verify credentials (user:pass, test-token)

### Debug Mode
Set `DEBUG=printeer:*` for detailed logging.

## Contributing

1. Follow the modular package structure
2. Use file-based templates (no HTML in JS)
3. Add comprehensive test coverage
4. Update catalog.json for new endpoints
5. Document CLI testing examples

## License

This mock server is for development and testing only. Not intended for production use.