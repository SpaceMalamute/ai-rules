---
paths:
  - "**/controllers/**"
  - "**/routes/**"
  - "**/routers/**"
  - "**/endpoints/**"
  - "**/*.controller.ts"
  - "**/*_router.py"
---

# API Design Principles

## REST Conventions

### HTTP Methods

| Method | Usage | Idempotent | Response |
|--------|-------|------------|----------|
| `GET` | Read resource(s) | Yes | 200 + data |
| `POST` | Create resource | No | 201 + created resource |
| `PUT` | Full update | Yes | 200 + updated resource |
| `PATCH` | Partial update | Yes | 200 + updated resource |
| `DELETE` | Remove resource | Yes | 204 No Content |

### URL Structure

```
GET    /api/v1/users          # List users
GET    /api/v1/users/:id      # Get single user
POST   /api/v1/users          # Create user
PUT    /api/v1/users/:id      # Replace user
PATCH  /api/v1/users/:id      # Update user fields
DELETE /api/v1/users/:id      # Delete user

# Nested resources (max 2 levels)
GET    /api/v1/users/:id/orders
POST   /api/v1/users/:id/orders

# Actions (when CRUD doesn't fit)
POST   /api/v1/users/:id/activate
POST   /api/v1/orders/:id/cancel
```

### Naming Rules

- Use **plural nouns**: `/users`, `/orders`, `/products`
- Use **kebab-case**: `/user-profiles`, `/order-items`
- Avoid verbs in URLs (use HTTP methods instead)
- Use query params for filtering: `/users?status=active&role=admin`

## Response Format

### Success Response

```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "abc-123"
  }
}
```

### List Response with Pagination

```json
{
  "data": [ ... ],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### Error Response (RFC 7807 Problem Details)

```json
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Error",
  "status": 400,
  "detail": "One or more fields failed validation",
  "instance": "/api/v1/users",
  "errors": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "age", "message": "Must be at least 18" }
  ],
  "traceId": "abc-123"
}
```

## Status Codes

| Code | When to Use |
|------|-------------|
| `200` | Successful GET, PUT, PATCH |
| `201` | Successful POST (resource created) |
| `204` | Successful DELETE (no content) |
| `400` | Bad request (validation error) |
| `401` | Unauthorized (not authenticated) |
| `403` | Forbidden (authenticated but not allowed) |
| `404` | Resource not found |
| `409` | Conflict (duplicate resource) |
| `422` | Unprocessable entity (business rule violation) |
| `429` | Too many requests (rate limited) |
| `500` | Internal server error |

## Pagination

### Offset-based (simple, for small datasets)

```
GET /api/v1/users?page=2&pageSize=20
```

### Cursor-based (performant, for large datasets)

```
GET /api/v1/users?cursor=eyJpZCI6MTAwfQ&limit=20
```

Response includes next cursor:
```json
{
  "data": [...],
  "meta": {
    "nextCursor": "eyJpZCI6MTIwfQ",
    "hasMore": true
  }
}
```

## Filtering & Sorting

```
# Filtering
GET /api/v1/users?status=active&role=admin
GET /api/v1/orders?createdAt[gte]=2024-01-01&createdAt[lte]=2024-12-31

# Sorting
GET /api/v1/users?sort=createdAt:desc
GET /api/v1/users?sort=lastName:asc,firstName:asc

# Field selection (sparse fieldsets)
GET /api/v1/users?fields=id,name,email
```

## Versioning

### URL Path (recommended)

```
/api/v1/users
/api/v2/users
```

### Header-based (alternative)

```
Accept: application/vnd.api+json; version=1
```

## Rate Limiting

Include headers in response:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
Retry-After: 60  (when 429)
```

## HATEOAS (optional, for discoverability)

```json
{
  "data": {
    "id": "123",
    "name": "John"
  },
  "links": {
    "self": "/api/v1/users/123",
    "orders": "/api/v1/users/123/orders",
    "profile": "/api/v1/users/123/profile"
  }
}
```

## Anti-patterns

- Verbs in URLs: `/api/getUsers` → `/api/users`
- Singular nouns: `/api/user/123` → `/api/users/123`
- Deeply nested: `/api/users/1/orders/2/items/3` → `/api/order-items/3`
- Inconsistent casing: `/api/userProfiles` → `/api/user-profiles`
- Returning 200 for errors
- Exposing internal IDs or sensitive data
