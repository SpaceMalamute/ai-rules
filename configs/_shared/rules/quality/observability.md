---
paths:
  - "**/*"
---

# Observability (Logs, Metrics, Traces)

## Three Pillars

| Pillar | Purpose | Tools |
|--------|---------|-------|
| **Logs** | Event records, debugging | ELK, Loki, CloudWatch |
| **Metrics** | Numeric measurements | Prometheus, Datadog, CloudWatch |
| **Traces** | Request flow across services | Jaeger, Zipkin, X-Ray |

## Structured Logging

### Format (JSON)

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "User logged in",
  "service": "auth-service",
  "version": "1.2.3",
  "traceId": "abc-123-def",
  "spanId": "span-456",
  "userId": "user-789",
  "duration": 45,
  "metadata": {
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

### Log Levels

| Level | When to Use |
|-------|-------------|
| `error` | Failures requiring attention |
| `warn` | Recoverable issues, deprecations |
| `info` | Business events, state changes |
| `debug` | Development details (disabled in prod) |

### What to Log

```
✓ Request received (info)
✓ Request completed with duration (info)
✓ Business events (user created, order placed)
✓ External service calls with duration
✓ Errors with stack trace and context
✓ Authentication events

✗ Passwords, tokens, secrets
✗ Credit card numbers, PII
✗ Full request/response bodies
✗ Health check spam
```

### Log Message Guidelines

- Use consistent format across the codebase
- Include actionable information
- Avoid logging the same event multiple times
- Don't log expected/handled errors at ERROR level

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

## Metrics

### Types

| Type | Use Case | Example |
|------|----------|---------|
| Counter | Cumulative totals | `http_requests_total` |
| Gauge | Current value | `active_connections` |
| Histogram | Value distribution | `request_duration_seconds` |
| Summary | Percentiles | `request_latency_p99` |

### Key Metrics (RED Method)

```
# Rate - requests per second
http_requests_total{method="GET", path="/api/users"}

# Errors - error rate
http_requests_total{status="5xx"} / http_requests_total

# Duration - latency percentiles
http_request_duration_seconds{quantile="0.99"}
```

### Business Metrics

```
# Orders
orders_created_total
orders_value_total
orders_by_status{status="completed"}

# Users
users_registered_total
users_active_daily

# Performance
cache_hit_ratio
queue_depth
```

## Health Checks

### Endpoints

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

### Response Format

```json
{
  "status": "healthy",
  "version": "1.2.3",
  "uptime": 3600,
  "checks": {
    "database": { "status": "ok", "latency": 5 },
    "redis": { "status": "ok", "latency": 2 },
    "externalApi": { "status": "degraded", "latency": 500 }
  }
}
```

## Distributed Tracing

### Span Structure

```
Trace: abc-123
├── Span: API Gateway (50ms)
│   ├── Span: Auth Service (10ms)
│   └── Span: Order Service (35ms)
│       ├── Span: Database Query (15ms)
│       └── Span: Payment Service (18ms)
```

### OpenTelemetry Setup

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  serviceName: 'order-service',
  traceExporter: new OTLPTraceExporter({
    url: 'http://jaeger:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

## Alerting Rules

### SLO-based Alerts

```yaml
# Alert when error rate > 1% for 5 minutes
- alert: HighErrorRate
  expr: |
    sum(rate(http_requests_total{status=~"5.."}[5m]))
    / sum(rate(http_requests_total[5m])) > 0.01
  for: 5m
  labels:
    severity: critical

# Alert when p99 latency > 1s
- alert: HighLatency
  expr: |
    histogram_quantile(0.99,
      rate(http_request_duration_seconds_bucket[5m])
    ) > 1
  for: 5m
  labels:
    severity: warning
```

## Dashboards

### Essential Panels

1. **Request rate** (per endpoint)
2. **Error rate** (4xx, 5xx breakdown)
3. **Latency** (p50, p95, p99)
4. **Active connections**
5. **Resource usage** (CPU, memory)
6. **Business metrics** (orders, users)

## Error Handling

### Core Rules

- **Fail fast, fail loud** - Don't swallow errors silently
- **Use typed errors** with error codes
- **Separate user-facing from internal errors**
- **Always log with context** before throwing

### Error Categories

| Type | HTTP Code | When to Use |
|------|-----------|-------------|
| Validation | 400 | Invalid input format |
| Authentication | 401 | Missing/invalid credentials |
| Authorization | 403 | Insufficient permissions |
| Not Found | 404 | Resource doesn't exist |
| Conflict | 409 | Duplicate resource |
| Internal | 500 | Unexpected server error |

### Error Response Format

Consistent API error responses should include:
- Error code (machine-readable)
- Message (human-readable)
- Details/context (optional)
- Request ID (for correlation)

### Best Practices

- Create error hierarchy with base error class
- Include enough context for debugging
- Use Result/Either pattern for expected failures
- Implement retry with exponential backoff for transient errors
- Centralize error handling (middleware/interceptor)

## Anti-patterns

- Logging sensitive data
- No correlation IDs
- Alerting on symptoms not causes
- Too many alerts (alert fatigue)
- Metrics without labels
- No retention policy
- Health checks that don't check dependencies
- Empty catch blocks
- Logging without rethrowing
- Exposing stack traces to users
- Generic "Something went wrong" without logging details
- Swallowing errors in fire-and-forget operations
