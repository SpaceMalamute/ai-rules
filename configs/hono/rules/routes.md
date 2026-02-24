---
description: "Hono routing patterns and route modules"
paths:
  - "**/src/index.ts"
  - "**/src/routes/**/*.ts"
  - "**/src/app.ts"
---

# Hono Routes

## Route Module Pattern

- Each resource file exports a `new Hono()` instance with chained route definitions
- Chain `.get().post().put().delete()` on the same instance — required for RPC type inference
- Mount sub-applications with `app.route('/prefix', subApp)` in the root app
- Use `basePath('/api/v1')` for API versioning on the root or sub-app

## Inline Handlers

- Always define handlers inline within the route chain
- Never extract handlers into separate functions, classes, or controller files — breaks TypeScript param inference

## Path Parameters

- Named: `'/users/:id'` — access via `c.req.param('id')` (typed as `string`)
- Multiple: `'/posts/:postId/comments/:commentId'` — destructure via `c.req.param()`
- Optional: `'/animals/:type?'` — typed as `string | undefined`
- Regex-constrained: `'/post/:date{[0-9]+}'` — validates at routing level

## Query Parameters

- Single value: `c.req.query('q')` returns `string | undefined`
- Multiple values: `c.req.queries('tag')` returns `string[] | undefined`
- Prefer `zValidator('query', schema)` for typed, validated query params

## Response Helpers

| Method           | Use case                          |
|------------------|-----------------------------------|
| `c.json(data)`   | JSON response (sets Content-Type) |
| `c.text(str)`    | Plain text response               |
| `c.html(str)`    | HTML response                     |
| `c.redirect(url)`| 302 redirect (or 301 with arg)    |
| `c.notFound()`   | Trigger 404 handler               |
| `c.status(code)` | Set status before response        |
| `c.header(k, v)` | Set response header               |

## Anti-patterns

- Do NOT use non-chained route definitions (`app.get(...)` on separate lines) — breaks RPC type export
- Do NOT extract handlers into controller classes — loses path parameter type inference
- Do NOT use `new Response(JSON.stringify(...))` — use `c.json()` for proper typing and headers
- Do NOT use `c.req.json()` for body parsing in validated routes — use `c.req.valid('json')` instead
- Do NOT create monolithic route files — split large resources into sub-routers mounted via `app.route()`
