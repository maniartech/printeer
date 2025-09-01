# Proposed Build Configuration

## New Structure
```
dist/
├── lib/
│   ├── index.js
│   ├── index.d.ts
│   └── index.js.map
└── bin/
    ├── cli.js
    └── cli.js.map
```

## Updated package.json scripts
```json
{
  "main": "./dist/lib/index.js",
  "types": "./dist/lib/index.d.ts",
  "bin": {
    "printeer": "./dist/bin/cli.js"
  },
  "scripts": {
    "clean": "rm -rf dist",
    "build:lib": "esbuild ./src/index.ts --outfile=./dist/lib/index.js --bundle --platform=node --packages=external --target=node16.8 --format=esm --sourcemap",
    "build:cli": "esbuild ./src/cli.ts --outfile=./dist/bin/cli.js --bundle --platform=node --packages=external --target=node16.8 --format=esm --sourcemap",
    "build:types": "tsc --project tsconfig.build.json",
    "build": "npm run clean && npm run build:lib && npm run build:cli && npm run build:types"
  }
}
```

## Updated tsconfig.build.json
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/lib",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": false,
    "sourceMap": true
  }
}
```

## Updated .gitignore
```
# Build output
dist/

# Remove these lines since we're consolidating:
# ./bin
# *.js
# *.js.map
# *d.ts
```

## Benefits
1. **Single build directory** - Everything goes to `dist/`
2. **Clear structure** - Library vs CLI separation
3. **Git-friendly** - Only ignore `dist/`
4. **Type safety** - Proper TypeScript declaration files
5. **Standard practice** - Follows Node.js package conventions
