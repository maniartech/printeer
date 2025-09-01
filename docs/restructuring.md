# Printeer Source Code Restructuring

This document captures the agreed classification of modules and a concrete, low-risk restructuring plan to make the codebase easier to navigate, test, and evolve.

## Goals

- Establish clear domain boundaries (printing, resources, configuration, CLI, diagnostics, interfaces, utilities).
- Reduce cross-cutting coupling; consume other domains via interfaces/types, not concrete modules.
- Keep a single, obvious public API surface for the library; keep CLI separate.
- Minimize churn: move files once, provide transitional barrels, keep tests green.

## Guidelines (SRP and domain ownership)

- src/printeer.ts is not CLI-specific. Keep it as part of the library surface (preferably in `src/api/` or re-exported from the package root). Do not place it under `src/cli`.
- Only move modules into a domain folder when they clearly belong to that domain. Follow Single Responsibility Principle and avoid moving files into unrelated packages.
- CLI-only code must live under `src/cli` and must not be imported by library modules.
- Library modules must not depend on CLI code. Cross-domain interactions should use interfaces/types, not concrete implementations.
- When in doubt, use thin re-export barrels to maintain compatibility while clarifying ownership.
 - Domain-specific types must live under that domain's `types/` folder (e.g., `src/printing/types/*`). Keep only truly shared types under `src/types/`.
 - Tests must live under the project-root `tests/` folder, grouped by domain (e.g., `tests/printing/*.test.ts`). The `tests/` folder should be a sibling of `src/`.

## Current classification (by concern)

### CLI and entrypoints

- src/cli.ts
- src/options.ts
- src/usage.ts
- src/printeer.ts
- src/index.ts
- src/core/index.ts

### Configuration management

- src/config.ts
- src/core/configuration.ts
- src/core/config-manager.ts
- src/core/cli-config-loader.ts
- src/types/configuration.ts

### Browser management

- src/core/browser.ts
- src/types/browser.ts

### Printing / conversion pipeline

- src/core/converter.ts
- src/types/conversion.ts

### System resources (resource management)

- src/core/resource.ts
- src/core/resource-validator.ts
- src/types/resource.ts

### Diagnostics / doctor

- src/core/doctor.ts
- src/types/diagnostics.ts

### Interfaces (process/command/service abstractions)

- src/interfaces/command-manager.ts
- src/interfaces/process-manager.ts
- src/interfaces/service.ts
- src/interfaces/index.ts

### Utilities and errors

- src/utils.ts
- src/types/errors.ts
- src/types/index.ts

### Tests

