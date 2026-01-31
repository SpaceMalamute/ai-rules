---
paths:
  - "**/*"
---

# Logging Principles

## Log Levels

| Level | When to Use |
|-------|-------------|
| `debug` | Development details, variable values |
| `info` | Business events, state changes |
| `warn` | Recoverable issues, deprecations |
| `error` | Failures requiring attention |

## What to Log

- Application lifecycle (startup, shutdown)
- Business events (order placed, user registered)
- External calls with duration (HTTP, DB)
- Errors with full context

## What NOT to Log

- Passwords
- Auth tokens
- Credit card numbers
- PII (SSN, personal data)
- Full request bodies (may contain secrets)

## Best Practices

- **Structured logging** (JSON) in production
- **Include context**: userId, requestId, traceId
- **Redact sensitive fields** before logging
- **Correlation IDs** across async operations
- **Log at boundaries**: API entry/exit, external calls

## Log Message Guidelines

- Use consistent format across the codebase
- Include actionable information
- Avoid logging the same event multiple times
- Don't log expected/handled errors at ERROR level
