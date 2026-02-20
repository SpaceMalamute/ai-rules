---
description: "Advanced TypeScript types, guards, and inference"
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript Advanced Types

## Discriminated Unions

```typescript
// GOOD - discriminated union with literal type
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function handleResult<T>(result: Result<T>): T | null {
  if (result.success) {
    return result.data; // TypeScript knows data exists
  }
  console.error(result.error); // TypeScript knows error exists
  return null;
}

// API response pattern
type ApiResponse<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// Event pattern
type AppEvent =
  | { type: 'USER_LOGIN'; userId: string }
  | { type: 'USER_LOGOUT' }
  | { type: 'ITEM_ADDED'; itemId: string; quantity: number };

function handleEvent(event: AppEvent) {
  switch (event.type) {
    case 'USER_LOGIN':
      return login(event.userId);
    case 'USER_LOGOUT':
      return logout();
    case 'ITEM_ADDED':
      return addItem(event.itemId, event.quantity);
  }
}
```

## Type Guards

```typescript
// Type predicate (is)
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value
  );
}

// Assertion function (asserts)
function assertDefined<T>(value: T | null | undefined): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error('Value is not defined');
  }
}

const user = getUser('123');
assertDefined(user); // Throws if null
console.log(user.name); // user is User, not User | null
```

## Const Assertions

```typescript
// Without as const - types are widened
const config = { endpoint: '/api', methods: ['GET', 'POST'] };
// type: { endpoint: string; methods: string[] }

// With as const - literal types preserved
const config = { endpoint: '/api', methods: ['GET', 'POST'] } as const;
// type: { readonly endpoint: '/api'; readonly methods: readonly ['GET', 'POST'] }

// Useful for union types from arrays
const ROLES = ['admin', 'user', 'guest'] as const;
type Role = typeof ROLES[number]; // 'admin' | 'user' | 'guest'

// Object values as union
const STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;
type Status = typeof STATUS[keyof typeof STATUS];
// 'pending' | 'active' | 'inactive'
```

## Conditional Types & Infer

```typescript
// Extract types with infer
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type X = UnwrapPromise<Promise<string>>;  // string

// Extract array element type
type ArrayElement<T> = T extends (infer E)[] ? E : never;

// Function return type extraction
type GetReturn<T> = T extends (...args: any[]) => infer R ? R : never;

// Key remapping (filter properties by type)
type OnlyStrings<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};
```
