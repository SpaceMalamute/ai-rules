---
description: "Elysia testing with bun:test, .handle(), and Eden Treaty"
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "**/test/**/*.ts"
---

# Elysia Testing

## .handle() — Direct Request Testing

### GOOD

```typescript
import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'

describe('GET /posts', () => {
  const app = new Elysia()
    .get('/posts', () => [{ id: 1, title: 'Hello' }])

  it('should return posts list', async () => {
    const res = await app
      .handle(new Request('http://localhost/posts'))

    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toBeInstanceOf(Array)
  })
})
```

### BAD

```typescript
// BAD: Partial URL — .handle() requires fully qualified URLs
const res = await app.handle(new Request('/posts'))

// BAD: Starting an actual server for unit tests
app.listen(3000)
const res = await fetch('http://localhost:3000/posts')
```

## POST with Body

### GOOD

```typescript
describe('POST /posts', () => {
  const app = new Elysia()
    .post('/posts', ({ body }) => ({ id: 1, ...body }))

  it('should create a post', async () => {
    const res = await app.handle(
      new Request('http://localhost/posts', {
        method: 'POST',
        body: JSON.stringify({ title: 'Hello', content: 'World' }),
        headers: { 'Content-Type': 'application/json' },
      })
    )

    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('title', 'Hello')
  })
})
```

## Testing with Headers

### GOOD

```typescript
it('should authenticate with bearer token', async () => {
  const res = await app.handle(
    new Request('http://localhost/profile', {
      headers: { Authorization: 'Bearer valid-token' },
    })
  )

  expect(res.status).toBe(200)
})

it('should reject without auth', async () => {
  const res = await app.handle(
    new Request('http://localhost/profile')
  )

  expect(res.status).toBe(401)
})
```

## Eden Treaty — Type-Safe Testing

### GOOD

```typescript
import { describe, expect, it } from 'bun:test'
import { Elysia, t } from 'elysia'
import { treaty } from '@elysiajs/eden'

describe('Posts API', () => {
  const app = new Elysia()
    .get('/posts', () => [{ id: 1, title: 'Hello' }])
    .post('/posts', ({ body }) => ({ id: 2, ...body }), {
      body: t.Object({ title: t.String() }),
    })

  const api = treaty(app)

  it('should list posts', async () => {
    const { data, error } = await api.posts.get()

    expect(error).toBeNull()
    expect(data).toBeInstanceOf(Array)
  })

  it('should create a post', async () => {
    const { data, error } = await api.posts.post({
      title: 'New Post',
    })

    expect(error).toBeNull()
    expect(data).toHaveProperty('title', 'New Post')
  })
})
```

## Testing Plugins

### GOOD

```typescript
import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { authPlugin } from '../src/plugins/auth'

describe('authPlugin', () => {
  const app = new Elysia()
    .use(authPlugin)
    .get('/test', ({ user }) => user)

  it('should set user on valid token', async () => {
    const res = await app.handle(
      new Request('http://localhost/test', {
        headers: { Authorization: 'Bearer valid-token' },
      })
    )

    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('id')
  })

  it('should return 401 on missing token', async () => {
    const res = await app.handle(
      new Request('http://localhost/test')
    )

    expect(res.status).toBe(401)
  })
})
```

## Testing Error Handling

### GOOD

```typescript
it('should return 404 for unknown routes', async () => {
  const res = await app.handle(
    new Request('http://localhost/nonexistent')
  )

  expect(res.status).toBe(404)
})

it('should return 400 for invalid body', async () => {
  const res = await app.handle(
    new Request('http://localhost/posts', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
  )

  expect(res.status).toBe(422)
})
```
