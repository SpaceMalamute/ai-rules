---
description: "AdonisJS controller patterns"
paths:
  - "**/app/controllers/**/*.ts"
---

# AdonisJS Controllers

## Principles

- Controllers handle HTTP concerns ONLY: parse request, validate, delegate to service, return response
- Use `@inject()` for constructor DI -- never instantiate services with `new`
- Always validate input via `request.validateUsing(validator)` before processing

## Controller Types

| Type | When to use | Convention |
|------|------------|-----------|
| Resource controller | Standard CRUD (index, store, show, update, destroy) | `router.resource('users', UsersController).apiOnly()` |
| Single-action controller | One endpoint, one concern | `handle()` method only |
| Auth controller | Authentication flows | Group under `app/controllers/auth/` |

## Resource Controller Methods

| Method | HTTP | Purpose | Response |
|--------|------|---------|----------|
| `index` | GET /resources | List all | `response.ok(items)` |
| `store` | POST /resources | Create | `response.created(item)` |
| `show` | GET /resources/:id | Read one | `response.ok(item)` |
| `update` | PUT /resources/:id | Update | `response.ok(item)` |
| `destroy` | DELETE /resources/:id | Delete | `response.noContent()` |

## Routing

- Use lazy imports: `const UsersController = () => import('#controllers/users_controller')`
- Use `router.resource().apiOnly()` for API resources (excludes `create`/`edit` form routes)
- Use `.only()` or `.except()` to limit resource routes

## Response Helpers

Use verified response methods: `response.send()`, `response.json()`, `response.status()`, `response.redirect()`, `response.noContent()`, `response.stream()`, `response.download()`, `response.abort()`

## Anti-patterns

- Do NOT put business logic in controllers -- extract to services
- Do NOT access the database directly in controllers -- delegate to services or models
- Do NOT catch exceptions in controllers unless transforming the error shape -- let the exception handler do it
- Do NOT use raw `response.send()` -- use typed helpers for consistent status codes