- Top-level: src/config.test.ts
- Core: src/core/__tests__/*
- Interfaces: src/interfaces/__tests__/*
- Types: src/types/__tests__/*

## Printing-related summary

- Printing-specific
	- src/core/browser.ts
	- src/core/converter.ts
	- src/types/browser.ts
	- src/types/conversion.ts

- Printing-adjacent (inputs/resources)
	- src/core/resource.ts
	- src/core/resource-validator.ts
	- src/types/resource.ts

- Support & infrastructure
	- CLI/entrypoints, configuration, diagnostics, interfaces, utilities, type index (all listed above)

## Proposed target layout (domain-first)

Within `src/`, group by domain; expose library APIs through `src/api/` and keep CLI isolated. Domain-specific types live under each domain's `types/` folder. Root-level `tests/` mirrors the domain structure.

- src/
	- api/                # library public surface (barrel exports only)
		- index.ts
	- cli/                # CLI program and helpers
		- index.ts
		- options.ts
		- usage.ts
	- config/             # configuration loaders/managers
		- index.ts          # re-exports
		- configuration.ts
		- manager.ts
		- cli-config-loader.ts
		- types/
			- configuration.ts
	- printing/           # printing browser + conversion pipeline
		- index.ts
		- browser.ts
		- converter.ts
		- types/
			- browser.ts
			- conversion.ts
	- resources/          # resource handling + validation
		- index.ts
		- resource.ts
		- validator.ts
		- types/
			- resource.ts
	- diagnostics/
		- index.ts
		- doctor.ts
		- types/
			- diagnostics.ts
	- interfaces/         # contracts only
		- index.ts
		- command-manager.ts
		- process-manager.ts
		- service.ts
	- types/              # shared (cross-domain) DTOs and types only
		- index.ts
		- errors.ts
	- utils/
		- index.ts          # from existing utils.ts

- tests/                # root-level tests by domain (sibling of src/)
	- printing/
		- browser.test.ts
		- converter.test.ts
	- resources/
		- resource.test.ts
		- resource.integration.test.ts
	- config/
		- config.test.ts
		- cli-config-loader.test.ts
		- config-manager.test.ts
	- diagnostics/
		- doctor.test.ts
	- interfaces/
		- command-manager.test.ts
		- process-manager.test.ts
		- service.test.ts
	- shared/
		- types-errors.test.ts (if any shared-type tests remain)

Transitional barrels: keep `src/index.ts` as the package entry that re-exports from `src/api/index.ts`. Keep `src/printeer.ts` only if required by consumers; otherwise fold into `src/api/`.

## Move mapping (source → target)

- src/cli.ts → src/cli/index.ts
- src/options.ts → src/cli/options.ts
- src/usage.ts → src/cli/usage.ts
- src/printeer.ts → keep as library entry (not CLI). Prefer `src/api/index.ts` (or re-export from api)
- src/index.ts → keep as thin re-export to `./api`

- src/config.ts → src/config/index.ts
- src/core/configuration.ts → src/config/configuration.ts
- src/core/config-manager.ts → src/config/manager.ts
- src/core/cli-config-loader.ts → src/config/cli-config-loader.ts

- src/core/browser.ts → src/printing/browser.ts
- src/core/converter.ts → src/printing/converter.ts
	- src/types/browser.ts → src/printing/types/browser.ts
	- src/types/conversion.ts → src/printing/types/conversion.ts

- src/core/resource.ts → src/resources/resource.ts
- src/core/resource-validator.ts → src/resources/validator.ts
	- src/types/resource.ts → src/resources/types/resource.ts

- src/core/doctor.ts → src/diagnostics/doctor.ts
	- src/types/diagnostics.ts → src/diagnostics/types/diagnostics.ts

- src/utils.ts → src/utils/index.ts

- src/core/index.ts → remove after migration (covered by domain barrels)

Tests should remain colocated under their domain folders (keep `__tests__` directories), adjusting import paths accordingly.

### Tests relocation (src → tests)

- src/config.test.ts → tests/config/config.test.ts
- src/core/__tests__/browser.test.ts → tests/printing/browser.test.ts
- src/core/__tests__/cli-config-loader.test.ts → tests/config/cli-config-loader.test.ts
- src/core/__tests__/config-manager.test.ts → tests/config/config-manager.test.ts
- src/core/__tests__/doctor.test.ts → tests/diagnostics/doctor.test.ts
- src/core/__tests__/interfaces.test.ts → tests/interfaces/interfaces.test.ts
- src/core/__tests__/resource.integration.test.ts → tests/resources/resource.integration.test.ts
- src/core/__tests__/resource.test.ts → tests/resources/resource.test.ts
- src/interfaces/__tests__/command-manager.test.ts → tests/interfaces/command-manager.test.ts
- src/interfaces/__tests__/process-manager.test.ts → tests/interfaces/process-manager.test.ts
- src/interfaces/__tests__/service.test.ts → tests/interfaces/service.test.ts
- src/types/__tests__/browser.test.ts → tests/printing/browser.types.test.ts
- src/types/__tests__/configuration.test.ts → tests/config/configuration.types.test.ts
- src/types/__tests__/conversion.test.ts → tests/printing/conversion.types.test.ts
- src/types/__tests__/diagnostics.test.ts → tests/diagnostics/diagnostics.types.test.ts
- src/types/__tests__/errors.test.ts → tests/shared/errors.types.test.ts
- src/types/__tests__/resource.test.ts → tests/resources/resource.types.test.ts

## Public API and compatibility

- Library consumers should import from the package root (exposed by `src/index.ts` → `src/api/index.ts`).
- During migration, add re-export barrels to avoid breaking internal imports:
	- Temporary `src/core/*.ts` files can re-export from their new domain paths until all imports are updated.
	- Alternatively, update imports and keep a compatibility `src/core/index.ts` that re-exports domain barrels.
	- Move domain types first, then update imports to reference `<domain>/types/*` or the domain barrel.

## Phased migration plan

1. Create folders and barrels
	- Add `src/api/index.ts`, domain `index.ts` files, and `src/cli` folder.
	- Introduce `src/utils/index.ts` that re-exports existing helpers.

2. Move non-breaking items first
	- Move `utils.ts`, `config/*`, `diagnostics/*` with re-exports left in the old locations (thin files) if needed.
	- Move domain-specific types from `src/types/*` into `src/<domain>/types/*`. Keep cross-domain `errors.ts` in `src/types/`.

3. Move printing and resources
	- Move `core/browser.ts`, `core/converter.ts`, `core/resource.ts`, `core/resource-validator.ts` into their domains.
	- Update domain barrels to export their `types/*` alongside implementations.

4. Update imports and tests
	- Switch internal imports to domain barrels (e.g., `printing`, `resources`, `config`).
	- Relocate tests to `tests/<domain>/*.test.ts` and update Vitest config to pick up `tests/**/*.test.ts`.
	- Update tests to use new relative paths or barrels.

5. Finalize API
	- Ensure `src/index.ts` only re-exports from `src/api/index.ts`.
	- Remove obsolete `src/core/index.ts` and any temporary re-export stubs.

## Acceptance checklist

- Build passes and type-check is clean.
- Unit tests pass (`tests/**/*.test.ts`).
- Vitest picks up `tests/**/*.test.ts` and runs from the root `tests/` folder.
- No imports reference removed `core/*` paths.
- Public API surface remains stable (package-level imports unchanged).

## Notes

- Optional: introduce path aliases in `tsconfig.json` (e.g., `@printing/*`, `@config/*`) to decouple from relative paths. Defer until after the physical move to reduce variables.
- Keep interfaces and types free of runtime logic; other domains depend on interfaces, not concrete modules, where practical.


