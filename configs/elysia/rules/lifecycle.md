---
description: "Elysia lifecycle hooks: onRequest, beforeHandle, afterHandle, transform, resolve"
paths:
  - "**/src/index.ts"
  - "**/src/app.ts"
  - "**/src/plugins/**/*.ts"
  - "**/src/modules/**/index.ts"
---

# Elysia Lifecycle

## Hook Execution Order

```
Request → onRequest → onParse → transform/derive → [Validation]
→ beforeHandle/resolve → [Handler] → afterHandle → mapResponse
→ [onError] → afterResponse
```

## beforeHandle — Auth Guards

### GOOD

```typescript
import { Elysia } from 'elysia'

const app = new Elysia()
  .derive(({ headers }) => ({
    token: headers.authorization?.replace('Bearer ', ''),
  }))
  .get('/public', () => 'Hello')
  // beforeHandle runs after derive, before handler
  .get('/protected', ({ user }) => user, {
    beforeHandle({ token, status }) {
      if (!token) return status(401, 'Unauthorized')
    },
    resolve({ token }) {
      return { user: verifyToken(token) }
    },
  })
```

### BAD

```typescript
// BAD: Auth check inside handler — runs even if unauthorized
app.get('/protected', ({ token }) => {
  if (!token) throw new Error('Unauthorized')
  const user = verifyToken(token)
  return user
})
```

## transform — Mutate Before Validation

### GOOD

```typescript
// transform runs BEFORE schema validation
app.post('/users', ({ body }) => createUser(body), {
  transform({ body }) {
    if (typeof body.email === 'string') {
      body.email = body.email.toLowerCase().trim()
    }
  },
  body: t.Object({
    email: t.String({ format: 'email' }),
  }),
})
```

## afterHandle — Transform Responses

### GOOD

```typescript
// Wrap all responses in an envelope
app.onAfterHandle(({ response }) => {
  if (typeof response === 'object') {
    return { data: response, timestamp: Date.now() }
  }
})
```

## mapResponse — Custom Serialization

### GOOD

```typescript
app.mapResponse(({ response, set }) => {
  if (response instanceof CustomResponse) {
    set.headers['x-custom'] = 'true'
    return new Response(JSON.stringify(response.data), {
      headers: { 'content-type': 'application/json' },
    })
  }
})
```

## afterResponse — Cleanup and Logging

### GOOD

```typescript
app.onAfterResponse(({ path, set }) => {
  console.log(`${set.status} ${path}`)
})
```

## Route-Level vs Global Hooks

### GOOD

```typescript
const app = new Elysia()
  // Global hook — applies to all subsequent routes
  .onBeforeHandle(({ headers, status }) => {
    if (!headers['x-api-key']) return status(403)
  })
  .get('/api/data', () => getData())
  .get('/api/users', () => getUsers())

// Route-level hook — applies to one route only
app.get('/admin', () => getAdmin(), {
  beforeHandle({ token, status }) {
    if (!isAdmin(token)) return status(403, 'Admin required')
  },
})
```

### BAD

```typescript
// BAD: Hook registered after routes — won't apply to them
app
  .get('/users', () => getUsers())
  .onBeforeHandle(() => {
    // This only applies to routes registered AFTER this line
  })
```
