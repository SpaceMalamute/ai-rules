---
description: "Hono validation with Zod and built-in validators"
paths:
  - "**/src/validators/**/*.ts"
  - "**/src/routes/**/*.ts"
  - "**/src/schemas/**/*.ts"
---

# Hono Validation

## Zod Validator (@hono/zod-validator)

### GOOD

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  tags: z.array(z.string()).optional(),
})

const app = new Hono()
  .post('/posts',
    zValidator('json', createPostSchema),
    (c) => {
      const data = c.req.valid('json') // fully typed as { title: string; body: string; tags?: string[] }
      return c.json(data, 201)
    },
  )
```

### BAD

```typescript
// BAD: Manual parsing without validator — no type safety, no auto 400 response
app.post('/posts', async (c) => {
  const body = await c.req.json()
  const result = createPostSchema.safeParse(body)
  if (!result.success) {
    return c.json({ error: result.error }, 400)
  }
  // ...
})
```

## Validate Multiple Targets

### GOOD

```typescript
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
})

const paramSchema = z.object({
  id: z.string().uuid(),
})

app
  .get('/posts',
    zValidator('query', querySchema),
    (c) => {
      const { page, limit, search } = c.req.valid('query')
      return c.json({ page, limit, search })
    },
  )
  .get('/posts/:id',
    zValidator('param', paramSchema),
    (c) => {
      const { id } = c.req.valid('param')
      return c.json({ id })
    },
  )
```

## Validate Headers and Cookies

### GOOD

```typescript
const headerSchema = z.object({
  'x-api-key': z.string().min(1),
})

app.get('/secure',
  zValidator('header', headerSchema),
  (c) => {
    const headers = c.req.valid('header')
    return c.json({ key: headers['x-api-key'] })
  },
)
```

## Custom Error Response

### GOOD

```typescript
import { zValidator } from '@hono/zod-validator'

app.post('/users',
  zValidator('json', createUserSchema, (result, c) => {
    if (!result.success) {
      return c.json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      }, 422)
    }
  }),
  (c) => {
    const data = c.req.valid('json')
    return c.json(data, 201)
  },
)
```

## Reusable Schema Definitions

### GOOD

```typescript
// src/validators/posts.ts
import { z } from 'zod'

export const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  tags: z.array(z.string()).optional(),
})

export const updatePostSchema = createPostSchema.partial()

export const postIdParam = z.object({
  id: z.string().uuid(),
})

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
```

## Built-in Validator (Without Zod)

### GOOD

```typescript
import { validator } from 'hono/validator'

app.post('/posts',
  validator('json', (value, c) => {
    const { title, body } = value

    if (!title || typeof title !== 'string') {
      return c.json({ error: 'Title is required' }, 400)
    }

    if (!body || typeof body !== 'string') {
      return c.json({ error: 'Body is required' }, 400)
    }

    return { title, body }
  }),
  (c) => {
    const data = c.req.valid('json')
    return c.json(data, 201)
  },
)
```

### BAD

```typescript
// BAD: Using built-in validator for complex schemas — use Zod instead
validator('json', (value, c) => {
  // 50+ lines of manual validation...
})
```
