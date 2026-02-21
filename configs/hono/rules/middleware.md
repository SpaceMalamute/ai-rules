---
description: "Hono middleware patterns and built-in middleware"
paths:
  - "**/src/middleware/**/*.ts"
  - "**/src/index.ts"
  - "**/src/app.ts"
---

# Hono Middleware

## Custom Middleware with createMiddleware

### GOOD

```typescript
// src/middleware/auth.ts
import { createMiddleware } from 'hono/factory'
import type { Env } from '../types'

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const user = await verifyToken(token)
  c.set('user', user)
  await next()
})
```

### BAD

```typescript
// BAD: Untyped middleware — loses variable types
const authMiddleware = async (c, next) => {
  c.set('user', user) // no type safety on 'user' key
  await next()
}

// BAD: Forgetting await next()
const logger = createMiddleware(async (c, next) => {
  console.log(c.req.url)
  next() // Missing await — downstream middleware may not complete
})
```

## Middleware with Post-Processing (Onion Model)

### GOOD

```typescript
import { createMiddleware } from 'hono/factory'

export const timing = createMiddleware(async (c, next) => {
  const start = Date.now()
  await next()
  const duration = Date.now() - start
  c.res.headers.set('X-Response-Time', `${duration}ms`)
})
```

## Applying Middleware

### GOOD

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { authMiddleware } from './middleware/auth'

const app = new Hono()

// Global middleware (applied to all routes)
app.use(logger())
app.use(secureHeaders())

// Path-scoped middleware
app.use('/api/*', cors({ origin: 'https://example.com', credentials: true }))
app.use('/api/*', authMiddleware)

// Route definitions AFTER middleware
app.get('/api/users', (c) => c.json([]))
```

### BAD

```typescript
// BAD: Middleware after route — won't apply to that route
app.get('/api/users', (c) => c.json([]))
app.use('/api/*', authMiddleware) // Too late for /api/users
```

## Built-in Middleware Reference

```typescript
// Authentication
import { basicAuth } from 'hono/basic-auth'
import { bearerAuth } from 'hono/bearer-auth'
import { jwt } from 'hono/jwt'

app.use('/admin/*', basicAuth({ username: 'admin', password: 'secret' }))
app.use('/api/*', bearerAuth({ token: 'my-token' }))
app.use('/api/*', jwt({ secret: 'my-secret' }))

// Security
import { cors } from 'hono/cors'
import { csrf } from 'hono/csrf'
import { secureHeaders } from 'hono/secure-headers'

app.use(cors())
app.use(csrf())
app.use(secureHeaders())

// Performance
import { compress } from 'hono/compress'
import { cache } from 'hono/cache'
import { etag } from 'hono/etag'
import { bodyLimit } from 'hono/body-limit'
import { timeout } from 'hono/timeout'

app.use(compress())
app.get('/static/*', cache({ cacheName: 'my-app', cacheControl: 'max-age=3600' }))
app.use(etag())
app.post('/upload', bodyLimit({ maxSize: 10 * 1024 * 1024 })) // 10MB
app.use(timeout(5000))

// Utilities
import { logger } from 'hono/logger'
import { requestId } from 'hono/request-id'
import { prettyJSON } from 'hono/pretty-json'

app.use(logger())
app.use(requestId())
app.use(prettyJSON())
```

## Middleware Composition

### GOOD

```typescript
// Compose multiple middleware for a group
const apiMiddleware = [cors(), authMiddleware, rateLimiter]

// Apply all at once
for (const mw of apiMiddleware) {
  app.use('/api/*', mw)
}
```

## Per-Route Middleware

### GOOD

```typescript
app.get('/admin/stats', adminOnly, (c) => {
  return c.json({ stats: 'data' })
})

app.post('/users', rateLimiter, zValidator('json', createUserSchema), (c) => {
  const data = c.req.valid('json')
  return c.json(data, 201)
})
```
