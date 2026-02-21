---
description: "Hono testing with Vitest, app.request(), and testClient()"
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "**/test/**/*.ts"
  - "**/vitest.config.ts"
---

# Hono Testing

## app.request() — Simple Direct Testing

### GOOD

```typescript
import { describe, it, expect } from 'vitest'
import app from '../src/index'

describe('GET /posts', () => {
  it('should return posts list', async () => {
    const res = await app.request('/posts')

    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toBeInstanceOf(Array)
  })
})

describe('POST /posts', () => {
  it('should create a post', async () => {
    const res = await app.request('/posts', {
      method: 'POST',
      body: JSON.stringify({ title: 'Hello', body: 'World' }),
      headers: { 'Content-Type': 'application/json' },
    })

    expect(res.status).toBe(201)

    const body = await res.json()
    expect(body).toHaveProperty('title', 'Hello')
  })

  it('should reject invalid data', async () => {
    const res = await app.request('/posts', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    expect(res.status).toBe(400)
  })
})
```

## Mock Environment Bindings

### GOOD

```typescript
// Third argument to app.request() provides env bindings
it('should use env bindings', async () => {
  const res = await app.request('/', {}, {
    DB: mockDatabase,
    API_KEY: 'test-key',
  })

  expect(res.status).toBe(200)
})
```

## testClient() — Type-Safe Testing

### GOOD

```typescript
import { describe, it, expect } from 'vitest'
import { testClient } from 'hono/testing'
import app from '../src/routes/posts'

describe('Posts API', () => {
  const client = testClient(app)

  it('should list posts', async () => {
    const res = await client.posts.$get()

    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toBeInstanceOf(Array)
  })

  it('should create a post', async () => {
    const res = await client.posts.$post({
      json: { title: 'Test', body: 'Content' },
    })

    expect(res.status).toBe(201)
  })

  it('should search with query params', async () => {
    const res = await client.posts.$get({
      query: { search: 'hono', page: '1' },
    })

    expect(res.status).toBe(200)
  })
})
```

### BAD

```typescript
// BAD: testClient() won't infer types if routes aren't chained
const app = new Hono()
app.get('/posts', handler) // Not chained — use app.request() instead

// BAD: Typing response manually when testClient provides types
const res = await client.posts.$get()
const body: Post[] = await res.json() // Unnecessary — already typed via RPC inference
```

## Testing with Headers

### GOOD

```typescript
it('should authenticate with bearer token', async () => {
  const res = await app.request('/api/profile', {
    headers: { Authorization: 'Bearer valid-token' },
  })

  expect(res.status).toBe(200)
})

it('should reject without auth', async () => {
  const res = await app.request('/api/profile')

  expect(res.status).toBe(401)
})
```

## Testing Middleware

### GOOD

```typescript
import { Hono } from 'hono'
import { authMiddleware } from '../src/middleware/auth'

describe('authMiddleware', () => {
  const app = new Hono()
  app.use(authMiddleware)
  app.get('/test', (c) => c.json({ user: c.get('user') }))

  it('should set user on valid token', async () => {
    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer valid-token' },
    })

    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.user).toBeDefined()
  })

  it('should return 401 on missing token', async () => {
    const res = await app.request('/test')

    expect(res.status).toBe(401)
  })
})
```

## Testing Error Handling

### GOOD

```typescript
it('should return 404 for unknown routes', async () => {
  const res = await app.request('/nonexistent')

  expect(res.status).toBe(404)
})

it('should handle server errors gracefully', async () => {
  const res = await app.request('/api/failing-endpoint')

  expect(res.status).toBe(500)

  const body = await res.json()
  expect(body).toHaveProperty('error')
})
```
