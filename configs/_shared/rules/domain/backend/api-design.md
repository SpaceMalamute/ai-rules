---
description: "REST API design conventions and HTTP methods"
paths:
  - "**/controllers/**"
  - "**/routes/**"
  - "**/routers/**"
  - "**/endpoints/**"
  - "**/*.controller.ts"
  - "**/*_router.py"
---

# API Design Rules

## URL Conventions

- Use plural nouns: `/users`, `/orders`
- Use kebab-case: `/user-profiles`, `/order-items`
- Max 2 levels of nesting: `/users/:id/orders` — deeper nesting means a new top-level resource
- Use query params for filtering: `/users?status=active&role=admin`
- Non-CRUD actions as POST: `/orders/:id/cancel`

## HTTP Methods

| Method | Usage | Idempotent | Success Code |
|--------|-------|------------|-------------|
| GET | Read | Yes | 200 |
| POST | Create | No | 201 |
| PUT | Full replace | Yes | 200 |
| PATCH | Partial update | No | 200 |
| DELETE | Remove | Yes | 204 |

## Status Codes

| Code | When |
|------|------|
| 200 | Successful GET, PUT, PATCH |
| 201 | Successful POST (resource created) |
| 204 | Successful DELETE (no body) |
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 422 | Business rule violation |
| 429 | Rate limited |
| 500 | Internal server error |

## Pagination Decision Matrix

| Dataset size | Strategy |
|-------------|----------|
| Small (< 10k rows) | Offset-based: `?page=2&pageSize=20` |
| Large / real-time | Cursor-based: `?cursor=abc&limit=20` |

Always return: `total`, `page`/`cursor`, `hasNext`

## Error Response Format

Use RFC 7807 Problem Details: `type`, `title`, `status`, `detail`, `instance`, optional `errors[]` array for field-level validation.

## Versioning

- Use URL path versioning: `/api/v1/users`
- Version only on breaking changes (field removal, type change, endpoint removal)
- Adding optional fields or new endpoints is NOT a breaking change

## Anti-patterns

- DO NOT use verbs in URLs — use HTTP methods instead
- DO NOT use singular nouns — `/user/123` should be `/users/123`
- DO NOT nest deeper than 2 levels — flatten to top-level resources
- DO NOT return 200 for errors — use proper status codes
- DO NOT expose internal IDs, stack traces, or implementation details
