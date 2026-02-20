---
description: "NPM/Yarn package management conventions"
paths:
  - "**/package.json"
---

# npm Conventions

## Version Pinning

**Always use exact versions** - no `^` or `~` prefixes.

```json
// GOOD
{
  "dependencies": {
    "express": "4.18.2",
    "lodash": "4.17.21"
  }
}

// BAD
{
  "dependencies": {
    "express": "^4.18.2",
    "lodash": "~4.17.21"
  }
}
```

### Why?

- **Reproducible builds** across environments
- **No surprise breaking changes** from minor/patch updates
- **Lock file is source of truth** but pinning adds defense in depth
- **Explicit upgrades** via `npm update` or renovate/dependabot

### Commands

```bash
# Install with exact version
npm install express --save-exact

# Configure npm to always save exact
npm config set save-exact true

# Or in .npmrc
save-exact=true
```

## Scripts

Use consistent script names:

```json
{
  "scripts": {
    "dev": "...",
    "build": "...",
    "start": "...",
    "test": "...",
    "test:watch": "...",
    "test:cov": "...",
    "lint": "...",
    "lint:fix": "...",
    "format": "..."
  }
}
```

## Engine Requirements

Specify Node.js version:

```json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```
