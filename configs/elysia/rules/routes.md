---
description: "Elysia route definitions, method chaining, guards, and path parameters"
paths:
  - "**/src/index.ts"
  - "**/src/modules/**/index.ts"
  - "**/src/routes/**/*.ts"
  - "**/src/app.ts"
---

# Elysia Routes

## Method Chaining

### GOOD

```typescript
import { Elysia } from 'elysia'

// Chain methods for type inference — required for Eden
const app = new Elysia()
  .get('/posts', () => getPosts())
  .post('/posts', ({ body }) => createPost(body))
  .get('/posts/:id', ({ params: { id } }) => getPost(id))
  .delete('/posts/:id', ({ params: { id } }) => deletePost(id))
```

### BAD

```typescript
// BAD: Non-chained routes break type inference for Eden
const app = new Elysia()
app.get('/posts', handler1)
app.post('/posts', handler2)

export type App = typeof app // Eden won't see route details
```

## Mounting Modules

### GOOD

```typescript
// src/index.ts
import { Elysia } from 'elysia'
import { users } from './modules/users'
import { posts } from './modules/posts'

const app = new Elysia()
  .use(users)
  .use(posts)
  .listen(3000)

export type App = typeof app

// src/modules/users/index.ts
import { Elysia } from 'elysia'

export const users = new Elysia({ prefix: '/users' })
  .get('/', () => getUsers())
  .get('/:id', ({ params: { id } }) => getUser(id))
  .post('/', ({ body }) => createUser(body))
```

## Path Parameters

### GOOD

```typescript
// Destructured params — fully typed
app.get('/users/:id', ({ params: { id } }) => getUser(id))

// Multiple params
app.get('/users/:userId/posts/:postId', ({ params: { userId, postId } }) =>
  getUserPost(userId, postId)
)

// Wildcard
app.get('/files/*', ({ params }) => serveFile(params['*']))
```

## Guard Pattern

### GOOD

```typescript
import { Elysia, t } from 'elysia'

// Apply shared schemas to multiple routes
const app = new Elysia()
  .guard(
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
      }),
    },
    (app) =>
      app
        .post('/sign-up', ({ body }) => signUp(body))
        .post('/sign-in', ({ body }) => signIn(body))
  )
```

### BAD

```typescript
// BAD: Duplicating schemas across routes
app
  .post('/sign-up', ({ body }) => signUp(body), {
    body: t.Object({ username: t.String(), password: t.String() }),
  })
  .post('/sign-in', ({ body }) => signIn(body), {
    body: t.Object({ username: t.String(), password: t.String() }),
  })
```

## Group with Prefix

### GOOD

```typescript
const app = new Elysia()
  .group('/api/v1', (app) =>
    app
      .get('/users', () => getUsers())
      .get('/posts', () => getPosts())
  )
```

## Controller Pattern

### GOOD

```typescript
// Pass extracted values to services, not the full Context
import { UserService } from './service'

export const users = new Elysia({ prefix: '/users' })
  .get('/', () => UserService.findAll())
  .get('/:id', ({ params: { id } }) => UserService.findById(id))
  .post('/', ({ body }) => UserService.create(body))
```

### BAD

```typescript
// BAD: Passing full Context to service classes
abstract class UserController {
  static getUser(context: Context) {
    // Breaks encapsulation, harder to test
  }
}
```
