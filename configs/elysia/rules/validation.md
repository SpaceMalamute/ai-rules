---
description: "Elysia validation with TypeBox (Elysia.t), schemas, and reference models"
paths:
  - "**/src/modules/**/model.ts"
  - "**/src/modules/**/index.ts"
  - "**/src/schemas/**/*.ts"
  - "**/src/routes/**/*.ts"
---

# Elysia Validation

## TypeBox Schema (Elysia.t)

### GOOD

```typescript
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .post('/users', ({ body }) => createUser(body), {
    body: t.Object({
      username: t.String({ minLength: 3 }),
      email: t.String({ format: 'email' }),
      age: t.Optional(t.Number({ minimum: 0 })),
    }),
    response: {
      200: t.Object({
        id: t.String(),
        username: t.String(),
      }),
      400: t.Object({
        error: t.String(),
      }),
    },
  })
```

### BAD

```typescript
// BAD: Manual validation instead of schema
app.post('/users', ({ body }) => {
  if (!body.username || body.username.length < 3) {
    throw new Error('Invalid username')
  }
  return createUser(body)
})
```

## Multi-Target Validation

### GOOD

```typescript
app.get('/search', ({ query }) => search(query), {
  query: t.Object({
    term: t.String(),
    page: t.Optional(t.Numeric({ default: 1 })),
    limit: t.Optional(t.Numeric({ default: 20 })),
  }),
})

app.get('/users/:id', ({ params: { id } }) => getUser(id), {
  params: t.Object({
    id: t.Numeric(),
  }),
})

app.get('/api/data', ({ headers }) => getData(headers), {
  headers: t.Object({
    'x-api-key': t.String(),
  }),
})
```

## Reference Models

### GOOD

```typescript
// Define reusable models once
const app = new Elysia()
  .model({
    'user.create': t.Object({
      username: t.String(),
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 8 }),
    }),
    'user.response': t.Object({
      id: t.String(),
      username: t.String(),
      email: t.String(),
    }),
  })
  .post('/users', ({ body }) => createUser(body), {
    body: 'user.create',
    response: { 200: 'user.response' },
  })
```

## Extracting Types from Schemas

### GOOD

```typescript
// src/modules/users/model.ts
import { t } from 'elysia'

export const createUserSchema = t.Object({
  username: t.String(),
  email: t.String({ format: 'email' }),
})

// Extract TypeScript type from schema
export type CreateUser = typeof createUserSchema.static
// { username: string; email: string }
```

## Custom Error Messages

### GOOD

```typescript
app.post('/register', ({ body }) => register(body), {
  body: t.Object({
    email: t.String({
      format: 'email',
      error: 'Please provide a valid email address',
    }),
    password: t.String({
      minLength: 8,
      error: 'Password must be at least 8 characters',
    }),
  }),
})
```

## File Uploads

### GOOD

```typescript
app.post('/upload', ({ body: { file } }) => saveFile(file), {
  body: t.Object({
    file: t.File({ type: 'image/*', maxSize: '5m' }),
  }),
})

// Multiple files
app.post('/gallery', ({ body: { images } }) => saveImages(images), {
  body: t.Object({
    images: t.Files({ type: 'image/*' }),
  }),
})
```

## Standard Schema (Zod, Valibot)

### GOOD

```typescript
import { z } from 'zod'

// Elysia supports Standard Schema-compliant libraries
app.get('/users/:id', ({ params: { id } }) => getUser(id), {
  params: z.object({
    id: z.coerce.number(),
  }),
})
```
