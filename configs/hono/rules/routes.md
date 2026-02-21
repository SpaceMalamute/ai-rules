---
description: "Hono routing patterns and route modules"
paths:
  - "**/src/index.ts"
  - "**/src/routes/**/*.ts"
  - "**/src/app.ts"
---

# Hono Routes

## Route Module Pattern

### GOOD

```typescript
// src/routes/authors.ts
import { Hono } from 'hono'

const app = new Hono()
  .get('/', async (c) => {
    const authors = await getAuthors()
    return c.json(authors)
  })
  .get('/:id', async (c) => {
    const id = c.req.param('id')
    const author = await getAuthor(id)
    return c.json(author)
  })
  .post('/', async (c) => {
    const body = await c.req.json()
    const author = await createAuthor(body)
    return c.json(author, 201)
  })

export default app
```

### BAD

```typescript
// BAD: Separate controller class — breaks type inference
class AuthorController {
  static getAll = (c: Context) => { /* ... */ }
}
app.get('/', AuthorController.getAll)

// BAD: Not chaining — loses RPC type inference
const app = new Hono()
app.get('/', handler1)
app.post('/', handler2)
```

## Mounting Route Modules

### GOOD

```typescript
// src/index.ts
import { Hono } from 'hono'
import authors from './routes/authors'
import books from './routes/books'

const app = new Hono()
  .basePath('/api')

app.route('/authors', authors)
app.route('/books', books)

export default app
```

## Path Parameters

### GOOD

```typescript
// Named params
app.get('/users/:id', (c) => {
  const id = c.req.param('id') // typed as string
  return c.json({ id })
})

// Multiple params
app.get('/posts/:postId/comments/:commentId', (c) => {
  const { postId, commentId } = c.req.param()
  return c.json({ postId, commentId })
})

// Optional param
app.get('/api/animals/:type?', (c) => {
  const type = c.req.param('type') // string | undefined
  return c.json({ type })
})

// Regex-constrained
app.get('/post/:date{[0-9]+}/:title{[a-z]+}', (c) => {
  const { date, title } = c.req.param()
  return c.json({ date, title })
})
```

## Query Parameters

### GOOD

```typescript
app.get('/search', (c) => {
  const q = c.req.query('q')           // string | undefined
  const tags = c.req.queries('tag')     // string[] | undefined
  return c.json({ q, tags })
})
```

## Request Body

### GOOD

```typescript
app.post('/users', async (c) => {
  const body = await c.req.json<CreateUserDto>()
  return c.json(body, 201)
})

// Form data (multipart)
app.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file'] as File
  return c.json({ name: file.name, size: file.size })
})
```

## Response Helpers

### GOOD

```typescript
app.get('/text', (c) => c.text('Hello'))
app.get('/json', (c) => c.json({ message: 'Hello' }))
app.get('/html', (c) => c.html('<h1>Hello</h1>'))
app.get('/redirect', (c) => c.redirect('/new-location'))
app.get('/redirect-permanent', (c) => c.redirect('/new-location', 301))
app.get('/not-found', (c) => c.notFound())

// Custom status + headers
app.post('/created', (c) => {
  c.status(201)
  c.header('X-Request-Id', '123')
  return c.json({ created: true })
})
```

### BAD

```typescript
// BAD: Raw Response when helpers exist
app.get('/data', (c) => {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

## Grouping with basePath

### GOOD

```typescript
// Sub-app with base path
const api = new Hono().basePath('/api/v1')

api.route('/users', usersRoute)
api.route('/posts', postsRoute)
```
