---
description: "Elysia route definitions, method chaining, guards, and path parameters"
paths:
  - "**/src/index.ts"
  - "**/src/modules/**/index.ts"
  - "**/src/routes/**/*.ts"
  - "**/src/app.ts"
---

# Elysia Routes

## Method Chaining (Mandatory)

Chain all route definitions on the same Elysia instance — breaking the chain loses type inference for Eden. This is the single most important rule in Elysia.

## Route Organization

| Pattern | Use Case | Syntax |
|---------|----------|--------|
| Module plugin | Resource CRUD | `new Elysia({ prefix: '/users' }).get('/').post('/')` |
| `.group()` | Shared prefix + middleware | `.group('/api/v1', app => app.get(...))` |
| `.guard()` | Shared schema across routes | `.guard({ body: schema }, app => app.post(...))` |

## Path Parameters

- Destructure from context: `({ params: { id } }) => ...`
- Multiple params: `/users/:userId/posts/:postId`
- Wildcard: `/files/*` accessed via `params['*']`
- Validate params with schemas: `{ params: t.Object({ id: t.Numeric() }) }`

## Response Schemas

Always define response schemas per status code — they enable:
1. Runtime response validation
2. OpenAPI documentation generation
3. Typed error responses via `status()` helper
4. Eden client type narrowing on `error.status`

## Controller Pattern

- One Elysia instance per resource with `prefix`
- Pass destructured values to service functions, never the full Context
- Mount modules via `.use()` on the root app with method chaining
- Export root app type as `export type App = typeof app`

## Anti-Patterns

- Do NOT use separate statements (`app.get(); app.post()`) — breaks type chain
- Do NOT duplicate schemas across routes — use `guard()` or `.model()` to share
- Do NOT pass full Context to services — breaks encapsulation, couples to Elysia internals
- Do NOT define routes after lifecycle hooks meant for earlier routes — hooks only apply to routes registered after them
