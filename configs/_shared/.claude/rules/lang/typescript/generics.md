---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript Generics & Advanced Types

## Generic Basics

```typescript
// Generic function
function identity<T>(value: T): T {
  return value;
}

// Generic with constraint
function getLength<T extends { length: number }>(item: T): number {
  return item.length;
}

// Multiple type parameters
function pair<K, V>(key: K, value: V): [K, V] {
  return [key, value];
}

// Generic interface
interface Repository<T> {
  find(id: string): Promise<T | null>;
  save(item: T): Promise<T>;
  delete(id: string): Promise<void>;
}

// Generic class
class Cache<T> {
  private items = new Map<string, T>();

  get(key: string): T | undefined {
    return this.items.get(key);
  }

  set(key: string, value: T): void {
    this.items.set(key, value);
  }
}
```

## Constraints

```typescript
// Extends constraint
function merge<T extends object, U extends object>(a: T, b: U): T & U {
  return { ...a, ...b };
}

// keyof constraint
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// Constructor constraint
function createInstance<T>(ctor: new () => T): T {
  return new ctor();
}

// Multiple constraints
function process<T extends Serializable & Validatable>(item: T): void {
  item.validate();
  item.serialize();
}
```

## Utility Types

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

// Partial - all properties optional
type UpdateUserDto = Partial<User>;
// { id?: string; name?: string; ... }

// Required - all properties required
type CompleteUser = Required<User>;

// Pick - select specific properties
type UserCredentials = Pick<User, 'email' | 'password'>;
// { email: string; password: string }

// Omit - exclude properties
type PublicUser = Omit<User, 'password'>;
// { id: string; name: string; email: string; createdAt: Date }

// Record - key-value mapping
type UserRoles = Record<string, 'admin' | 'user' | 'guest'>;
// { [key: string]: 'admin' | 'user' | 'guest' }

// Readonly - immutable
type ImmutableUser = Readonly<User>;

// Extract - extract union members
type StringOrNumber = string | number | boolean;
type OnlyStrings = Extract<StringOrNumber, string>; // string

// Exclude - remove union members
type NoStrings = Exclude<StringOrNumber, string>; // number | boolean

// NonNullable - remove null/undefined
type MaybeString = string | null | undefined;
type DefiniteString = NonNullable<MaybeString>; // string

// ReturnType - get function return type
function getUser() { return { id: '1', name: 'John' }; }
type UserReturn = ReturnType<typeof getUser>;
// { id: string; name: string }

// Parameters - get function parameters
type GetUserParams = Parameters<typeof getUser>; // []

// Awaited - unwrap Promise
type ResolvedUser = Awaited<Promise<User>>; // User
```

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

function renderResponse<T>(response: ApiResponse<T>) {
  switch (response.status) {
    case 'loading':
      return <Spinner />;
    case 'success':
      return <Data data={response.data} />;
    case 'error':
      return <Error error={response.error} />;
  }
}

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
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value
  );
}

// Usage
function process(value: unknown) {
  if (isString(value)) {
    console.log(value.toUpperCase()); // value is string
  }
  if (isUser(value)) {
    console.log(value.email); // value is User
  }
}

// Assertion function (asserts)
function assertDefined<T>(value: T | null | undefined): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error('Value is not defined');
  }
}

// Usage
function getUser(id: string): User | null {
  return db.find(id);
}

const user = getUser('123');
assertDefined(user); // Throws if null
console.log(user.name); // user is User, not User | null

// in operator narrowing
interface Cat { meow(): void }
interface Dog { bark(): void }

function speak(animal: Cat | Dog) {
  if ('meow' in animal) {
    animal.meow();
  } else {
    animal.bark();
  }
}
```

## Const Assertions

```typescript
// Without as const - types are widened
const config = {
  endpoint: '/api',
  methods: ['GET', 'POST'],
};
// type: { endpoint: string; methods: string[] }

// With as const - literal types preserved
const config = {
  endpoint: '/api',
  methods: ['GET', 'POST'],
} as const;
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

## Conditional Types

```typescript
// Basic conditional
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;  // true
type B = IsString<number>;  // false

// Infer keyword - extract types
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type X = UnwrapPromise<Promise<string>>;  // string
type Y = UnwrapPromise<number>;           // number

// Extract array element type
type ArrayElement<T> = T extends (infer E)[] ? E : never;

type El = ArrayElement<string[]>; // string

// Function return type extraction
type GetReturn<T> = T extends (...args: any[]) => infer R ? R : never;

// Distributive conditional types
type ToArray<T> = T extends any ? T[] : never;

type Distributed = ToArray<string | number>;
// string[] | number[] (not (string | number)[])
```

## Mapped Types

```typescript
// Make all properties optional
type Optional<T> = {
  [K in keyof T]?: T[K];
};

// Make all properties readonly
type Immutable<T> = {
  readonly [K in keyof T]: T[K];
};

// Transform property types
type Stringify<T> = {
  [K in keyof T]: string;
};

// Key remapping (4.1+)
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person {
  name: string;
  age: number;
}

type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number }

// Filter properties by type
type OnlyStrings<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};
```

## Template Literal Types

```typescript
// Basic template literal
type Greeting = `Hello, ${string}!`;

// Event names
type EventName = `on${Capitalize<'click' | 'focus' | 'blur'>}`;
// 'onClick' | 'onFocus' | 'onBlur'

// API routes
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Route = '/users' | '/posts';
type Endpoint = `${HttpMethod} ${Route}`;
// 'GET /users' | 'GET /posts' | 'POST /users' | ...

// CSS units
type CSSUnit = 'px' | 'em' | 'rem' | '%';
type CSSValue = `${number}${CSSUnit}`;

const width: CSSValue = '100px';  // OK
const height: CSSValue = '50%';   // OK
```
