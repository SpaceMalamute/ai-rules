# Shared Conventions

## TypeScript

### Strict Mode Required

Enable `strict`, `noImplicitAny`, `strictNullChecks` in tsconfig.json.

### Type Guidelines

- NO `any` - use `unknown` or proper types
- Explicit return types on public functions
- Prefer `const` over `let`
- Interfaces for objects, types for unions

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
- Descriptive names: `should_returnUser_when_validId`
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

## Git Workflow

### Commits

- Atomic commits: one logical change per commit
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Present tense: "add feature" not "added feature"

### Branches

- `feature/<ticket>-<description>` for new features
- `fix/<ticket>-<description>` for bug fixes
- `refactor/<description>` for refactoring

### Pull Requests

- Small, focused PRs (< 400 lines)
- Clear description with context
- Link to related issues

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
