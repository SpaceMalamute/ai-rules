---
description: "Eden Treaty for end-to-end type-safe client-server communication"
paths:
  - "**/src/client.ts"
  - "**/src/client/**/*.ts"
  - "**/src/eden/**/*.ts"
  - "**/src/index.ts"
---

# Elysia Eden Treaty

## Server-Side Type Export

### GOOD

```typescript
// src/index.ts
import { Elysia, t } from 'elysia'
import { users } from './modules/users'
import { posts } from './modules/posts'

// Chain .use() for type inference
const app = new Elysia()
  .use(users)
  .use(posts)
  .listen(3000)

// Export type for Eden client
export type App = typeof app
```

### BAD

```typescript
// BAD: Non-chained usage loses type information
const app = new Elysia()
app.use(users)
app.use(posts)

export type App = typeof app // Eden won't see routes
```

## Client-Side Usage

### GOOD

```typescript
// src/client.ts
import { treaty } from '@elysiajs/eden'
import type { App } from './index'

const api = treaty<App>('http://localhost:3000')

// Fully typed — knows routes and their methods
const { data: posts, error } = await api.posts.get()

// POST with typed body
const { data: created } = await api.posts.post({
  title: 'New Post',
  content: 'Hello world',
})

// Dynamic params via function call
const { data: user } = await api.users({ id: '123' }).get()
```

## Path Mapping

### GOOD

```typescript
// Server routes map to client object paths:
// GET  /posts          → api.posts.get()
// POST /posts          → api.posts.post({ ... })
// GET  /posts/:id      → api.posts({ id: '1' }).get()
// PUT  /users/:id      → api.users({ id: '1' }).put({ ... })
// GET  /api/v1/health  → api.api.v1.health.get()
```

## Error Handling

### GOOD

```typescript
const { data, error, status } = await api.posts.get()

// error is typed based on response schema
if (error) {
  switch (error.status) {
    case 400:
      console.error('Validation error:', error.value)
      break
    case 401:
      console.error('Unauthorized')
      break
    default:
      console.error('Unknown error:', error.value)
  }
  return
}

// data is typed and non-null here
console.log(data)
```

## Eden Fetch (Alternative Syntax)

### GOOD

```typescript
import { edenFetch } from '@elysiajs/eden'
import type { App } from './index'

const fetch = edenFetch<App>('http://localhost:3000')

// fetch-like syntax with type safety
const { data } = await fetch('/posts/:id', {
  params: { id: '123' },
})
```

## Using with React / Frontend

### GOOD

```typescript
// hooks/useApi.ts
import { treaty } from '@elysiajs/eden'
import type { App } from '@server/index'

export const api = treaty<App>('http://localhost:3000')

// In component
const Posts = () => {
  const [posts, setPosts] = useState<typeof api.posts.get extends
    (...args: any) => Promise<{ data: infer T }> ? T : never>([])

  useEffect(() => {
    api.posts.get().then(({ data }) => {
      if (data) setPosts(data)
    })
  }, [])
}
```
