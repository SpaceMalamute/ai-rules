---
description: "Hono RPC for type-safe client-server communication"
paths:
  - "**/src/client.ts"
  - "**/src/client/**/*.ts"
  - "**/src/routes/**/*.ts"
  - "**/src/index.ts"
---

# Hono RPC

## Server-Side Type Export

### GOOD

```typescript
// src/routes/posts.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const createPostSchema = z.object({
  title: z.string(),
  body: z.string(),
})

// Chain methods for type inference
const app = new Hono()
  .get('/posts', async (c) => {
    return c.json(await getPosts())
  })
  .post('/posts',
    zValidator('json', createPostSchema),
    async (c) => {
      const data = c.req.valid('json')
      return c.json(await createPost(data), 201)
    },
  )
  .get('/posts/:id', async (c) => {
    const id = c.req.param('id')
    return c.json(await getPost(id))
  })

export default app

// src/index.ts
import { Hono } from 'hono'
import posts from './routes/posts'

const app = new Hono()
app.route('/', posts)

export type AppType = typeof app
export default app
```

### BAD

```typescript
// BAD: Non-chained routes lose type information for RPC
const app = new Hono()
app.get('/posts', handler1)
app.post('/posts', handler2)

export type AppType = typeof app // Types won't include route details
```

## Client-Side Usage

### GOOD

```typescript
// src/client.ts
import { hc } from 'hono/client'
import type { AppType } from './index'

const client = hc<AppType>('http://localhost:8787')

// Fully typed — knows about /posts and its methods
const listRes = await client.posts.$get()
const posts = await listRes.json() // typed as Post[]

const createRes = await client.posts.$post({
  json: { title: 'New Post', body: 'Content' },
})

const getRes = await client.posts[':id'].$get({
  param: { id: '123' },
})
```

## Type Utilities

### GOOD

```typescript
import type { InferRequestType, InferResponseType } from 'hono/client'
import type { AppType } from './index'

// Infer request/response types for any endpoint
type CreatePostRequest = InferRequestType<typeof client.posts.$post>
type CreatePostResponse = InferResponseType<typeof client.posts.$post>
type PostListResponse = InferResponseType<typeof client.posts.$get>

// Use with status code for union discrimination
type PostResponse200 = InferResponseType<typeof client.posts.$get, 200>
```

## URL and Path Helpers

### GOOD

```typescript
const client = hc<AppType>('http://localhost:8787')

// Get typed URL object
const url = client.posts[':id'].$url({ param: { id: '123' } })
// → URL { href: 'http://localhost:8787/posts/123' }

// Get path string (no base URL needed)
const path = client.posts[':id'].$path({ param: { id: '123' } })
// → '/posts/123'
```

## Large App Performance

For large applications, RPC type inference may slow the IDE. Mitigate with:

### GOOD

```typescript
// Split into smaller route apps
// src/routes/posts.ts
const postsRoute = new Hono()
  .get('/', handler)
  .post('/', handler)

// src/routes/users.ts
const usersRoute = new Hono()
  .get('/', handler)
  .post('/', handler)

// Export types per module
export type PostsType = typeof postsRoute
export type UsersType = typeof usersRoute
```
