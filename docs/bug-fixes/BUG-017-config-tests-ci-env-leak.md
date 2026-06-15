# BUG-017 — Config-manager tests fail on CI (env-signal leak)

| | |
|---|---|
| **Severity** | Medium (test isolation / CI reliability) |
| **Area** | tests-quality / config |
| **Status** | ✅ GREEN |
| **Fixed in** | `tests/config/config-manager.test.ts` |
| **Found by** | First real CI run on GitHub Actions (Windows + Linux) |

## Summary

After pushing `jun26-fixes`, the first real CI run failed the **Unit tests** step on
**both** Windows and Linux (5 failures in `config-manager.test.ts`) even though the
full suite was green locally:

```
✘ should detect development environment by default → expected 'production' to be 'development'
✘ should load default configuration successfully    → expected 'production' to be 'development'
✘ should get configuration values by key path       → expected 5 to be 2
✘ should deep merge nested configuration objects     → expected 'new' to be 'auto'
✘ should handle various NODE_ENV values              → expected 'production' to be 'development'
```

## Root cause

`ConfigurationManager.getEnvironment()` (correctly) falls back to `production` when
it sees a CI/containerized environment:

```ts
if (process.env.CI || process.env.DOCKER || process.env.KUBERNETES_SERVICE_HOST) {
  return 'production';
}
return 'development';
```

The test's `beforeEach` neutralized only `NODE_ENV` and `PRINTEER_*`:

```ts
if (key.startsWith('PRINTEER_') || key === 'NODE_ENV') delete process.env[key];
```

On a GitHub Actions runner `CI=true` is always set, so the "default" baseline
resolved to **production** — which flips the environment-specific defaults
(`browser.pool.max` 2→5, `browser.headless` auto→'new', `logging.level`
debug→info). Every failing assertion is downstream of that single leak. The
production logic was right; the test simply didn't isolate the inputs it depended on.

## Fix

Neutralize the *same* signals the detector reads, so the default baseline is
genuinely `development` regardless of host:

```ts
const ENV_SIGNALS = ['NODE_ENV', 'CI', 'DOCKER', 'KUBERNETES_SERVICE_HOST'];
Object.keys(process.env).forEach(key => {
  if (key.startsWith('PRINTEER_') || ENV_SIGNALS.includes(key)) delete process.env[key];
});
```

`afterEach` already restores `process.env = originalEnv`, so the CI variable is
restored for the rest of the process, and the tests that explicitly assert
CI/Docker/K8s detection (which *set* those vars themselves) keep passing.

## Verification

Reproduced the CI condition locally:

```
CI=true DOCKER=true npx vitest run tests/config/config-manager.test.ts  → green
CI=true npm run test                                                     → 364 passed
```

## Learnings (carried forward)

1. **A test that depends on env-based detection must clear *every* signal the
   detector reads, not just the obvious one.** Clearing `NODE_ENV` but leaving
   `CI` is a half-isolation that passes only where `CI` is unset (i.e. dev boxes).
2. **"Green locally" ≠ "green on CI."** The first real CI run is part of the
   definition of done — local verification can't see the runner's ambient env.
3. When several assertions fail together, look for a **single upstream input**
   (here: the resolved environment) before treating them as separate bugs.
