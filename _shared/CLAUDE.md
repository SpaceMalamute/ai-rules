# Shared Conventions

## Git Workflow

### Branch Naming

```
feature/[ticket-id]-short-description
fix/[ticket-id]-short-description
refactor/description
chore/description
```

### Commit Messages (Conventional Commits)

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(users): add user profile page
fix(auth): resolve token refresh race condition
refactor(api): simplify error handling
test(cart): add unit tests for checkout flow
```

### Pull Requests

- Keep PRs small and focused
- One feature/fix per PR
- Write meaningful descriptions
- Link related issues

## TypeScript Guidelines

### Strict Mode

Always use strict TypeScript configuration:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true
  }
}
```

### Type Definitions

```typescript
// Prefer interfaces for object shapes
interface User {
  id: string;
  name: string;
  email: string;
}

// Use type for unions, intersections, utility types
type Status = 'pending' | 'active' | 'inactive';
type UserWithRole = User & { role: Role };

// Avoid 'any' - use 'unknown' if type is truly unknown
function parse(input: unknown): Result {
  // ...
}
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Classes | PascalCase | `UserService` |
| Interfaces | PascalCase | `UserProfile` |
| Functions | camelCase | `getUserById` |
| Variables | camelCase | `currentUser` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Files | kebab-case | `user-profile.service.ts` |
| Folders | kebab-case | `user-management/` |

### Explicit Return Types

Always declare return types on public methods:

```typescript
// Good
function getUser(id: string): User | null {
  // ...
}

// Avoid
function getUser(id: string) {
  // ...
}
```

## Code Quality

### Avoid

- `any` type
- Magic numbers (use named constants)
- Deep nesting (max 3 levels)
- Long functions (max ~50 lines)
- Commented-out code

### Prefer

- Early returns
- Descriptive variable names
- Single responsibility principle
- Composition over inheritance
- Immutable data patterns

## Documentation

- Write self-documenting code first
- Add JSDoc only when intent isn't obvious
- Keep comments up-to-date or remove them
- Document "why", not "what"

```typescript
// Bad: describes what code does
// Increment counter by 1
counter++;

// Good: explains why
// Compensate for 0-based index in display
counter++;
```
