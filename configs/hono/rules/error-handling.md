---
description: "Hono error handling with HTTPException and global handlers"
paths:
  - "**/src/index.ts"
  - "**/src/app.ts"
  - "**/src/routes/**/*.ts"
  - "**/src/middleware/**/*.ts"
---

# Hono Error Handling

## HTTPException

### GOOD

```typescript
import { HTTPException } from 'hono/http-exception'

app.get('/posts/:id', async (c) => {
  const id = c.req.param('id')
  const post = await getPost(id)

  if (!post) {
    throw new HTTPException(404, { message: 'Post not found' })
  }

  return c.json(post)
})

// With custom response
app.delete('/admin/posts/:id', async (c) => {
  const user = c.get('user')

  if (user.role !== 'admin') {
    throw new HTTPException(403, {
      message: 'Admin access required',
      res: new Response('Forbidden', { status: 403, headers: { 'X-Reason': 'role' } }),
    })
  }

  await deletePost(c.req.param('id'))
  return c.json({ deleted: true })
})
```

### BAD

```typescript
// BAD: Returning error responses instead of throwing — skips error handler
app.get('/posts/:id', async (c) => {
  const post = await getPost(c.req.param('id'))
  if (!post) {
    return c.json({ error: 'Not found' }, 404) // Error handler won't see this
  }
  return c.json(post)
})

// BAD: Throwing plain Error — loses HTTP status
app.get('/posts/:id', async (c) => {
  throw new Error('Something went wrong') // Results in generic 500
})
```

## Global Error Handler

### GOOD

```typescript
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

const app = new Hono()

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }

  console.error('Unexpected error:', err)
  return c.json({ error: 'Internal Server Error' }, 500)
})
```

## Custom 404 Handler

### GOOD

```typescript
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    path: c.req.path,
  }, 404)
})
```

## Error Handling in Middleware

### GOOD

```typescript
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'

export const requireAuth = createMiddleware(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')

  if (!token) {
    throw new HTTPException(401, { message: 'Authentication required' })
  }

  try {
    const user = await verifyToken(token)
    c.set('user', user)
  } catch {
    throw new HTTPException(401, { message: 'Invalid or expired token' })
  }

  await next()
})
```

## Structured Error Responses

### GOOD

```typescript
// Consistent error shape across the API
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({
      error: {
        status: err.status,
        message: err.message,
      },
    }, err.status)
  }

  return c.json({
    error: {
      status: 500,
      message: 'Internal Server Error',
    },
  }, 500)
})
```
