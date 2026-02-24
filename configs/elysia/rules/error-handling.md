---
description: "Elysia error handling with onError, custom errors, and status function"
paths:
  - "**/src/index.ts"
  - "**/src/app.ts"
  - "**/src/modules/**/index.ts"
  - "**/src/plugins/**/*.ts"
---

# Elysia Error Handling

## Error Strategy

| Mechanism | Purpose | When to Use |
|-----------|---------|-------------|
| `onError` hook | Centralized error handling | Global/plugin-level catch-all for thrown errors |
| `status()` helper | Typed error responses | Route-level expected errors (404, 400) — bypasses `onError` |
| Custom error classes | Domain errors | Register via `.error()`, caught by `onError` with typed `code` |
| `toResponse()` method | Full response control | On custom error classes for self-serializing errors |

## `onError` Lifecycle Hook

Register on the root app or in an error-handling plugin. Use `code` to discriminate built-in error types: `NOT_FOUND`, `VALIDATION`, `INTERNAL_SERVER_ERROR`, `PARSE`, `UNKNOWN`. Mount error plugins BEFORE route plugins — hook order matters.

For plugin-level error handlers that should apply globally, use `{ as: 'global' }`.

## `status()` Helper (Preferred for Expected Errors)

Use `status(code, body)` in route handlers for expected error conditions. It bypasses `onError` and sends the response directly. Requires response schemas per status code to enable type safety:

```typescript
{ response: { 200: t.Object({...}), 404: t.Object({ error: t.String() }) } }
```

## Custom Error Classes

Register with `.error({ AppError, NotFoundError })` — Elysia maps class names to `code` strings in `onError`. Add `toResponse()` method on a class for self-serializing errors that bypass `onError` entirely.

## Anti-Patterns

- Do NOT wrap every handler in try-catch — use `onError` for centralized handling
- Do NOT use `set.status = 404` when `status()` helper is available — `status()` is typed and cleaner
- Do NOT register error plugins after route plugins — hooks only apply to routes registered after them
- Do NOT throw plain strings or generic `Error` — use custom error classes with `.error()` for typed discrimination
