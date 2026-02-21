---
description: "Elysia error handling with onError, custom errors, and status function"
paths:
  - "**/src/index.ts"
  - "**/src/app.ts"
  - "**/src/modules/**/index.ts"
  - "**/src/plugins/**/*.ts"
---

# Elysia Error Handling

## Global onError Handler

### GOOD

```typescript
import { Elysia } from 'elysia'

const app = new Elysia()
  .onError(({ error, code, set }) => {
    switch (code) {
      case 'NOT_FOUND':
        set.status = 404
        return { error: 'Not Found' }
      case 'VALIDATION':
        set.status = 422
        return { error: 'Validation failed', details: error.message }
      case 'INTERNAL_SERVER_ERROR':
        console.error('Unexpected error:', error)
        set.status = 500
        return { error: 'Internal Server Error' }
    }
  })
```

### BAD

```typescript
// BAD: Try-catch in every handler instead of global onError
app.get('/posts', async () => {
  try {
    return await getPosts()
  } catch (e) {
    return new Response('Error', { status: 500 })
  }
})
```

## status() Function

### GOOD

```typescript
import { Elysia, t } from 'elysia'

// return status() — bypasses onError, goes directly to client
app.get('/users/:id', ({ params: { id }, status }) => {
  const user = findUser(id)

  if (!user) {
    return status(404, { error: 'User not found' })
  }

  return user
}, {
  response: {
    200: t.Object({ id: t.String(), name: t.String() }),
    404: t.Object({ error: t.String() }),
  },
})
```

### BAD

```typescript
// BAD: Manually setting status on set object when status() is cleaner
app.get('/users/:id', ({ params: { id }, set }) => {
  const user = findUser(id)
  if (!user) {
    set.status = 404
    return { error: 'User not found' }
  }
  return user
})
```

## Custom Error Classes

### GOOD

```typescript
class AppError extends Error {
  constructor(
    public message: string,
    public status: number = 400
  ) {
    super(message)
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404)
  }
}

const app = new Elysia()
  .error({ AppError, NotFoundError })
  .onError(({ code, error }) => {
    if (code === 'AppError' || code === 'NotFoundError') {
      return { error: error.message }
    }
  })
  .get('/users/:id', ({ params: { id } }) => {
    const user = findUser(id)
    if (!user) throw new NotFoundError('User')
    return user
  })
```

## toResponse() Method

### GOOD

```typescript
// Full control over the error response
class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number
  ) {
    super(message)
  }

  toResponse() {
    return Response.json(
      { error: this.message },
      { status: this.statusCode }
    )
  }
}

// Elysia automatically calls toResponse() when thrown
app.get('/data', () => {
  throw new ApiError('Forbidden', 403)
})
```

## Error Handling in Plugins

### GOOD

```typescript
const errorPlugin = new Elysia({ name: 'error-handler' })
  .error({ AppError })
  .onError({ as: 'global' }, ({ code, error, set }) => {
    if (code === 'AppError') {
      set.status = error.status
      return {
        error: {
          message: error.message,
          status: error.status,
        },
      }
    }
  })

// Mount error handler first
const app = new Elysia()
  .use(errorPlugin)
  .use(users)
  .use(posts)
```
