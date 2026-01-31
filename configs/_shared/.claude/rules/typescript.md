---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript Code Style Rules

## Strict Mode Required

```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true
}
```

## Type Guidelines

### Interfaces vs Types

```typescript
// Interface for object shapes
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// Type for unions/intersections
type Status = 'pending' | 'active' | 'inactive';
type Result<T> = { success: true; data: T } | { success: false; error: string };
```

### NEVER Use `any`

**`any` is forbidden.** It disables type checking and defeats the purpose of TypeScript.

| Instead of `any` | Use |
|------------------|-----|
| Unknown data | `unknown` + type guard |
| Object with unknown keys | `Record<string, unknown>` |
| Array of unknown | `unknown[]` |
| Function args | Generics `<T>` |
| JSON response | Define interface or use `unknown` |
| Third-party lib | `@types/*` or declare module |

```typescript
// BAD - NEVER do this
function process(data: any) { }
const response = await fetch(url) as any;
const items: any[] = [];

// GOOD - unknown + type guard
function process(data: unknown) {
  if (isValidData(data)) {
    // data is now typed
  }
}

// GOOD - explicit type
function process(data: UserInput) { }

// GOOD - generic
function transform<T>(data: T): T { }

// GOOD - Record for dynamic keys
const cache: Record<string, unknown> = {};
```

**Exception**: Only when interfacing with untyped legacy code, with explicit justification:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Legacy API v1, see TECH-123
const legacyResponse = await oldApi.fetch() as any;
```

### Explicit Return Types on Public Functions

```typescript
// BAD - inferred return type
export function getUser(id: string) {
  return db.users.findById(id);
}

// GOOD - explicit return type
export function getUser(id: string): Promise<User | null> {
  return db.users.findById(id);
}
```

## Naming Conventions

### Be Explicit - No Cryptic Names

```typescript
// BAD - cryptic names
const c = getConfig();
users.filter(u => u.a);
const d = new Date();
const tmp = calculate();

// GOOD - explicit names
const appConfig = getConfig();
users.filter(user => user.isActive);
const createdAt = new Date();
const totalAmount = calculate();
```

### Named Constants Over Magic Numbers

```typescript
// BAD - magic numbers
if (password.length < 8) { }
setTimeout(fn, 86400000);

// GOOD - named constants
const MIN_PASSWORD_LENGTH = 8;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

if (password.length < MIN_PASSWORD_LENGTH) { }
setTimeout(fn, ONE_DAY_MS);
```

## Lint Disable Rules

```typescript
// FORBIDDEN - no justification
// eslint-disable-next-line
const x = something;

// ALLOWED - with explicit reason + ticket
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Legacy API returns any, see TECH-456
const legacyData = await legacyApi.fetch();
```

## Function Guidelines

### Small Functions (< 30 lines)

```typescript
// BAD - too long, multiple responsibilities
async function processOrder(order: Order) {
  // 50+ lines of validation, calculation, saving, emailing...
}

// GOOD - single responsibility
async function processOrder(order: Order): Promise<OrderResult> {
  validateOrder(order);
  const total = calculateTotal(order);
  const savedOrder = await saveOrder(order, total);
  await sendConfirmation(savedOrder);
  return savedOrder;
}
```

### Max Nesting: 3 Levels - Use Early Returns

```typescript
// BAD - deep nesting
function process(user: User | null) {
  if (user) {
    if (user.isActive) {
      if (user.hasPermission) {
        // do something
      }
    }
  }
}

// GOOD - early returns
function process(user: User | null) {
  if (!user) return;
  if (!user.isActive) return;
  if (!user.hasPermission) return;

  // do something
}
```

## Error Handling

### Never Swallow Errors Silently

```typescript
// BAD - silent failure
try {
  await saveUser(user);
} catch (error) {
  // empty catch
}

// GOOD - log with context
try {
  await saveUser(user);
} catch (error) {
  logger.error('Failed to save user', { userId: user.id, error });
  throw error;
}
```

### User-Facing vs Internal Errors

```typescript
// User-facing: clear, actionable message
throw new BadRequestError('Email address is already registered');

// Internal: detailed logs, generic user message
logger.error('Database constraint violation', { error, userId });
throw new InternalError('Unable to complete registration');
```
