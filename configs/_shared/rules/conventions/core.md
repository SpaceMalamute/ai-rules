---
description: "Shared coding conventions across all technologies"
alwaysApply: true
---

# Shared Conventions

## Code Quality

### Naming - Be Explicit

- No cryptic names: No `c`, `x`, `tmp`, `data`
- No magic numbers: Use named constants
- Small functions: < 30 lines, single responsibility
- Max nesting: 3 levels, use early returns
- No dead code: Delete, don't comment out

### Lint Disable - Only With Justification

Never disable lint rules without an explicit reason and ticket reference.

## Error Handling

- Never swallow errors silently
- Log with context (user ID, request ID)
- User-facing: clear, actionable messages
- Internal: detailed logs, generic user message

## Testing

- Test behavior, not implementation
- Descriptive names: `should return user when id is valid`
- One assertion per test when practical
- Mock external dependencies only

## Security

- **Never commit secrets** (use env vars)
- **Validate all inputs** (never trust user data)
- **Parameterized queries** (no string concatenation)
- **Sanitize outputs** (prevent XSS)

## Documentation

- Self-documenting code first
- Comments explain "why", not "what"
- Keep comments up-to-date or delete them

## Dependencies

- Pin exact versions in lock files
- Regular security audits (`npm audit`, `pip-audit`)
- Prefer well-maintained packages with active communities
- Minimize dependency count

## Performance

- Measure before optimizing
- Profile to find bottlenecks
- Cache expensive operations
- Lazy load when possible
- Avoid premature optimization
