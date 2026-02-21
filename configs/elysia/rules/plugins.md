---
description: "Elysia plugin system, scoping, derive, resolve, decorate, and state"
paths:
  - "**/src/plugins/**/*.ts"
  - "**/src/modules/**/index.ts"
  - "**/src/index.ts"
  - "**/src/app.ts"
---

# Elysia Plugins

## Instance Plugin

### GOOD

```typescript
import { Elysia } from 'elysia'

// Name plugins for deduplication
const authPlugin = new Elysia({ name: 'auth' })
  .derive({ as: 'scoped' }, ({ headers }) => {
    const token = headers.authorization?.replace('Bearer ', '')
    return { token }
  })

const app = new Elysia()
  .use(authPlugin)
  .get('/profile', ({ token }) => getProfile(token))
```

### BAD

```typescript
// BAD: No name — duplicates if .use()'d multiple times
const plugin = new Elysia()
  .derive(() => ({ value: 'hi' }))
```

## Functional Plugin

### GOOD

```typescript
const rateLimitPlugin = (app: Elysia) =>
  app.derive({ as: 'scoped' }, () => ({
    rateLimit: createRateLimiter(),
  }))
```

## Scoping

### GOOD

```typescript
// local (default) — only current instance and children
new Elysia()
  .derive(() => ({ localOnly: true }))

// scoped — propagates to parent (one level up)
new Elysia()
  .derive({ as: 'scoped' }, () => ({ visibleToParent: true }))

// global — propagates to all ancestors
new Elysia()
  .derive({ as: 'global' }, () => ({ visibleEverywhere: true }))
```

## Derive vs Resolve vs Decorate vs State

### GOOD

```typescript
const app = new Elysia()
  // decorate: static utilities, available immediately (no per-request cost)
  .decorate('logger', new Logger())

  // state: mutable store, shared across requests
  .state('requestCount', 0)

  // derive: runs before validation, adds per-request properties
  .derive(({ headers }) => ({
    bearerToken: headers.authorization?.replace('Bearer ', ''),
  }))

  // resolve: runs after validation, adds per-request properties
  .resolve(({ bearerToken }) => ({
    user: verifyToken(bearerToken),
  }))

  .get('/profile', ({ user, logger, store }) => {
    store.requestCount++
    logger.info(`User ${user.id} accessed profile`)
    return user
  })
```

### BAD

```typescript
// BAD: Using derive for static values (use decorate instead)
app.derive(() => ({ db: new Database() }))

// BAD: Using decorate for per-request values (use derive/resolve instead)
app.decorate('user', getCurrentUser()) // Same user for all requests
```

## Lazy Loading

### GOOD

```typescript
// Defer plugin loading for faster startup
const app = new Elysia()
  .use(import('./modules/users'))
  .use(import('./modules/posts'))
```

## Plugin with Configuration

### GOOD

```typescript
interface CorsConfig {
  origin: string | string[]
  credentials?: boolean
}

const corsPlugin = (config: CorsConfig) =>
  new Elysia({ name: 'cors' })
    .onRequest(({ set }) => {
      set.headers['Access-Control-Allow-Origin'] = Array.isArray(config.origin)
        ? config.origin.join(',')
        : config.origin
    })

// Usage
app.use(corsPlugin({ origin: 'https://example.com', credentials: true }))
```

## Official Plugins

```typescript
// Common official plugins
import { cors } from '@elysiajs/cors'
import { jwt } from '@elysiajs/jwt'
import { bearer } from '@elysiajs/bearer'
import { swagger } from '@elysiajs/swagger'
import { staticPlugin } from '@elysiajs/static'
import { html } from '@elysiajs/html'
import { cron } from '@elysiajs/cron'

const app = new Elysia()
  .use(cors())
  .use(swagger())
  .use(jwt({ name: 'jwt', secret: process.env.JWT_SECRET! }))
```
