---
paths:
  - "**/*"
---

# Error Handling Principles

## Core Rules

- **Fail fast, fail loud** - Don't swallow errors silently
- **Use typed errors** with error codes
- **Separate user-facing from internal errors**
- **Always log with context** before throwing

## Error Categories

| Type | HTTP Code | When to Use |
|------|-----------|-------------|
| Validation | 400 | Invalid input format |
| Authentication | 401 | Missing/invalid credentials |
| Authorization | 403 | Insufficient permissions |
| Not Found | 404 | Resource doesn't exist |
| Conflict | 409 | Duplicate resource |
| Internal | 500 | Unexpected server error |

## Error Response Format

Consistent API error responses should include:
- Error code (machine-readable)
- Message (human-readable)
- Details/context (optional)
- Request ID (for correlation)

## Anti-Patterns

- Empty catch blocks
- Logging without rethrowing
- Exposing stack traces to users
- Generic "Something went wrong" without logging details
- Swallowing errors in fire-and-forget operations

## Best Practices

- Create error hierarchy with base error class
- Include enough context for debugging
- Use Result/Either pattern for expected failures
- Implement retry with exponential backoff for transient errors
- Centralize error handling (middleware/interceptor)
