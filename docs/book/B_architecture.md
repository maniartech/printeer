# Appendix B: Architecture & Code Structure

This appendix documents Printeer's internal architecture for contributors and developers who want to extend or modify the codebase.

## Domain-First Architecture

Printeer follows a **domain-first** architecture where code is organized by functional domain rather than technical layer:

```
src/
├── api/          # Library public surface (barrel exports)
├── cli/          # CLI program and helpers
├── config/       # Configuration loaders/managers
├── printing/     # Browser management + conversion pipeline
├── batch/        # Batch processing engine
├── resources/    # Resource handling + validation
├── diagnostics/  # Doctor module and health checks
├── types/        # Shared (cross-domain) DTOs only
└── utils/        # Utility helpers
```

### Design Principles

1. **Single Responsibility**: Each domain owns its types, contracts, and implementations
2. **Clear Boundaries**: Consume other domains via interfaces/types, not concrete modules
3. **CLI Isolation**: CLI-only code lives under `src/cli` and must not be imported by library modules
4. **Domain-Owned Types**: Domain-specific types live under `src/{domain}/types/`

## Key Domains

### Printing (`src/printing/`)

The core conversion pipeline including:
- **browser.ts**: Browser pool management, instance lifecycle, aggressive cleanup strategies
- **converter.ts**: HTML-to-PDF/PNG conversion logic
- **types/browser.ts**: Browser instance interfaces and pool contracts
- **types/conversion.ts**: Conversion options and result types

### Configuration (`src/config/`)

Environment-aware configuration management:
- **enhanced-config-manager.ts**: Main configuration manager with hot-reload support
- **cli-config-loader.ts**: CLI argument to config object mapping
- **types/**: Configuration schema and validation types

### Batch Processing (`src/batch/`)

High-concurrency job processing:
- **batch-processor.ts**: Queue-based scheduler with dependency graph support
- Variable expansion, retry logic, and reporting

### Diagnostics (`src/diagnostics/`)

System health checking:
- **doctor.ts**: Browser availability, font detection, sandbox verification
- Environment detection (Docker, Kubernetes, cloud platforms)

## Public API Surface

The library exposes its API through `src/api/index.ts`:

```typescript
// Main conversion function
import printeer from 'printeer';

// Configuration manager (advanced usage)
import { EnhancedConfigurationManager } from 'printeer/config';

// Batch processor (advanced usage)
import { BatchProcessor } from 'printeer/batch';

// Browser manager (advanced usage)
import { DefaultBrowserManager } from 'printeer/printing';
```

## CLI Architecture

The CLI is kept strictly separate from the library:

```
src/cli/
├── enhanced-cli.ts    # Main CLI program (Commander.js)
├── config-mapping.ts  # CLI flag → config object mappings
├── cleanup-command.ts # Browser cleanup utilities
└── options.ts         # Option definitions
```

**Important**: Library modules must never import from `src/cli/`.

## Browser Lifecycle

Printeer uses two browser strategies:

### One-Shot Strategy
- Opens a fresh browser for each conversion
- Best for single conversions or low-frequency usage
- Automatic cleanup on completion

### Pool Strategy
- Maintains a pool of warm browser instances
- Reuses instances across conversions (300ms-1s savings per job)
- Automatic health monitoring and instance rotation
- Used automatically in batch mode or when `PRINTEER_BROWSER_STRATEGY=pool`

## Configuration Resolution

Settings are resolved in priority order:

1. **CLI Arguments** (highest priority)
2. **Environment Variables** (`PRINTEER_*` prefixed)
3. **Project Config** (`.printeerrc.json`, `printeer.config.json`)
4. **User Config** (`~/.printeer/config.json`)
5. **Built-in Defaults** (lowest priority)

## Testing Strategy

Tests are organized by domain under the `tests/` directory:

```
tests/
├── printing/    # Browser and conversion tests
├── config/      # Configuration loading tests
├── batch/       # Batch processor tests
├── resources/   # Resource validation tests
└── diagnostics/ # Doctor module tests
```

Run tests with:
```bash
npm test              # All tests
npm test -- --watch   # Watch mode
```

## Contributing

When adding new features:

1. **Identify the owning domain** - Which domain does this feature belong to?
2. **Add types first** - Define interfaces in `src/{domain}/types/`
3. **Implement** - Add implementation in the domain folder
4. **Export** - Update the domain's `index.ts` barrel
5. **Test** - Add tests under `tests/{domain}/`
6. **Document** - Update relevant book chapters
