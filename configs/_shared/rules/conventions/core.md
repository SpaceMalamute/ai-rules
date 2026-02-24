---
description: "Shared coding conventions across all technologies"
alwaysApply: true
---

# Shared Conventions

## Naming

- Use explicit names: no `c`, `x`, `tmp`, `data` — name reveals intent
- Use named constants for magic numbers
- Small functions: < 30 lines, single responsibility
- Max nesting: 3 levels — use early returns to flatten

## Code Hygiene

- DO NOT disable lint rules without a justification and ticket reference
- DO NOT leave dead code — delete it, do not comment it out
- DO NOT swallow errors silently — log with context (user ID, request ID), then rethrow or handle

## Error Handling

- User-facing errors: clear, actionable messages
- Internal errors: detailed logs, generic user message
- Never expose stack traces to end users

## Testing

- Test behavior, not implementation
- Descriptive names: `should return user when id is valid`
- One assertion per test when practical
- Mock external dependencies only — never mock the unit under test

## Security

- Never commit secrets — use environment variables or secret managers
- Validate all inputs — never trust user data
- Use parameterized queries — no string concatenation for SQL
- Sanitize outputs — prevent XSS

## Documentation

- Self-documenting code first
- Comments explain "why", not "what"
- Delete stale comments — outdated comments are worse than none

## Dependencies

- Pin exact versions in lock files
- Audit regularly (`npm audit`, `pip-audit`, `dotnet list package --vulnerable`)
- Prefer well-maintained packages — minimize dependency count

## Performance

- Measure before optimizing — profile to find real bottlenecks
- Cache expensive operations
- Lazy load when possible
- DO NOT optimize prematurely
