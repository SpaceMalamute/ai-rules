---
description: "YAGNI, KISS, SoC, DRY design principles"
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.py"
  - "**/*.cs"
---

# Software Engineering Principles

## YAGNI — Don't Build for Hypothetical Futures

```typescript
// BAD - Premature abstraction
class AbstractDataProcessor<T, R, C extends Config> {
  // 200 lines of "flexible" code no one uses
}

// GOOD - Concrete implementation
function processUserData(users: User[]): ProcessedUser[] {
  return users.map(u => ({ ...u, fullName: `${u.first} ${u.last}` }));
}
```

## KISS — Simplest Solution That Works

```typescript
// BAD - Over-engineered
class StringUtils {
  private static instance: StringUtils;
  private constructor() {}
  static getInstance(): StringUtils {
    if (!this.instance) this.instance = new StringUtils();
    return this.instance;
  }
  capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// GOOD - Simple function
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

## SoC — Separate Validation, Business Logic, Data Access

```typescript
// BAD - Mixed concerns
async function handleUserRegistration(req: Request, res: Response) {
  if (!req.body.email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const user = await db.query(
    'INSERT INTO users (email, password) VALUES ($1, $2)',
    [req.body.email, hashedPassword]
  );
  return res.json({ id: user.id, email: user.email });
}

// GOOD - Separated concerns
// validation.ts
const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// user.service.ts
class UserService {
  async register(data: CreateUserDto): Promise<User> {
    const hashedPassword = await this.hashPassword(data.password);
    return this.userRepository.create({ ...data, password: hashedPassword });
  }
}

// user.controller.ts
async function register(req: Request, res: Response) {
  const data = userSchema.parse(req.body);
  const user = await userService.register(data);
  return res.json(toUserResponse(user));
}
```

## DRY — But Duplication > Wrong Abstraction

```typescript
// BAD - Premature DRY (wrong abstraction)
function processEntity(entity: User | Product | Order, action: string) {
  // 100 lines of if/else handling all cases
}

// GOOD - Some duplication is OK when contexts differ
function processUser(user: User) { /* user-specific logic */ }
function processProduct(product: Product) { /* product-specific logic */ }
function processOrder(order: Order) { /* order-specific logic */ }
```

## Summary

| Principle | Remember |
|-----------|----------|
| YAGNI | Build what you need now, not what you might need |
| KISS | Simple > Clever. If it's hard to explain, simplify it |
| SoC | Validation, business logic, data access = separate |
| DRY | Avoid duplication, but not at the cost of clarity |
