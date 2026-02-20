---
paths:
  - "**/*.ts"
  - "**/*.js"
  - "**/*.py"
  - "**/*.cs"
---

# Observability (Logs, Metrics, Traces)

## Structured Logging (JSON)

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "User logged in",
  "service": "auth-service",
  "traceId": "abc-123-def",
  "userId": "user-789",
  "duration": 45
}
```

### Log Levels

| Level | When to Use |
|-------|-------------|
| `error` | Failures requiring attention |
| `warn` | Recoverable issues, deprecations |
| `info` | Business events, state changes |
| `debug` | Development details (disabled in prod) |

### What to Log / Not Log

```
DO:
  Request received/completed with duration (info)
  Business events (user created, order placed)
  External service calls with duration
  Errors with stack trace and context
  Authentication events

NEVER:
  Passwords, tokens, secrets
  Credit card numbers, PII
  Full request/response bodies
  Health check spam
```

## Correlation IDs

Pass trace ID through entire request chain:

```typescript
// Middleware to extract/generate trace ID
app.use((req, res, next) => {
  req.traceId = req.headers['x-trace-id'] || uuid();
  res.setHeader('x-trace-id', req.traceId);
  next();
});

// Include in all logs
logger.info('Processing order', {
  traceId: req.traceId,
  orderId: order.id,
});

// Pass to downstream services
await fetch(url, {
  headers: { 'x-trace-id': req.traceId }
});
```

## Health Checks

```typescript
// Liveness - is the app running?
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness - can the app serve traffic?
app.get('/health/ready', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    externalApi: await checkExternalApi(),
  };

  const healthy = Object.values(checks).every(c => c.status === 'ok');
  res.status(healthy ? 200 : 503).json({ checks });
});
```

## Key Metrics (RED Method)

| Metric | What to Track |
|--------|---------------|
| **Rate** | Requests per second per endpoint |
| **Errors** | Error rate (5xx / total) |
| **Duration** | Latency percentiles (p50, p95, p99) |

## Error Handling Conventions

| Type | HTTP Code | When to Use |
|------|-----------|-------------|
| Validation | 400 | Invalid input format |
| Authentication | 401 | Missing/invalid credentials |
| Authorization | 403 | Insufficient permissions |
| Not Found | 404 | Resource doesn't exist |
| Conflict | 409 | Duplicate resource |
| Internal | 500 | Unexpected server error |

- **Fail fast, fail loud** — don't swallow errors silently
- **Separate user-facing from internal errors**
- **Always log with context** before throwing
- Centralize error handling (middleware/interceptor)
- Use Result/Either pattern for expected failures

## Anti-patterns

- Logging sensitive data (PII, tokens)
- No correlation IDs across services
- Empty catch blocks / swallowing errors
- Logging without rethrowing
- Exposing stack traces to users
- Generic "Something went wrong" without logging details
